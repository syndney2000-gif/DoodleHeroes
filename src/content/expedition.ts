/* Lantern Isles — the expedition that ties the three games together. Each
   chapter asks for one puzzle from each game; finishing all three completes
   the chapter and opens the next. */

import { findPuzzle as findSketch } from '../games/nonogram/puzzles';
import { findPuzzle as findSpans } from '../games/bridges/puzzles';
import { findPuzzle as findWiring } from '../games/net/puzzles';

export interface Task {
  game: 'island-sketch' | 'isle-spans' | 'lighthouse-wiring';
  gameName: string;
  puzzleId: string;
  title: string;
  /** What this task does for the island, in story terms. */
  goal: string;
  href: string;
}

export interface ExpeditionChapter {
  id: string;
  title: string;
  story: string;
  /** Landmark on the island map that lights up when the chapter is done. */
  landmark: string;
  tasks: Task[];
}

function task(game: Task['game'], puzzleId: string, goal: string): Task {
  const lookup = { 'island-sketch': findSketch, 'isle-spans': findSpans, 'lighthouse-wiring': findWiring }[game];
  const puzzle = lookup(puzzleId);
  if (!puzzle) throw new Error(`Expedition: no ${game} puzzle ${puzzleId}`);
  const gameName = { 'island-sketch': 'Island Sketch', 'isle-spans': 'Isle Spans', 'lighthouse-wiring': 'Lighthouse Wiring' }[game];
  return { game, gameName, puzzleId, title: puzzle.title, goal, href: `/${game}/play?p=${puzzleId}` };
}

export const expedition: ExpeditionChapter[] = [
  {
    id: 'landfall',
    title: 'Chapter 1 · Landfall',
    story: 'Your boat runs aground on a quiet beach. The island’s map is blank, its bridges are down, and the lighthouse has been dark for years. Start small: sketch what you see, cross the shallows, and get the first cottages lit.',
    landmark: 'cove',
    tasks: [
      task('island-sketch', 'sail', 'Sketch the dinghy that brought you here.'),
      task('isle-spans', 'two-coves', 'Rebuild the rope bridges between the coves.'),
      task('lighthouse-wiring', 'first-light', 'Bring power back to the first cottages.'),
    ],
  },
  {
    id: 'village',
    title: 'Chapter 2 · The Village',
    story: 'Up the path from the beach is a village of whitewashed cottages. The villagers remember the lighthouse burning every night, and they’ll help — once the paths and lamps are working again.',
    landmark: 'village',
    tasks: [
      task('island-sketch', 'lighthouse', 'Sketch the lighthouse from the village square.'),
      task('isle-spans', 'reef-crossing', 'Reopen the paths across the reef.'),
      task('lighthouse-wiring', 'school-house', 'Light the school house for evening lessons.'),
    ],
  },
  {
    id: 'harbour',
    title: 'Chapter 3 · The Harbour',
    story: 'The harbour once kept the whole island supplied. Boats sit idle and the quay is dark. Get the fleet on the water, the ferry running, and the boat yard working through the night.',
    landmark: 'harbour',
    tasks: [
      task('island-sketch', 'boat', 'Sketch the fishing fleet back on the water.'),
      task('isle-spans', 'ferry-routes', 'Get the ferry running between the harbour islands.'),
      task('lighthouse-wiring', 'boat-yard', 'Wire up the boat yard.'),
    ],
  },
  {
    id: 'lantern',
    title: 'Chapter 4 · The Lantern',
    story: 'Only the climb to the lighthouse remains. Finish the map, bring the lamp oil across from the quay, and run power up the cliff road. Then, for the first time in years, the beam sweeps the sea.',
    landmark: 'lighthouse',
    tasks: [
      task('island-sketch', 'compass', 'Add the compass rose that completes the map.'),
      task('isle-spans', 'lantern-quay', 'Bridge the lamp oil across from Lantern Quay.'),
      task('lighthouse-wiring', 'lantern-lit', 'Light the lighthouse.'),
    ],
  },
];
