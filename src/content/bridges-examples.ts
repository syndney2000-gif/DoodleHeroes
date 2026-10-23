/* Example positions for the Isle Spans guides. Each one states what the text
   claims follows from it; tests/bridges-examples.test.ts runs the solver on
   every example and fails if a claim isn't actually forced. */

import { parse, type Board } from '../games/bridges/model';

/** A bridge between two islands, each given as "row,col" (1-based). */
export type BridgeRef = [string, string, number];

export interface SpansExample {
  rows: string[];
  /** Bridges already on the board. */
  given?: BridgeRef[];
  /** Claimed: at least this many bridges must go here. */
  forced?: BridgeRef[];
  /** Claimed: no more than this many bridges can go here (0 = none). */
  capped?: BridgeRef[];
  /** Islands the text talks about, outlined in the diagram. */
  focus?: string[];
}

export const examples = {
  fullDouble: {
    rows: ['2...', '....', '4..2'],
    forced: [['3,1', '1,1', 2], ['3,1', '3,4', 2]],
    focus: ['3,1'],
  },
  oneShort: {
    rows: ['3...2', '.....', '2...1'],
    forced: [['1,1', '1,5', 1], ['1,1', '3,1', 1]],
    focus: ['1,1'],
  },
  smallNeighbour: {
    rows: ['3.1', '...', '...', '2..'],
    forced: [['1,1', '1,3', 1], ['1,1', '4,1', 2]],
    focus: ['1,1'],
  },
  crossing: {
    rows: ['.1.2', '....', '1..3', '....', '.1.2'],
    forced: [['3,1', '3,4', 1]],
    capped: [['1,2', '5,2', 0]],
    focus: ['3,1'],
  },
  pairOfOnes: {
    rows: ['1...1', '.....', '.....', '2...2'],
    capped: [['1,1', '1,5', 0]],
    focus: ['1,1', '1,5'],
  },
  pairOfTwos: {
    rows: ['2.2', '...', '...', '3.3'],
    capped: [['1,1', '1,3', 1]],
    focus: ['1,1', '1,3'],
  },
} satisfies Record<string, SpansExample>;

/** The span id joining two islands given as "row,col", or throws. */
export function spanBetween(board: Board, p: string, q: string): number {
  const at = (ref: string) => {
    const [r, c] = ref.split(',').map((v) => Number(v) - 1);
    const isl = board.islands.find((i) => i.r === r && i.c === c);
    if (!isl) throw new Error(`No island at ${ref}`);
    return isl.id;
  };
  const a = at(p), b = at(q);
  const span = board.spans.find((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a));
  if (!span) throw new Error(`No span between ${p} and ${q}`);
  return span.id;
}

export function islandAt(board: Board, ref: string): number {
  const [r, c] = ref.split(',').map((v) => Number(v) - 1);
  return board.islands.find((i) => i.r === r && i.c === c)!.id;
}

export function exampleBoard(ex: SpansExample) {
  const board = parse(ex.rows);
  const counts = board.spans.map(() => 0);
  for (const [p, q, n] of ex.given ?? []) counts[spanBetween(board, p, q)] = n;
  return { board, counts };
}
