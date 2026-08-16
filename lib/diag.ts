"use client";

// On-device diagnostics (2026-08-16).
//
// Panda's phone was the only place the sync failure ever happened, and a phone
// has no console you can read. So the app now keeps its own flight recorder: a
// small ring buffer of timestamped events, mirrored to localStorage so it
// survives a force-quit, readable from Profile > Connection, and uploadable to
// the `client_logs` table so it can be read from the database afterwards.
//
// Two rules this file must keep:
//
//  1. NEVER log a token, a PIN, or a message body. Kinds and short details only.
//     The whole point is that this can be uploaded without thinking about it.
//  2. The upload uses PLAIN fetch against the REST endpoint, deliberately NOT
//     the supabase-js client. The exact situation we most need a log from is
//     the one where the client is wedged, and a logger that depends on the
//     thing it is diagnosing is useless.

import { projectRef, supabaseConfigured } from "./supabase";

export interface DiagEntry {
  /** epoch ms */
  t: number;
  /** short dotted kind, e.g. "net.timeout", "sync.repair" */
  k: string;
  /** short human detail, no secrets */
  d?: string;
}

const KEY = "amore-movies/diag";
const MAX = 300;
/** the upload must not hang either; this is a diagnostic, not a critical path */
const UPLOAD_TIMEOUT_MS = 10_000;

let buffer: DiagEntry[] = [];
let loaded = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId: string | null = null;

/** stable id for this app-open, so one upload can be told from another */
function session(): string {
  if (!sessionId) {
    sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return sessionId;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) buffer = parsed.slice(-MAX);
    }
  } catch {
    /* a corrupt log is not worth a crash */
  }
}

function flushSoon() {
  if (typeof window === "undefined" || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(buffer));
    } catch {
      // out of quota: drop the oldest half rather than lose logging entirely
      buffer = buffer.slice(-Math.floor(MAX / 2));
      try {
        localStorage.setItem(KEY, JSON.stringify(buffer));
      } catch {
        /* give up quietly */
      }
    }
  }, 1_000);
}

/** what phone/browser/mode this is, for the log header */
export function deviceSummary(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number };
    standalone?: boolean;
  };
  return {
    ua: navigator.userAgent,
    lang: navigator.language,
    online: navigator.onLine,
    // installed PWA vs a browser tab: they behave very differently on iOS
    pwa:
      nav.standalone === true ||
      (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches),
    net: nav.connection?.effectiveType,
    rtt: nav.connection?.rtt,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sw: typeof navigator.serviceWorker !== "undefined",
    session: session(),
  };
}

export const diag = {
  /** record an event. Cheap, synchronous, never throws. */
  log(kind: string, detail?: string) {
    if (typeof window === "undefined") return;
    load();
    buffer.push({ t: Date.now(), k: kind, d: detail ? detail.slice(0, 200) : undefined });
    if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
    flushSoon();
  },

  /** everything recorded, oldest first */
  entries(): DiagEntry[] {
    load();
    return [...buffer];
  },

  /** entries since a given time */
  since(ms: number): DiagEntry[] {
    load();
    const cut = Date.now() - ms;
    return buffer.filter((e) => e.t >= cut);
  },

  clear() {
    buffer = [];
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* nothing to do */
      }
    }
  },

  /** the whole thing as pasteable text, for "copy and send it to me" */
  asText(): string {
    load();
    const head = JSON.stringify(deviceSummary(), null, 1);
    const lines = buffer.map((e) => {
      const time = new Date(e.t).toISOString().slice(11, 23);
      return `${time} ${e.k}${e.d ? ` ${e.d}` : ""}`;
    });
    return `Amore Movies diagnostics\n${head}\n\n${lines.join("\n")}`;
  },

  /**
   * Push the log to the `client_logs` table so it can be read from the
   * database. Plain fetch + the anon key on purpose (see the file header).
   * Returns true when the rows landed. Never throws.
   */
  async upload(reason: string, who?: string): Promise<boolean> {
    if (typeof window === "undefined" || !supabaseConfigured()) return false;
    load();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const res = await fetch(`${url}/rest/v1/client_logs`, {
        method: "POST",
        signal: ctl.signal,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          session_id: session(),
          who: who ?? null,
          reason,
          device: deviceSummary(),
          entries: buffer.slice(-MAX),
        }),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  },
};

/** the project this log belongs to, handy when reading uploads */
export const diagProject = projectRef;
