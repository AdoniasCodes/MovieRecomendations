"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// Client-side web push subscription. The service worker (public/sw.js) is
// registered in production only, so in dev this reports "unsupported".

export type PushSetupResult = "granted" | "denied" | "unsupported" | "error";

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

/** Ask permission, subscribe this device, and store the subscription. */
export async function enablePush(sb: SupabaseClient, userId: string): Promise<PushSetupResult> {
  if (!pushSupported()) return "unsupported";
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return "unsupported";

  // sw.js is prod-only; .ready would hang forever in dev, so check first
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return "unsupported";

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";

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

/** Silent refresh on app open: keep the stored subscription current. */
export async function refreshPushSubscription(sb: SupabaseClient, userId: string): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const json = sub.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth) return;
    await sb.from("push_subscriptions").upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: "endpoint" }
    );
  } catch {
    /* best effort */
  }
}
