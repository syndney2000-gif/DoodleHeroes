/* A finite restoration story layered over the original merge rules.
   Reads old discoveries, never clears an old board, and awards each room once. */
import { chains } from './data';
import { gainXp, refillInk, type Item, type MergeState, type StudioProgress } from './engine';
import { firstLetters, islandChapters, storyActs } from './island-stories';

export interface StudioGoal {
  id: string;
  kind: 'discover' | 'supply';
  item: Item;
  reason: string;
  quantity?: number;
}
export const studioChapters = [
  {
    id: 'workshop', title: 'Prepare the workshop', room: 'Workshop',
    story: 'The old island studio has been quiet for years. Bring a little life back to the workbench.',
    restored: 'The workbench is repaired, the lamps are lit, and your first helpers have moved in.',
    reward: { coins: 25, ink: 10, xp: 60 },
    goals: [
      { id: 'workshop-discovery', kind: 'discover', item: { chain: 'heroes', tier: 4 }, reason: 'Find an adventurer to welcome visitors.' },
      { id: 'workshop-ink', kind: 'supply', item: { chain: 'heroes', tier: 2 }, reason: 'Fresh ink for the workbench.' },
      { id: 'workshop-helper', kind: 'supply', item: { chain: 'heroes', tier: 3 }, reason: 'A helping hand to repair the studio.' },
    ],
  },
  {
    id: 'library', title: 'Stock the library', room: 'Library',
    story: 'An empty bookshelf is full of possibilities. Gather pages and sketches for the reading corner.',
    restored: 'Shelves fill with stories. There is finally a quiet corner to sit and dream.',
    reward: { coins: 45, ink: 15, xp: 80 },
    goals: [
      { id: 'library-discovery', kind: 'discover', item: { chain: 'paper', tier: 5 }, reason: 'Discover the first story for the shelves.' },
      { id: 'library-notes', kind: 'supply', item: { chain: 'paper', tier: 3 }, reason: 'A notebook for visiting writers.' },
      { id: 'library-sketches', kind: 'supply', item: { chain: 'paper', tier: 4 }, reason: 'A sketchbook for their illustrations.' },
    ],
  },
  {
    id: 'art-room', title: 'Open the art room', room: 'Art room',
    story: 'Let color back into the studio. Set out the tools for an afternoon of making things.',
    restored: 'The easel is ready, the paints are out, and the art room is open to everyone.',
    reward: { coins: 65, ink: 20, xp: 100 },
    goals: [
      { id: 'art-discovery', kind: 'discover', item: { chain: 'tools', tier: 5 }, reason: 'Discover a palette full of color.' },
      { id: 'art-pen', kind: 'supply', item: { chain: 'tools', tier: 3 }, reason: 'A pen for the drawing desk.' },
      { id: 'art-brush', kind: 'supply', item: { chain: 'tools', tier: 4 }, reason: 'A paintbrush for the new easel.' },
    ],
  },
  {
    id: 'sanctuary', title: 'Create the creature sanctuary', room: 'Sanctuary',
    story: 'One last corner needs a little warmth. Make a home for the island’s curious creatures.',
    restored: 'Every corner is alive again. The island studio is ready for its next story: yours.',
    reward: { coins: 100, ink: 30, xp: 140 },
    goals: [
      { id: 'sanctuary-discovery', kind: 'discover', item: { chain: 'creatures', tier: 6 }, reason: 'Meet the guardian of this new home.' },
      { id: 'sanctuary-bird', kind: 'supply', item: { chain: 'creatures', tier: 3 }, reason: 'A bird to settle beside the window.' },
      { id: 'sanctuary-cat', kind: 'supply', item: { chain: 'creatures', tier: 4 }, reason: 'A cat to curl up in the cozy corner.' },
    ],
  },
  ...islandChapters,
].map((chapter, index) => ({
  ...chapter,
  speaker: 'speaker' in chapter ? chapter.speaker : firstLetters[index].speaker,
  letter: 'letter' in chapter ? chapter.letter : firstLetters[index].letter,
  unlock: 'unlock' in chapter ? chapter.unlock : '',
  goals: chapter.goals as StudioGoal[],
}));

