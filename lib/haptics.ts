"use client";

// Haptic engine for After Dark "Pulse". Turns a mode + intensity into real
// motor output on whatever device is holding it, and is honest about what the
// device can actually do.
//
// Two very different platforms:
//
// "full"  Android Chrome. navigator.vibrate() takes a pattern of on/off ms.
//         There is NO amplitude control anywhere in the web platform, so
//         "intensity" here means duty cycle (how much of each cycle the motor
//         is on), not strength. A single vibrate() call replaces whatever is
//         currently running, so a continuous buzz is made by re-issuing a
//         window-sized pattern slightly before the previous one runs out.
//
// "taps"  iOS Safari 17.4+. navigator.vibrate does not exist and never has.
//         The only way to reach the Taptic Engine from a web page is the
//         `<input type="checkbox" switch>` trick: clicking its <label> fires a
//         real haptic tap. Taps only. There is no API to hold the motor on, so
//         a "constant" mode becomes a fast flutter of taps. That is the ceiling
//         on iPhone and the UI says so rather than pretending otherwise.
//
// Both paths need one prior user gesture on the page (sticky activation) and
// both are blocked by the browser while the page is hidden, which is why the
// engine stops itself on visibilitychange.

export type PulseMode = "constant" | "pulse" | "wave" | "heartbeat" | "tease";
export type HapticsCapability = "full" | "taps" | "none";

export const PULSE_MODES: { key: PulseMode; label: string; hint: string }[] = [
  { key: "constant", label: "Constant", hint: "One long steady buzz" },
  { key: "pulse", label: "Pulse", hint: "Even on, off, on, off" },
  { key: "wave", label: "Wave", hint: "Rises, peaks, falls back" },
  { key: "heartbeat", label: "Heartbeat", hint: "Two beats, then a rest" },
  { key: "tease", label: "Tease", hint: "Never the same twice" },
];

export const MIN_INTENSITY = 1;
export const MAX_INTENSITY = 5;

/** hard backstop: nothing runs longer than this without a fresh instruction */
const MAX_RUN_MS = 20 * 60_000;
/** how far ahead we schedule motor work on the Android path */
const WINDOW_MS = 4_000;
/** driver granularity for the iOS tap timeline */
const DRIVER_MS = 20;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ------------------------------------------------------------ capability */

let cachedCapability: HapticsCapability | null = null;

export function hapticsCapability(): HapticsCapability {
  if (cachedCapability) return cachedCapability;
  if (typeof window === "undefined" || typeof navigator === "undefined") return "none";
  if (typeof navigator.vibrate === "function") {
    cachedCapability = "full";
  } else if (typeof document !== "undefined" && "switch" in document.createElement("input")) {
    // Safari 17.4+ reflects the `switch` IDL attribute on input elements
    cachedCapability = "taps";
  } else {
    cachedCapability = "none";
  }
  return cachedCapability;
}

/** short, honest sentence about this device, for UI copy */
export function capabilityNote(cap: HapticsCapability = hapticsCapability()): string {
  if (cap === "full") return "This phone can run every pattern, including a steady buzz.";
  if (cap === "taps")
    return "iPhone can only tap, never hold. Patterns come through as taps and flutters. Swap roles if you want the stronger side.";
  return "This device has no vibration the browser can reach. Use it as the controller instead.";
}

/* ------------------------------------------------ iOS taptic switch trick */

let tapLabel: HTMLLabelElement | null = null;

function ensureTapLabel(): HTMLLabelElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (tapLabel && tapLabel.isConnected) return tapLabel;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", ""); // the attribute that makes iOS fire haptics
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  tapLabel = label;
  return label;
}

/** one haptic tap on iOS, no-op elsewhere. Safe to call from any handler. */
export function tapOnce(): void {
  try {
    ensureTapLabel()?.click();
  } catch {
    /* haptics are never worth throwing over */
  }
}

/* ------------------------------------------------------------- patterns */

