"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Client-side web push subscription. The service worker (public/sw.js) is
// registered in production only, so in dev this reports "no-sw".
//
// The VAPID public key is fetched from GET /api/push at runtime: build-time
// NEXT_PUBLIC_ inlining proved unreliable on Netlify (env var scoped to
// functions only left the shipped bundle keyless and every phone unable to
// subscribe). The env value is still used as a fast path when present.

export type PushSetupResult =
  | "granted"
  | "denied"
  | "ios-install" // iPhone browser tab: must install to Home Screen first
  | "no-key" // server has no VAPID key configured
  | "no-sw" // no service worker registration (dev, or first prod load)
  | "unsupported" // browser genuinely lacks the Push API
  | "error";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushPermission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

/** iPhone/iPad in a plain browser tab (not the installed PWA) cannot push. */
function iosNotInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

let cachedKey: string | null | undefined;
async function getVapidKey(): Promise<string | null> {
  const inlined = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (inlined) return inlined;
  if (cachedKey !== undefined) return cachedKey;
  try {
    const res = await fetch("/api/push", { signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as { publicKey?: string | null };
    cachedKey = data.publicKey ?? null;
  } catch {
    cachedKey = undefined; // transient: allow a retry next call
    return null;
  }
  return cachedKey;
}

async function subscribeAndStore(
  sb: SupabaseClient,
  userId: string,
  reg: ServiceWorkerRegistration,
  key: string
): Promise<PushSetupResult> {
  try {
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      }));
    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) return "error";
    const { error } = await sb.from("push_subscriptions").upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: "endpoint" }
    );
    return error ? "error" : "granted";
  } catch {
    return "error";
  }
}

/** Ask permission, subscribe this device, and store the subscription.
 * MUST be called directly from a tap handler: requestPermission runs first,
 * before any await, to keep the iOS user-activation alive. */
export async function enablePush(sb: SupabaseClient, userId: string): Promise<PushSetupResult> {
  if (!pushSupported()) return iosNotInstalled() ? "ios-install" : "unsupported";
  if (iosNotInstalled()) return "ios-install";

  // permission FIRST, synchronously within the user gesture
  let perm: NotificationPermission;
  try {
    perm = await Notification.requestPermission();
  } catch {
    return "error";
  }
  if (perm !== "granted") return "denied";

  const key = await getVapidKey();
  if (!key) return "no-key";
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return "no-sw";
  return subscribeAndStore(sb, userId, reg, key);
}

/** True when this device holds a live push subscription that is saved in the
 * database (the only state that actually delivers notifications). */
export async function hasActiveSubscription(sb: SupabaseClient): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return false;
    const { data, error } = await sb
      .from("push_subscriptions")
      .select("endpoint")
      .eq("endpoint", sub.endpoint)
      .limit(1);
    return !error && (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Self-healing refresh on app open: permission granted but no subscription
 * (or an unsaved one) completes the job silently, so a device that failed
 * halfway through enabling repairs itself. */
export async function refreshPushSubscription(sb: SupabaseClient, userId: string): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const key = await getVapidKey();
    if (!key) return;
    await subscribeAndStore(sb, userId, reg, key);
  } catch {
    /* best effort */
  }
}
