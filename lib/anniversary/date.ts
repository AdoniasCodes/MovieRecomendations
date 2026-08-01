// The one place the anniversary date lives. Everything else asks this file.
//
// Two different jobs:
//   anniversaryPhase()  decides who is allowed to drive (during the celebration
//                       it is Panda only, afterwards either of them).
//   daysTogether()      feeds the "us in numbers" module.
//
// All comparisons are LOCAL time on purpose. The surprise should fire at
// midnight where the phones actually are, not at midnight UTC.
//
// WHY THERE ARE TWO DATES HERE (2026-08-01): the real one year mark was
// 2026-07-31, but the day did not happen then. They are celebrating it on
// 2026-08-01 instead, so the DAY THE EXPERIENCE RUNS and the MILESTONE IT IS
// ABOUT are no longer the same date. Gating uses the celebration window;
// the numbers stay pinned to the milestone so "365 days" still reads as
// one year rather than drifting a day per day.

/** their start date, so the numbers module can count for itself */
export const TOGETHER_SINCE = { year: 2025, month: 7, day: 31 };

/** the real one year mark, which is what the whole thing is ABOUT */
export const ANNIVERSARY = { year: 2026, month: 7, day: 31 };

/**
 * The days the experience is live and locked to Panda. A window rather than a
 * single date because it slipped by a day: keeping the 31st in it means a phone
 * that never reloaded is still covered, and the night can run past midnight
 * without the lock dropping mid-story.
 */
export const CELEBRATION_FROM = { year: 2026, month: 7, day: 31 };
/** first day it is over and belongs to both of them (exclusive) */
export const CELEBRATION_UNTIL = { year: 2026, month: 8, day: 2 };

/** how many years it is, for the copy */
export const ANNIVERSARY_YEARS = ANNIVERSARY.year - TOGETHER_SINCE.year;

const startOfLocalDay = (y: number, m: number, d: number) => new Date(y, m - 1, d, 0, 0, 0, 0);

const at = (d: { year: number; month: number; day: number }) => startOfLocalDay(d.year, d.month, d.day);

export type AnniversaryPhase = "before" | "day" | "after";

export function anniversaryPhase(now: Date = new Date()): AnniversaryPhase {
  if (now < at(CELEBRATION_FROM)) return "before";
  if (now < at(CELEBRATION_UNTIL)) return "day";
  return "after";
}

export function isAnniversaryDay(now: Date = new Date()): boolean {
  return anniversaryPhase(now) === "day";
}

/**
 * Whole days since they started, counted in local days.
 *
 * Pinned to the milestone, not to the clock: this module is a snapshot of year
 * one, so it should say 365 whether she opens it tonight or next month.
 */
export function daysTogether(asOf: Date = at(ANNIVERSARY)): number {
  const start = at(TOGETHER_SINCE);
  const today = startOfLocalDay(asOf.getFullYear(), asOf.getMonth() + 1, asOf.getDate());
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

/** whole months since they started, for a second angle on the same number */
export function monthsTogether(asOf: Date = at(ANNIVERSARY)): number {
  let months = (asOf.getFullYear() - TOGETHER_SINCE.year) * 12 + (asOf.getMonth() + 1 - TOGETHER_SINCE.month);
  if (asOf.getDate() < TOGETHER_SINCE.day) months -= 1;
  return Math.max(0, months);
}