/**
 * One repeating cycle as alternating on/off milliseconds, the shape
 * navigator.vibrate wants. Intensity moves duty cycle and tempo because the
 * web platform gives us no way to move actual motor strength.
 */
function cycleFor(mode: PulseMode, intensity: number, rand: () => number): number[] {
  const i = clamp(Math.round(intensity), MIN_INTENSITY, MAX_INTENSITY);
  switch (mode) {
    case "constant": {
      const on = 120 + i * 80; // 200 to 520
      const off = Math.max(10, 60 - i * 10); // 50 down to 10
      return [on, off];
    }
    case "pulse": {
      const on = 60 + i * 40; // 100 to 260
      const off = 320 - i * 50; // 270 down to 70
      return [on, off];
    }
    case "wave": {
      const shape = [0.3, 0.55, 0.8, 1, 0.8, 0.55, 0.3];
      const peak = 90 + i * 50;
      const gap = Math.max(20, 90 - i * 12);
      return shape.flatMap((s) => [Math.round(peak * s), gap]);
    }
    case "heartbeat": {
      const first = 50 + i * 20;
      const second = 40 + i * 15;
      return [first, 90, second, Math.max(220, 620 - i * 60)];
    }
    case "tease": {
      // deliberately unpredictable: a fresh little phrase every window
      const beats = 2 + Math.floor(rand() * 4);
      const out: number[] = [];
      for (let b = 0; b < beats; b++) {
        out.push(Math.round(50 + rand() * (60 + i * 60)));
        out.push(Math.round(60 + rand() * (400 - i * 50)));
      }
      return out;
    }
  }
}

/**
 * Repeat a cycle until it covers at least targetMs.
 *
 * navigator.vibrate reads the array as on, off, on, off... so an ODD length
 * cycle flips phase on every repetition and a "solid" buzz silently becomes a
 * 50 percent stutter. Odd cycles are padded with a zero-length pause to keep
 * every repetition in phase.
 */
function fill(cycle: number[], targetMs: number): number[] {
  const even = cycle.length % 2 === 0 ? cycle : [...cycle, 0];
  const total = even.reduce((a, b) => a + b, 0);
  if (total <= 0) return even;
  const reps = Math.max(1, Math.ceil(targetMs / total));
  const out: number[] = [];
  for (let r = 0; r < reps; r++) out.push(...even);
  return out;
}

/**
 * The pattern actually handed to the motor for one scheduling window.
 *
 * Level 5 "constant" is special: instead of repeating a short cycle it asks for
 * ONE uninterrupted vibration spanning the whole window, re-issued just before
 * it expires. That is the only way to get a genuinely unbroken buzz out of the
 * web platform, since there is no amplitude control and no "hold" call.
 */
function patternFor(mode: PulseMode, intensity: number, rand: () => number, windowMs: number): number[] {
  const i = clamp(Math.round(intensity), MIN_INTENSITY, MAX_INTENSITY);
  if (mode === "constant" && i >= MAX_INTENSITY) return [windowMs];
  return fill(cycleFor(mode, i, rand), windowMs);
}

/** is the motor supposed to be on at `offset` ms into this cycle? */
function isOnAt(cycle: number[], offset: number): boolean {
  let acc = 0;
  for (let idx = 0; idx < cycle.length; idx++) {
    acc += cycle[idx];
    if (offset < acc) return idx % 2 === 0; // even slots are "on"
  }
  return false;
}

/* --------------------------------------------------------------- engine */

export type StopReason = "manual" | "hidden" | "timeout" | "unsupported";

export interface PulseEngine {
  readonly capability: HapticsCapability;
  /** begin (or seamlessly change to) a mode/intensity */
  start(mode: PulseMode, intensity: number): void;
  /** silence the motor now */
  stop(reason?: StopReason): void;
  running(): boolean;
  current(): { mode: PulseMode; intensity: number } | null;
  /** remove listeners and DOM helpers */
  destroy(): void;
}

