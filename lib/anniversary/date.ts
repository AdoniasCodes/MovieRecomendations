// The one place the anniversary date lives. Everything else asks this file.
//
// Two different jobs:
//   anniversaryPhase()  decides who is allowed to drive (on the day it is
//                       Panda only, after the day either of them can).
//   daysTogether()      feeds the "us in numbers" module.
//
// All comparisons are LOCAL time on purpose. The surprise should fire at
// midnight where the phones actually are, not at midnight UTC.

/** their start date, so the numbers module can count for itself */
export const TOGETHER_SINCE = { year: 2025, month: 7, day: 31 };

/** the day this whole thing is for */
export const ANNIVERSARY = { year: 2026, month: 7, day: 31 };

/** how many years it is, for the copy */
export const ANNIVERSARY_YEARS = ANNIVERSARY.year - TOGETHER_SINCE.year;

const startOfLocalDay = (y: number, m: number, d: number) => new Date(y, m - 1, d, 0, 0, 0, 0);

export type AnniversaryPhase = "before" | "day" | "after";

export function anniversaryPhase(now: Date = new Date()): AnniversaryPhase {
  const dayStart = startOfLocalDay(ANNIVERSARY.year, ANNIVERSARY.month, ANNIVERSARY.day);
  const nextDayStart = startOfLocalDay(ANNIVERSARY.year, ANNIVERSARY.month, ANNIVERSARY.day + 1);
  if (now < dayStart) return "before";
  if (now < nextDayStart) return "day";
  return "after";
}

export function isAnniversaryDay(now: Date = new Date()): boolean {
  return anniversaryPhase(now) === "day";
}

/** whole days since they started, counted in local days */
export function daysTogether(now: Date = new Date()): number {
  const start = startOfLocalDay(TOGETHER_SINCE.year, TOGETHER_SINCE.month, TOGETHER_SINCE.day);
  const today = startOfLocalDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

/** whole months since they started, for a second angle on the same number */
export function monthsTogether(now: Date = new Date()): number {
  let months = (now.getFullYear() - TOGETHER_SINCE.year) * 12 + (now.getMonth() + 1 - TOGETHER_SINCE.month);
  if (now.getDate() < TOGETHER_SINCE.day) months -= 1;
  return Math.max(0, months);
}
