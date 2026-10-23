import { expect, test } from 'vitest';
import { expedition } from '../src/content/expedition';

test('every chapter has one puzzle from each game, and none repeats', () => {
  const keys = new Set<string>();
  for (const chapter of expedition) {
    expect(chapter.tasks.map((t) => t.game).sort()).toEqual(['island-sketch', 'isle-spans', 'lighthouse-wiring']);
    for (const t of chapter.tasks) {
      const key = `${t.game}/${t.puzzleId}`;
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
    }
  }
  expect(new Set(expedition.map((c) => c.landmark)).size).toBe(expedition.length);
});
