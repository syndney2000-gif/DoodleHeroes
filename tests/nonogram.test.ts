import { describe, expect, test } from 'vitest';
import { allPuzzles, chapters } from '../src/games/nonogram/puzzles';
import { dailyPuzzle } from '../src/games/nonogram/daily';
import {
  EMPTY, FILLED, UNKNOWN, cluesFor, runs, solveGrid, solveLine, type Cell,
} from '../src/games/nonogram/solver';

const line = (s: string): Cell[] =>
  [...s].map((ch) => (ch === '#' ? FILLED : ch === 'x' ? EMPTY : UNKNOWN));
const show = (cells: Cell[] | null) =>
  cells && cells.map((c) => (c === FILLED ? '#' : c === EMPTY ? 'x' : '?')).join('');

describe('runs and clues', () => {
  test('runs counts filled blocks', () => {
    expect(runs([true, true, false, true])).toEqual([2, 1]);
    expect(runs([false, false])).toEqual([]);
  });

  test('cluesFor reads rows and columns', () => {
    expect(cluesFor(['#.', '##'])).toEqual({ rows: [[1], [2]], cols: [[2], [1]] });
  });
});

describe('solveLine', () => {
  test('overlap: a 7 in 10 cells fixes the middle 4', () => {
    expect(show(solveLine([7], line('??????????')))).toBe('???####???');
  });

  test('a clue that fills the line exactly', () => {
    expect(show(solveLine([2, 2], line('?????')))).toBe('##x##');
  });

  test('empty clue crosses the whole line', () => {
    expect(show(solveLine([], line('???')))).toBe('xxx');
  });

  test('a filled cell next to the edge reaches out from it', () => {
    expect(show(solveLine([3], line('#?????')))).toBe('###xxx');
  });

  test('cells out of reach of every block are crossed', () => {
    expect(show(solveLine([2], line('???#???')))).toBe('xx?#?xx');
  });

  test('a contradiction returns null', () => {
    expect(solveLine([3], line('#x#'))).toBeNull();
  });
});

describe('catalogue', () => {
  test('ids are unique', () => {
    const ids = allPuzzles.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const chapter of chapters) {
    for (const p of chapter.puzzles) {
      test(`${chapter.id}/${p.id} is square, uses only # and ., and needs no guessing`, () => {
        const n = p.solution.length;
        for (const row of p.solution) {
          expect(row).toHaveLength(n);
          expect(row).toMatch(/^[#.]+$/);
        }
        const result = solveGrid(cluesFor(p.solution));
        expect(result.solved).toBe(true);
        const drawn = result.grid.map((r) => r.map((c) => (c === FILLED ? '#' : '.')).join(''));
        expect(drawn).toEqual(p.solution);
      });
    }
  }
});

describe('daily puzzles', () => {
  test('the same date always gives the same puzzle', () => {
    expect(dailyPuzzle('2026-10-23').solution).toEqual(dailyPuzzle('2026-10-23').solution);
  });

  test('different dates give different puzzles', () => {
    expect(dailyPuzzle('2026-10-23').solution).not.toEqual(dailyPuzzle('2026-10-24').solution);
  });

  test('a year of dailies are all solvable without guessing', () => {
    const start = Date.UTC(2026, 0, 1);
    for (let d = 0; d < 365; d++) {
      const key = new Date(start + d * 86400000).toISOString().slice(0, 10);
      expect(solveGrid(cluesFor(dailyPuzzle(key).solution)).solved, key).toBe(true);
    }
  });
});
