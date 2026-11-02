import type { MergeState } from './engine';
import { INK_SECONDS } from './data';

/** Earned by completed projects, independent of the player's XP level. */
export function mergePerks(s: MergeState) {
  const completed = s.studio?.restored ?? 0;
  return {
    focus: completed >= 5,
    satchel: completed >= 10 ? 9 : completed >= 8 ? 6 : completed >= 6 ? 3 : 0,
    inkSeconds: completed >= 9 ? 20 : completed >= 7 ? 25 : INK_SECONDS,
  };
}

export function storeItem(s: MergeState, cell: number): boolean {
  const item = s.cells[cell];
  if (!item || (s.satchel?.length ?? 0) >= mergePerks(s).satchel) return false;
  (s.satchel ??= []).push({ ...item });
  s.cells[cell] = null;
  return true;
}

export function retrieveItem(s: MergeState, index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || !s.satchel?.[index]) return false;
  const cell = s.cells.indexOf(null);
  if (cell < 0) return false;
  s.cells[cell] = s.satchel.splice(index, 1)[0];
  return true;
}
