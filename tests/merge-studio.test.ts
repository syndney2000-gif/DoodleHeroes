import { describe, expect, test } from 'vitest';
import { draw, erase, inkMax, move, newState, refillInk, type MergeState } from '../src/games/merge/engine';
import { chainIds, TOP_TIER } from '../src/games/merge/data';
import { continueFreePlay, continueStory, restoreStudio, studioChapters, studioProgress, studioStatus, supplyStudio } from '../src/games/merge/studio';

const T = 1_000_000;
function prepareChapter(s: MergeState) {
  const { chapter } = studioStatus(s);
  s.cells.fill(null);
  let cell = 0;
  for (const goal of chapter.goals) {
    if (goal.kind === 'discover') s.discovered.push(`${goal.item.chain}:${goal.item.tier}`);
    else for (let n = 0; n < (goal.quantity ?? 1); n++) s.cells[cell++] = { ...goal.item };
  }
  for (const goal of chapter.goals) if (goal.kind === 'supply') for (let n = 0; n < (goal.quantity ?? 1); n++) expect(supplyStudio(s, goal.id)).toBe(true);
  return chapter;
}

describe('studio restoration', () => {
  test('completed studio saves keep their ending, rewards and free play until opting into the harbour', () => {
    const s = newState(7, T);
    s.coins = 600; s.studio = { version: 1, restored: 4, supplied: [], finishedAt: T - 1, freePlay: true };
    s.cells[0] = { chain: 'paper', tier: 7 };
    const board = JSON.stringify(s.cells);
    expect(studioStatus(s)).toMatchObject({ actComplete: true, complete: false, chapter: undefined });
    expect(s.studio.activeAct).toBe(1);
    expect(s.studio.freePlay).toBe(true);
    expect(restoreStudio(s, 'harbour-gate', T)).toBe(false);
    expect(continueStory(s)).toBe(true);
    expect(studioStatus(s).chapter.id).toBe('harbour-gate');
    expect(s.studio.freePlay).toBe(false);
    expect(s.studio.finishedAt).toBe(T - 1);
    expect(s.coins).toBe(600);
    expect(JSON.stringify(s.cells)).toBe(board);
    expect(continueStory(s)).toBe(false);
  });

  test('multi-item supplies save partial progress and cannot consume an extra item', () => {
    let s = newState(7, T);
    s.studio = { version: 1, restored: 4, activeAct: 2, supplied: [] };
    s.cells[0] = { chain: 'paper', tier: 4 };
    s.cells[1] = { chain: 'paper', tier: 4 };
    s.cells[2] = { chain: 'paper', tier: 4 };
    expect(supplyStudio(s, 'landing-books')).toBe(true);
    expect(studioStatus(s).goals.find(g => g.id === 'landing-books')).toMatchObject({ supplied: 1, needed: 2, done: false });
    s = JSON.parse(JSON.stringify(s));
    expect(supplyStudio(s, 'landing-books')).toBe(true);
    expect(studioStatus(s).goals.find(g => g.id === 'landing-books')).toMatchObject({ supplied: 2, done: true });
    expect(supplyStudio(s, 'landing-books')).toBe(false);
    expect(s.cells[2]).not.toBeNull();
  });
  test('old saves retain every board, currency, order and random-state field', () => {
    const s = newState(42, T);
    draw(s, T); s.coins = 150; s.level = 8; s.ink = 35;
    s.discovered.push('heroes:6');
    const original = JSON.parse(JSON.stringify(s));
    const status = studioStatus(s);
    expect(status.goals[0].done).toBe(true);
    expect(status.progress.restored).toBe(0);
    const { studio, ...rest } = s;
    expect(rest).toEqual(original);
    expect(s.coins).toBe(150);
    expect(studioProgress(s)).toEqual(studio);
  });

  test('discovery survives selling a higher-tier item and requires no duplicate', () => {
    const s = newState(1, T);
    s.cells[0] = { chain: 'heroes', tier: 5 };
    s.discovered.push('heroes:5'); erase(s, 0);
    expect(studioStatus(s).goals[0].done).toBe(true);
    expect(supplyStudio(s, 'workshop-discovery')).toBe(false);
  });

  test('supplies require the exact tier and active chapter and consume only one', () => {
    const s = newState(1, T);
    s.cells[0] = { chain: 'heroes', tier: 3 };
    s.cells[1] = { chain: 'heroes', tier: 2 };
    s.cells[2] = { chain: 'heroes', tier: 2 };
    expect(supplyStudio(s, 'library-notes')).toBe(false);
    expect(supplyStudio(s, 'not-a-goal')).toBe(false);
    expect(supplyStudio(s, 'workshop-ink')).toBe(true);
    expect(s.cells[0]).toEqual({ chain: 'heroes', tier: 3 });
    expect(s.cells[1]).toBeNull();
    expect(s.cells[2]).toEqual({ chain: 'heroes', tier: 2 });
    expect(supplyStudio(s, 'workshop-ink')).toBe(false);
    expect(s.cells[2]).not.toBeNull();
  });

  test('restoration cannot skip goals, skip chapters or replay a stale button', () => {
    const s = newState(1, T);
    const original = JSON.stringify(s);
    expect(restoreStudio(s, 'sanctuary', T)).toBe(false);
    expect(restoreStudio(s, 'workshop', T)).toBe(false);
    expect(s.coins).toBe(0);
    prepareChapter(s);
    expect(restoreStudio(s, 'library', T)).toBe(false);
    expect(restoreStudio(s, 'workshop', T)).toBe(true);
    const saved = JSON.stringify(s);
    expect(restoreStudio(s, 'workshop', T + 1)).toBe(false);
    expect(JSON.stringify(s)).toBe(saved);
    expect(saved).not.toBe(original);
  });

  test('all twelve chapters finish once, rewards persist, and free play remains playable', () => {
    let s = newState(3, T);
    let expectedCoins = 0;
    for (const [i, chapter] of studioChapters.entries()) {
      if (studioStatus(s).actComplete) expect(continueStory(s)).toBe(true);
      prepareChapter(s);
      expect(studioStatus(s).canRestore).toBe(true);
      const before = s.ink;
      expect(restoreStudio(s, chapter.id, T + i)).toBe(true);
      expectedCoins += chapter.reward.coins;
      expect(s.coins).toBe(expectedCoins);
      expect(s.ink).toBeGreaterThanOrEqual(before + chapter.reward.ink);
      s = JSON.parse(JSON.stringify(s));
      expect(studioStatus(s).progress.restored).toBe(i + 1);
      if (i === 0) expect(s.level).toBeGreaterThanOrEqual(3);
      if (i === 1) expect(s.level).toBeGreaterThanOrEqual(5);
    }
    expect(studioStatus(s)).toMatchObject({ complete: true, doneGoals: 36, totalGoals: 36 });
    expect(s.studio.finishedAt).toBe(T + 3);
    expect(s.studio.islandFinishedAt).toBe(T + 11);
    expect(continueFreePlay(s)).toBe(true);
    const coins = s.coins;
    expect(continueFreePlay(s)).toBe(false);
    expect(restoreStudio(s, 'sanctuary', T + 9)).toBe(false);
    expect(s.coins).toBe(coins);
    expect(draw(s, T + 10)).not.toBeNull();
  });

  test('free play cannot be selected before the ending', () => {
    expect(continueFreePlay(newState(1, T))).toBe(false);
  });

  test('malformed story fields normalize without touching a legacy board', () => {
    const s = newState(1, T);
    s.studio = { version: 1, restored: NaN, supplied: ['unknown', 'workshop-ink', 'workshop-ink'] };
    expect(studioProgress(s)).toEqual({ version: 1, restored: 0, activeAct: 1, supplied: ['workshop-ink'] });
    expect(s.cells.every(c => c === null)).toBe(true);
    expect(s.coins).toBe(0);
  });
});