/** Migration adds only story fields. All pre-existing gameplay stays intact. */
export function studioProgress(s: MergeState): StudioProgress {
  if (!s.studio || s.studio.version !== 1) s.studio = { version: 1, restored: 0, supplied: [] };
  const p = s.studio;
  p.restored = Number.isInteger(p.restored) ? Math.max(0, Math.min(studioChapters.length, p.restored)) : 0;
  const earliestAct = Math.max(1, Math.ceil(p.restored / 4));
  const latestAct = Math.min(storyActs.length, Math.floor(p.restored / 4) + 1);
  p.activeAct = Number.isInteger(p.activeAct) && p.activeAct! >= earliestAct && p.activeAct! <= latestAct ? p.activeAct : earliestAct;
  const valid = new Set(studioChapters.flatMap(c => c.goals.filter(g => g.kind === 'supply').map(g => g.id)));
  p.supplied = Array.isArray(p.supplied) ? [...new Set(p.supplied.filter(id => valid.has(id)))] : [];
  return p;
}

function discovered(s: MergeState, item: Item) {
  // A higher tier proves that this discovery was already reached. Older
  // players keep credit even after delivering or erasing the original item.
  return s.discovered.some(key => {
    const [chain, tier] = key.split(':');
    return chain === item.chain && Number(tier) >= item.tier;
  }) || s.cells.some(c => c?.chain === item.chain && c.tier >= item.tier);
}

export function studioStatus(s: MergeState) {
  const progress = studioProgress(s);
  const actIndex = progress.activeAct! - 1;
  const act = storyActs[actIndex];
  const actComplete = progress.restored >= progress.activeAct! * 4;
  const chapter = actComplete ? undefined : studioChapters[progress.restored];
  const goals = chapter?.goals.map(goal => {
    const needed = goal.quantity ?? 1;
    const amount = progress.contributions?.[goal.id];
    const supplied = progress.supplied.includes(goal.id) ? needed : Number.isInteger(amount) ? Math.max(0, Math.min(needed, amount!)) : 0;
    const done = goal.kind === 'discover' ? discovered(s, goal.item) : supplied >= needed;
    const cell = goal.kind === 'supply' && !done ? s.cells.findIndex(c => c?.chain === goal.item.chain && c.tier === goal.item.tier) : -1;
    return { ...goal, name: chains[goal.item.chain].items[goal.item.tier - 1].name, needed, supplied, done, cell, ready: cell >= 0 };
  }) ?? [];
  const totalGoals = studioChapters.reduce((n, c) => n + c.goals.length, 0);
  const doneGoals = studioChapters.slice(0, progress.restored).reduce((n, c) => n + c.goals.length, 0) + goals.filter(g => g.done).length;
  return { progress, chapter, goals, doneGoals, totalGoals, act, actIndex, actComplete, nextAct: storyActs[actIndex + 1], canRestore: !!chapter && goals.every(g => g.done), complete: progress.restored === studioChapters.length };
}

/** Supplies consume exactly one matching item, and only in the active chapter. */
export function supplyStudio(s: MergeState, goalId: string): boolean {
  const status = studioStatus(s);
  const goal = status.goals.find(g => g.id === goalId);
  if (!goal || goal.kind !== 'supply' || goal.done || !goal.ready) return false;
  s.cells[goal.cell] = null;
  if (goal.needed > 1) (status.progress.contributions ??= {})[goal.id] = goal.supplied + 1;
  if (goal.supplied + 1 >= goal.needed) status.progress.supplied.push(goal.id);
  return true;
}

/** Explicit restoration is the sole reward boundary, so reopening is harmless. */
export function restoreStudio(s: MergeState, chapterId: string, now: number): boolean {
  const status = studioStatus(s);
  if (!status.canRestore || status.chapter?.id !== chapterId) return false;
  const { reward } = status.chapter;
  refillInk(s, now);
  s.coins += reward.coins;
  gainXp(s, reward.xp);
  s.ink += reward.ink;
  status.progress.restored++;
  if (status.progress.restored === 4) status.progress.finishedAt ??= now;
  if (status.progress.restored === studioChapters.length) status.progress.islandFinishedAt = now;
  // Faster ink wells start their new interval now, not retroactively.
  if (status.progress.restored === 7 || status.progress.restored === 9) s.inkAt = now;
  return true;
}

export function continueFreePlay(s: MergeState): boolean {
  const status = studioStatus(s);
  if (!status.actComplete || status.progress.freePlay) return false;
  status.progress.freePlay = true;
  return true;
}

/** An act ending is a real stopping place. New adventures are always opt-in. */
export function continueStory(s: MergeState): boolean {
  const status = studioStatus(s);
  if (!status.actComplete || !status.nextAct) return false;
  status.progress.activeAct = status.progress.activeAct! + 1;
  status.progress.freePlay = false;
  return true;
}
