"use client";

// DISPLAY identity store. Who is holding the phone right now — Panda or Hermi.
// Semantic ids stay "me"/"her" everywhere (see mock-data ME/PARTNER anchors);
// this only decides whose NAME/EMOJI/COLOR renders as "me" vs "partner".
// Same tiny external-store pattern as lib/title-sheet.ts.

import { useSyncExternalStore } from "react";
import { PIN_IDENTITIES, type PinIdentity } from "./pin-accounts";
import type { User } from "./types";

export type WhoKey = "panda" | "hermi"; // aligns with PIN_IDENTITIES keys

const STORAGE_KEY = "amore-movies/whoami";
const DEFAULT: WhoKey = "panda";

let who: WhoKey = DEFAULT;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** client-only initial load from localStorage; SSR keeps the default so
 * server/client first render match (a one-frame flash for Hermi is fine). */
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "panda" || raw === "hermi") who = raw;
  } catch {
    /* ignore unavailable storage */
  }
}

export function setWhoami(k: WhoKey) {
  hydrated = true; // an explicit pick wins over any later hydrate
  who = k;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, k);
    } catch {
      /* storage full/unavailable — still works in-memory */
    }
  }
  emit();
}

export function getWhoami(): WhoKey {
  hydrate();
  return who;
}

export function useWhoami(): WhoKey {
  return useSyncExternalStore(
    (cb) => {
      hydrate();
      listeners.add(cb);
      emit(); // pick up a hydrated value on first subscribe
      return () => listeners.delete(cb);
    },
    () => who,
    () => DEFAULT
  );
}

/**
 * The AUTHORITATIVE identity: derived from the signed-in Supabase account
 * rather than the local display toggle. Returns null while the session is still
 * unknown.
 *
 * Use this instead of getWhoami/useWhoami for anything that must not be wrong,
 * for example gating a surprise. The display toggle lives in localStorage, is
 * "panda" by default on a cold page load, and only catches up in an effect, so
 * a gate built on it fails OPEN for one render. The session email cannot be
 * wrong and is what WelcomeGate itself follows.
 */
export function identityFromEmail(email: string | null | undefined): WhoKey | null {
  if (!email) return null;
  return PIN_IDENTITIES.find((p) => p.email === email)?.key ?? null;
}

const byKey = (k: WhoKey): PinIdentity =>
  PIN_IDENTITIES.find((p) => p.key === k) ?? PIN_IDENTITIES[0];

function toUser(id: "me" | "her", ident: PinIdentity): User {
  return { id, name: ident.name, emoji: ident.emoji, color: ident.color };
}

/** the current user's display identity — keeps the semantic id "me". */
export function meUser(): User {
  return toUser("me", byKey(getWhoami()));
}

/** the partner's display identity — keeps the semantic id "her". */
export function partnerUser(): User {
  const other: WhoKey = getWhoami() === "panda" ? "hermi" : "panda";
  return toUser("her", byKey(other));
}
