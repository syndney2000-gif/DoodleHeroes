import { describe, expect, it } from 'vitest';
import { worldFrom, type Snapshot } from '../src/lib/world';
import { pipSays } from '../src/lib/pip';
import { allPuzzles as grids } from '../src/games/net/puzzles';
import { allPuzzles as maps } from '../src/games/bridges/puzzles';

const empty: Snapshot = { results: {}, mergeRestored: 0, merges: 0, siegeRuns: 0, siegeWins: 0, guessSolved: 0 };
const done = { stars: 3, seconds: 60, date: '2026-11-01' };

describe('the island', () => {
  it('starts bare', () => {
    const w = worldFrom(empty);
    expect(w).toMatchObject({ bridges: 0, litCottages: 0, lamp: false, beam: false, boats: 0, flag: false, overall: 0 });
  });

  it('grows with each game', () => {
    const results: Snapshot['results'] = {};
    for (const p of grids.slice(0, 5)) results[`lighthouse-wiring/${p.id}`] = done;
    for (const p of maps.slice(0, 8)) results[`isle-spans/${p.id}`] = done;
    const w = worldFrom({ ...empty, results, mergeRestored: 9, merges: 40, siegeRuns: 2, siegeWins: 1, guessSolved: 5 });
    expect(w).toMatchObject({ lamp: true, beam: true, litCottages: 1, bridges: 2, boats: 2, smoke: true, flag: true, tent: true, frames: 3 });
    expect(w.overall).toBeGreaterThan(0);
    expect(w.overall).toBeLessThan(1);
  });

  it('caps every landmark', () => {
    const w = worldFrom({ ...empty, mergeRestored: 99, guessSolved: 99, siegeWins: 99 });
    expect(w.boats).toBe(3);
    expect(w.frames).toBe(3);
  });
});

describe('Pip', () => {
  const base = { hour: 10, world: worldFrom(empty), streak: 0, dailyDoneToday: false, day: 0 };

  it('introduces itself to a new player', () => {
    expect(pipSays(base).cta?.href).toBe('/island-sketch/play?p=sun');
  });

  it('protects a streak before anything else', () => {
    const line = pipSays({ ...base, streak: 3, last: { name: 'Isle Spans', href: '/isle-spans/play' } });
    expect(line.text).toContain('3-day streak');
    expect(line.cta?.href).toContain('daily');
  });

  it('offers to continue the last game', () => {
    const line = pipSays({ ...base, last: { name: 'Isle Spans', href: '/isle-spans/play?p=x' } });
    expect(line.cta).toEqual({ label: 'Continue Isle Spans', href: '/isle-spans/play?p=x' });
  });

  it('is sleepy late at night', () => {
    expect(pipSays({ ...base, hour: 23, last: { name: 'A', href: '/a' } }).mood).toBe('sleepy');
  });
});