test.each([1, 42, 2026])('story is reachable using real seeded draws and merges without random orders (seed %s)', seed => {
  const s = newState(seed, T);
  let now = T, draws = 0;
  for (let turn = 0; turn < 10_000 && !studioStatus(s).complete; turn++) {
    const status = studioStatus(s);
    if (status.actComplete) { continueStory(s); continue; }
    const needed = status.goals.find(g => !g.done)?.item.chain;
    if (s.studio!.restored >= 5) s.focus = needed;
    if (status.canRestore) { expect(restoreStudio(s, status.chapter.id, now)).toBe(true); continue; }
    const supply = status.goals.find(g => g.kind === 'supply' && g.ready);
    if (supply) { supplyStudio(s, supply.id); continue; }
    let combined = false;
    for (let i = 0; i < s.cells.length && !combined; i++) {
      const item = s.cells[i];
      if (!item || item.tier >= TOP_TIER) continue;
      const other = s.cells.findIndex((c, j) => j > i && c?.chain === item.chain && c.tier === item.tier);
      if (other >= 0) { move(s, i, other); combined = true; }
    }
    if (combined) continue;
    if (!s.cells.includes(null)) {
      // Clear an unrelated chain first, retaining the active story chain.
      const other = s.cells.findIndex(c => c?.chain !== needed);
      erase(s, other >= 0 ? other : s.cells.findIndex(Boolean));
    }
    if (s.ink < 1) { now += 30_000 * inkMax(s); refillInk(s, now); }
    if (draw(s, now) != null) draws++;
  }
  expect(studioStatus(s).complete).toBe(true);
  expect(draws).toBeLessThan(3000);
  expect(chainIds.every(chain => s.discovered.some(k => k.startsWith(chain + ':')))).toBe(true);
});