export function createPulseEngine(opts?: {
  /** fired whenever the engine stops itself, so the UI can reflect reality */
  onAutoStop?: (reason: StopReason) => void;
}): PulseEngine {
  const capability = hapticsCapability();
  let cur: { mode: PulseMode; intensity: number } | null = null;
  let windowTimer: ReturnType<typeof setInterval> | null = null;
  let driver: ReturnType<typeof setInterval> | null = null;
  let capTimer: ReturnType<typeof setTimeout> | null = null;
  // iOS driver bookkeeping
  let cycle: number[] = [];
  let cycleTotal = 0;
  let cycleStart = 0;
  let lastTap = 0;

  const rand = () => Math.random();

  const clearTimers = () => {
    if (windowTimer) clearInterval(windowTimer);
    if (driver) clearInterval(driver);
    if (capTimer) clearTimeout(capTimer);
    windowTimer = driver = null;
    capTimer = null;
  };

  const silence = () => {
    if (capability === "full") {
      try {
        navigator.vibrate(0);
      } catch {
        /* ignore */
      }
    }
  };

  const stop = (reason: StopReason = "manual") => {
    const wasRunning = cur !== null;
    clearTimers();
    cur = null;
    silence();
    if (wasRunning && reason !== "manual") opts?.onAutoStop?.(reason);
  };

  // Android: re-issue a window-sized pattern just before the last one ends, so
  // consecutive windows butt up against each other and read as continuous.
  const issueWindow = () => {
    if (!cur) return;
    try {
      navigator.vibrate(patternFor(cur.mode, cur.intensity, rand, WINDOW_MS));
    } catch {
      stop("unsupported");
    }
  };

  // iOS: walk a cycle timeline and fire a tap whenever we are inside an "on"
  // segment and enough time has passed since the last one. A tight tap gap is
  // the closest an iPhone gets to a buzz.
  const runDriver = () => {
    if (!cur) return;
    const tapGap = 110 - clamp(cur.intensity, MIN_INTENSITY, MAX_INTENSITY) * 16; // 94 down to 30
    const now = performance.now();
    const offset = (now - cycleStart) % cycleTotal;
    if (offset < DRIVER_MS && cur.mode === "tease") {
      // fresh phrase each time the tease cycle comes around
      cycle = cycleFor(cur.mode, cur.intensity, rand);
      cycleTotal = cycle.reduce((a, b) => a + b, 0) || 1;
      cycleStart = now;
    }
    if (isOnAt(cycle, offset) && now - lastTap >= tapGap) {
      lastTap = now;
      tapOnce();
    }
  };

  const start = (mode: PulseMode, intensity: number) => {
    if (capability === "none") {
      opts?.onAutoStop?.("unsupported");
      return;
    }
    clearTimers();
    cur = { mode, intensity: clamp(Math.round(intensity), MIN_INTENSITY, MAX_INTENSITY) };

    if (capability === "full") {
      issueWindow();
      windowTimer = setInterval(issueWindow, WINDOW_MS - 250);
    } else {
      ensureTapLabel();
      cycle = cycleFor(cur.mode, cur.intensity, rand);
      cycleTotal = cycle.reduce((a, b) => a + b, 0) || 1;
      cycleStart = performance.now();
      lastTap = 0;
      runDriver();
      driver = setInterval(runDriver, DRIVER_MS);
    }

    capTimer = setTimeout(() => stop("timeout"), MAX_RUN_MS);
  };

  // Browsers refuse to vibrate a hidden page anyway. Stopping explicitly keeps
  // our own state honest and guarantees nothing resumes behind a lock screen.
  const onVisibility = () => {
    if (document.visibilityState === "hidden" && cur) stop("hidden");
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  return {
    capability,
    start,
    stop,
    running: () => cur !== null,
    current: () => (cur ? { ...cur } : null),
    destroy() {
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (tapLabel?.isConnected) tapLabel.remove();
      tapLabel = null;
    },
  };
}
