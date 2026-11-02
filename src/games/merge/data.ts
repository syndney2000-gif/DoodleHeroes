/* Margin Merge — the item chains. Two of the same item merge into the next
   one up; each chain has eight steps. */

export type ChainId = 'heroes' | 'paper' | 'tools' | 'creatures';
export const TOP_TIER = 8;

export interface Chain {
  id: ChainId;
  name: string;
  /** Player level at which the sketchbook starts drawing this chain. */
  unlockLevel: number;
  items: { name: string; image: string }[]; // index 0 = tier 1
}

export const chains: Record<ChainId, Chain> = {
  heroes: {
    id: 'heroes', name: 'Heroes', unlockLevel: 1,
    items: [
      { name: 'Ink Dot', image: '/images/merge/cartoon/heroes-1.svg' }, { name: 'Blob', image: '/images/merge/cartoon/heroes-2.svg' }, { name: 'Stick Figure', image: '/images/merge/cartoon/heroes-3.svg' },
      { name: 'Doodle Kid', image: '/images/merge/cartoon/heroes-4.svg' }, { name: 'Pencil Knight', image: '/images/merge/cartoon/heroes-5.svg' }, { name: 'Ink Wizard', image: '/images/merge/cartoon/heroes-6.svg' },
      { name: 'Super Doodle', image: '/images/merge/cartoon/heroes-7.svg' }, { name: 'Hero of the Margin', image: '/images/merge/cartoon/heroes-8.svg' },
    ],
  },
  paper: {
    id: 'paper', name: 'Paper', unlockLevel: 1,
    items: [
      { name: 'Paper Scrap', image: '/images/merge/cartoon/paper-1.svg' }, { name: 'Sticky Note', image: '/images/merge/cartoon/paper-2.svg' }, { name: 'Notebook', image: '/images/merge/cartoon/paper-3.svg' },
      { name: 'Sketchbook', image: '/images/merge/cartoon/paper-4.svg' }, { name: 'Storybook', image: '/images/merge/cartoon/paper-5.svg' }, { name: 'Book Stack', image: '/images/merge/cartoon/paper-6.svg' },
      { name: 'Library', image: '/images/merge/cartoon/paper-7.svg' }, { name: 'Story Castle', image: '/images/merge/cartoon/paper-8.svg' },
    ],
  },
  tools: {
    id: 'tools', name: 'Art Tools', unlockLevel: 3,
    items: [
      { name: 'Pencil Stub', image: '/images/merge/cartoon/tools-1.svg' }, { name: 'Crayon', image: '/images/merge/cartoon/tools-2.svg' }, { name: 'Fountain Pen', image: '/images/merge/cartoon/tools-3.svg' },
      { name: 'Paintbrush', image: '/images/merge/cartoon/tools-4.svg' }, { name: 'Palette', image: '/images/merge/cartoon/tools-5.svg' }, { name: 'Framed Picture', image: '/images/merge/cartoon/tools-6.svg' },
      { name: 'Art Prize', image: '/images/merge/cartoon/tools-7.svg' }, { name: 'Masterpiece', image: '/images/merge/cartoon/tools-8.svg' },
    ],
  },
  creatures: {
    id: 'creatures', name: 'Creatures', unlockLevel: 5,
    items: [
      { name: 'Squiggle Worm', image: '/images/merge/cartoon/creatures-1.svg' }, { name: 'Ladybird', image: '/images/merge/cartoon/creatures-2.svg' }, { name: 'Paper Bird', image: '/images/merge/cartoon/creatures-3.svg' },
      { name: 'Ink Cat', image: '/images/merge/cartoon/creatures-4.svg' }, { name: 'Sketch Fox', image: '/images/merge/cartoon/creatures-5.svg' }, { name: 'Margin Dragon', image: '/images/merge/cartoon/creatures-6.svg' },
      { name: 'Unicorn', image: '/images/merge/cartoon/creatures-7.svg' }, { name: 'Star Whale', image: '/images/merge/cartoon/creatures-8.svg' },
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
