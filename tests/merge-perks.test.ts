import { expect, test } from 'vitest';
import { draw, newState, nextInkIn, refillInk, unlockedChains } from '../src/games/merge/engine';
import { mergePerks, retrieveItem, storeItem } from '../src/games/merge/perks';

const T = 1_000_000;
test('tools unlock from completed projects and never merely from a high XP level', () => {
  const s = newState(1, T); s.level = 99;
  expect(mergePerks(s)).toEqual({ focus: false, satchel: 0, inkSeconds: 30 });
  s.studio = { version: 1, restored: 6, supplied: [] };
  expect(mergePerks(s)).toEqual({ focus: true, satchel: 3, inkSeconds: 30 });
  s.studio.restored = 8;
  expect(mergePerks(s)).toEqual({ focus: true, satchel: 6, inkSeconds: 25 });
  s.studio.restored = 10;
  expect(mergePerks(s)).toEqual({ focus: true, satchel: 9, inkSeconds: 20 });
});
test('focused draws use exactly one ink and resume with the same RNG', () => {
  const a = newState(8, T); a.level = 5;
  a.studio = { version: 1, restored: 5, supplied: [] }; a.focus = 'creatures';
  const b = JSON.parse(JSON.stringify(a));
  for (let i = 0; i < 10; i++) { draw(a, T); draw(b, T); }
  expect(a.cells.filter(Boolean).every(c => c!.chain === 'creatures')).toBe(true);
  expect(a.ink).toBe(20);
  expect(a).toEqual(b);
});
test('focus cannot draw a locked chain or bypass the chapter unlock', () => {
  const s = newState(8, T); s.focus = 'creatures';
  s.studio = { version: 1, restored: 5, supplied: [] };
  for (let i = 0; i < 20; i++) draw(s, T);
  expect(s.cells.filter(Boolean).every(c => unlockedChains(s).includes(c!.chain))).toBe(true);
  delete s.studio; s.cells.fill(null); s.ink = 30; s.level = 5; s.focus = 'paper';
  for (let i = 0; i < 20; i++) draw(s, T);
  expect(new Set(s.cells.filter(Boolean).map(c => c!.chain)).size).toBeGreaterThan(1);
});
test('satchel moves preserve inventory across saves and refuse full destinations', () => {
  const s = newState(1, T); s.cells[0] = { chain: 'paper', tier: 6 };
  expect(storeItem(s, 0)).toBe(false);
  s.studio = { version: 1, restored: 6, supplied: [] };
  expect(storeItem(s, 0)).toBe(true); expect(s.cells[0]).toBeNull();
  expect(storeItem(s, 0)).toBe(false);
  const restored = JSON.parse(JSON.stringify(s));
  expect(retrieveItem(restored, 0)).toBe(true);
  expect(restored.cells[0]).toEqual({ chain: 'paper', tier: 6 });
  expect(retrieveItem(restored, 0)).toBe(false);
  s.cells.fill({ chain: 'heroes', tier: 1 });
  const saved = JSON.stringify(s);
  expect(retrieveItem(s, 0)).toBe(false); expect(JSON.stringify(s)).toBe(saved);
  expect(retrieveItem(s, -1)).toBe(false);
});
test('satchel capacity cannot be exceeded and storing creates no rewards or discoveries', () => {
  const s = newState(1, T); s.studio = { version: 1, restored: 6, supplied: [] };
  s.cells.fill({ chain: 'paper', tier: 2 });
  for (let i = 0; i < 3; i++) expect(storeItem(s, i)).toBe(true);
  expect(storeItem(s, 3)).toBe(false);
  expect(s.satchel).toHaveLength(3); expect(s.coins).toBe(0); expect(s.xp).toBe(0); expect(s.discovered).toEqual([]);
});
test('earned ink wells apply their interval to offline refill and countdown', () => {
  const s = newState(1, T); s.ink = 0;
  s.studio = { version: 1, restored: 7, supplied: [] };
  expect(nextInkIn(s, T)).toBe(25);
  refillInk(s, T + 51_000); expect(s.ink).toBe(2); expect(nextInkIn(s, T + 51_000)).toBe(24);
  s.studio.restored = 9; s.inkAt = T; s.ink = 0;
  refillInk(s, T + 61_000); expect(s.ink).toBe(3); expect(nextInkIn(s, T + 61_000)).toBe(19);
});
