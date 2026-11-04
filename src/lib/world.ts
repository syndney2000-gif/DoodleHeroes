/* The island on the home page: what has been built, worked out from saved
   progress in every game (like stickers, nothing extra is stored). */

import { keys, load, results, type Result } from './storage';
import { allPuzzles as sketches } from '../games/nonogram/puzzles';
import { allPuzzles as maps } from '../games/bridges/puzzles';
import { allPuzzles as grids } from '../games/net/puzzles';
import { expedition } from '../content/expedition';
import { dailyDrawing, isRight } from '../games/doodle-guess/game';
import type { MergeState } from '../games/merge/engine';
import { loadProfile } from '../games/survivor/meta';

/** Everything the island depends on, gathered from the saves. */
export interface Snapshot {
  results: Record<string, Result>;
  /** Margin Merge projects finished (0–12) and merges made. */
  mergeRestored: number;
  merges: number;
  siegeRuns: number;
  siegeWins: number;
  /** Doodle Guess days solved. */
  guessSolved: number;
}

export interface World {
  sketches: number;
  spans: number;
  wiring: number;
  chapters: number;
  /** How many of each landmark to show. */
  bridges: number;      // 0–3, one per 4 Isle Spans maps
  litCottages: number;  // 0–3, one per 4 Lighthouse Wiring grids
  lamp: boolean;        // any wiring grid solved
  beam: boolean;        // 4+ grids, or the expedition finished
  easel: boolean;       // any sketch
  bunting: boolean;     // 6+ sketches
  frames: number;       // 0–3 Doodle Guess pictures on the gallery wall
  boats: number;        // 0–3, one per Margin Merge story
  smoke: boolean;       // the workshop has been used
  flag: boolean;        // a Scribble Siege survived
  tent: boolean;        // any Siege run
  lanterns: number;     // 0–4 expedition chapters, lanterns along the path
  /** 0–1: how much of everything is done, for Pip's encouragement. */
  overall: number;
}

const solved = (r: Record<string, Result>, game: string, ids: { id: string }[]) =>
  ids.filter((p) => r[`${game}/${p.id}`]).length;

export function worldFrom(s: Snapshot): World {
  const r = s.results;
  const sk = solved(r, 'island-sketch', sketches);
  const sp = solved(r, 'isle-spans', maps);
  const wi = solved(r, 'lighthouse-wiring', grids);
  const chapters = expedition.filter((c) => c.tasks.every((t) => r[`${t.game}/${t.puzzleId}`])).length;
  const parts = [
    sk / sketches.length, sp / maps.length, wi / grids.length,
    Math.min(1, s.mergeRestored / 12), Math.min(1, s.siegeWins / 3), Math.min(1, s.guessSolved / 7),
  ];
  return {
    sketches: sk, spans: sp, wiring: wi, chapters,
    bridges: Math.min(3, Math.floor(sp / 4)),
    litCottages: Math.min(3, Math.floor(wi / 4)),
    lamp: wi > 0,
    beam: wi >= 4 || chapters === expedition.length,
    easel: sk > 0,
    bunting: sk >= 6,
    frames: Math.min(3, s.guessSolved),
    boats: Math.min(3, Math.floor(s.mergeRestored / 4)),
    smoke: s.merges > 0,
    flag: s.siegeWins > 0,
    tent: s.siegeRuns > 0,
    lanterns: chapters,
    overall: parts.reduce((a, b) => a + b, 0) / parts.length,
  };
}

/** Days of Doodle Guess solved, from the per-day guess lists. */
export function guessDaysSolved(): number {
  return keys().filter((k) => k.startsWith('doodle-guess:day:')).filter((k) => {
    const guesses = load<string[]>(k);
    const drawing = dailyDrawing(k.slice('doodle-guess:day:'.length));
    return Array.isArray(guesses) && guesses.some((g) => isRight(drawing, g));
  }).length;
}

export function readSnapshot(): Snapshot {
  const merge = load<MergeState>('margin-merge:state');
  const siege = loadProfile();
  return {
    results: results(),
    mergeRestored: Math.max(0, Math.min(12, Number(merge?.studio?.restored) || 0)),
    merges: Number(merge?.merges) || 0,
    siegeRuns: Number(siege.runs) || 0,
    siegeWins: Number(siege.wins) || 0,
    guessSolved: guessDaysSolved(),
  };
}
