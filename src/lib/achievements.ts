/* Stickers and the daily streak, both worked out from saved results, so
   there's nothing extra to store or keep in sync. */

import type { Result } from './storage';
import { allPuzzles as sketches } from '../games/nonogram/puzzles';
import { allPuzzles as maps } from '../games/bridges/puzzles';
import { allPuzzles as grids } from '../games/net/puzzles';
import { expedition } from '../content/expedition';

type Results = Record<string, Result>;

export interface Sticker {
  id: string;
  icon: string;
  name: string;
  how: string;
  earned(r: Results, streak: number): boolean;
}

const solvedIn = (r: Results, game: string) => Object.keys(r).filter((k) => k.startsWith(`${game}/`));
const allOf = (r: Results, game: string, ids: { id: string }[]) => ids.every((p) => r[`${game}/${p.id}`]);
const chapterDone = (r: Results, k: number) => expedition[k].tasks.every((t) => r[`${t.game}/${t.puzzleId}`]);

export const stickers: Sticker[] = [
  { id: 'first-sketch', icon: '✏️', name: 'First Sketch', how: 'Solve any Island Sketch puzzle.', earned: (r) => solvedIn(r, 'island-sketch').length > 0 },
  { id: 'first-bridge', icon: '🌉', name: 'Bridge Builder', how: 'Solve any Isle Spans map.', earned: (r) => solvedIn(r, 'isle-spans').length > 0 },
  { id: 'first-light', icon: '💡', name: 'Lights On', how: 'Solve any Lighthouse Wiring grid.', earned: (r) => solvedIn(r, 'lighthouse-wiring').length > 0 },
  { id: 'clean-sheet', icon: '⭐', name: 'Clean Sheet', how: 'Solve any puzzle without a hint.', earned: (r) => Object.values(r).some((x) => x.stars === 3) },
  { id: 'daily-3', icon: '📅', name: 'Daily Habit', how: 'Solve a daily puzzle three days in a row.', earned: (_, s) => s >= 3 },
  { id: 'daily-7', icon: '🗓️', name: 'Week Strong', how: 'Solve a daily puzzle seven days in a row.', earned: (_, s) => s >= 7 },
  { id: 'landfall', icon: '⛵', name: 'Landfall', how: 'Finish chapter 1 of the Lantern Isles expedition.', earned: (r) => chapterDone(r, 0) },
  { id: 'sketchbook', icon: '📒', name: 'Full Sketchbook', how: 'Solve all 12 Island Sketch puzzles.', earned: (r) => allOf(r, 'island-sketch', sketches) },
  { id: 'master-builder', icon: '🏗️', name: 'Master Builder', how: 'Solve all 12 Isle Spans maps.', earned: (r) => allOf(r, 'isle-spans', maps) },
  { id: 'electrician', icon: '🔌', name: 'Island Electrician', how: 'Solve all 12 Lighthouse Wiring grids.', earned: (r) => allOf(r, 'lighthouse-wiring', grids) },
  { id: 'keeper', icon: '🗼', name: 'Lighthouse Keeper', how: 'Finish the whole Lantern Isles expedition.', earned: (r) => expedition.every((_, k) => chapterDone(r, k)) },
];

/** Dates (YYYY-MM-DD) on which any daily puzzle was solved. */
export function dailyDates(r: Results): Set<string> {
  const dates = new Set<string>();
  for (const key of Object.keys(r)) {
    const m = key.match(/\/daily-(\d{4}-\d{2}-\d{2})$/);
    if (m) dates.add(m[1]);
  }
  return dates;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Consecutive days with a daily solved, ending today — or yesterday, so a
    streak isn't shown as broken before today's puzzle is done. */
export function streak(r: Results, today = new Date()): number {
  const dates = dailyDates(r);
  const d = new Date(today);
  if (!dates.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dates.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** The last seven days, oldest first, with whether a daily was solved. */
export function lastWeek(r: Results, today = new Date()): { key: string; label: string; done: boolean }[] {
  const dates = dailyDates(r);
  return Array.from({ length: 7 }, (_, k) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - k));
    return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }), done: dates.has(dayKey(d)) };
  });
}

export function earnedIds(r: Results, today = new Date()): Set<string> {
  const s = streak(r, today);
  return new Set(stickers.filter((x) => x.earned(r, s)).map((x) => x.id));
}
