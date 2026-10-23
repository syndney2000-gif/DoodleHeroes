/* Margin Merge — the item chains. Two of the same item merge into the next
   one up; each chain has eight steps. */

export type ChainId = 'heroes' | 'paper' | 'tools' | 'creatures';
export const TOP_TIER = 8;

export interface Chain {
  id: ChainId;
  name: string;
  /** Player level at which the sketchbook starts drawing this chain. */
  unlockLevel: number;
  items: { name: string; icon: string }[]; // index 0 = tier 1
}

export const chains: Record<ChainId, Chain> = {
  heroes: {
    id: 'heroes', name: 'Heroes', unlockLevel: 1,
    items: [
      { name: 'Ink Dot', icon: '⚫' }, { name: 'Blob', icon: '🫧' }, { name: 'Stick Figure', icon: '🧍' },
      { name: 'Doodle Kid', icon: '🧒' }, { name: 'Pencil Knight', icon: '🤺' }, { name: 'Ink Wizard', icon: '🧙' },
      { name: 'Super Doodle', icon: '🦸' }, { name: 'Hero of the Margin', icon: '👑' },
    ],
  },
  paper: {
    id: 'paper', name: 'Paper', unlockLevel: 1,
    items: [
      { name: 'Paper Scrap', icon: '📃' }, { name: 'Sticky Note', icon: '🗒️' }, { name: 'Notebook', icon: '📓' },
      { name: 'Sketchbook', icon: '📔' }, { name: 'Storybook', icon: '📕' }, { name: 'Book Stack', icon: '📚' },
      { name: 'Library', icon: '🏫' }, { name: 'Story Castle', icon: '🏰' },
    ],
  },
  tools: {
    id: 'tools', name: 'Art Tools', unlockLevel: 3,
    items: [
      { name: 'Pencil Stub', icon: '✏️' }, { name: 'Crayon', icon: '🖍️' }, { name: 'Fountain Pen', icon: '🖊️' },
      { name: 'Paintbrush', icon: '🖌️' }, { name: 'Palette', icon: '🎨' }, { name: 'Framed Picture', icon: '🖼️' },
      { name: 'Art Prize', icon: '🏆' }, { name: 'Masterpiece', icon: '🌟' },
    ],
  },
  creatures: {
    id: 'creatures', name: 'Creatures', unlockLevel: 5,
    items: [
      { name: 'Squiggle Worm', icon: '🐛' }, { name: 'Ladybird', icon: '🐞' }, { name: 'Paper Bird', icon: '🐦' },
      { name: 'Ink Cat', icon: '🐈' }, { name: 'Sketch Fox', icon: '🦊' }, { name: 'Margin Dragon', icon: '🐉' },
      { name: 'Unicorn', icon: '🦄' }, { name: 'Star Whale', icon: '🐋' },
    ],
  },
};

export const chainIds = Object.keys(chains) as ChainId[];

export const BOARD_W = 6;
export const BOARD_H = 7;
/** Ink refills one drop every this many seconds. */
export const INK_SECONDS = 30;
export const INK_PER_LEVEL = 5;
export const INK_BASE = 30;

/** Experience to go from `level` to the next. */
export function xpToNext(level: number): number {
  return 10 + level * 8;
}

/** Coins an item sells for if you erase it. */
export function sellValue(tier: number): number {
  return tier;
}

/** Coins for delivering an item in an order. */
export function orderValue(tier: number): number {
  return 2 ** (tier - 1) * 3;
}
