"use client";

// A one-line pub/sub so the background song gets out of the way of his voice.
//
// The ambient track is a real song with vocals, and the voice notes are the
// whole point of the night. Two voices at once is the worst possible outcome,
// so the voice player announces itself here and the stage pauses the music
// while it plays, then brings it back.
//
// Deliberately a module-level bus rather than context: the <audio> lives in
// AnniversaryStage and the player lives deep inside ModuleView, and threading a
// callback through every module renderer to solve this would be far worse.

type Listener = (voicePlaying: boolean) => void;

const listeners = new Set<Listener>();
let playing = false;

/** called by the voice note player when it starts or stops */
export function setVoicePlaying(next: boolean): void {
  if (playing === next) return;
  playing = next;
  listeners.forEach((l) => l(next));
}

export function isVoicePlaying(): boolean {
  return playing;
}

export function onVoicePlaying(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
