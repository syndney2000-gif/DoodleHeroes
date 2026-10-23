import { describe, expect, test } from 'vitest';
import { examples, exampleBoard, spanBetween } from '../src/content/bridges-examples';
import { initialState, solve } from '../src/games/bridges/solver';

describe('Isle Spans guide examples', () => {
  for (const [name, ex] of Object.entries(examples)) {
    test(`${name}: every claim is forced by the rules`, () => {
      const { board, counts } = exampleBoard(ex);
      const start = initialState(board);
      start.min = counts.slice();
      const result = solve(board, start);
      expect(result.contradiction, 'example position is impossible').toBe(false);
      for (const [p, q, n] of 'forced' in ex ? ex.forced : []) {
        expect(result.min[spanBetween(board, p, q)], `${p}–${q} forced ≥ ${n}`).toBeGreaterThanOrEqual(n);
      }
      for (const [p, q, n] of 'capped' in ex ? ex.capped : []) {
        expect(result.max[spanBetween(board, p, q)], `${p}–${q} capped ≤ ${n}`).toBeLessThanOrEqual(n);
      }
    });
  }
});
