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
      { name: 'Ink Dot', image: '/images/merge/heroes-1.webp' }, { name: 'Blob', image: '/images/merge/heroes-2.webp' }, { name: 'Stick Figure', image: '/images/merge/heroes-3.webp' },
      { name: 'Doodle Kid', image: '/images/merge/heroes-4.webp' }, { name: 'Pencil Knight', image: '/images/merge/heroes-5.webp' }, { name: 'Ink Wizard', image: '/images/merge/heroes-6.webp' },
      { name: 'Super Doodle', image: '/images/merge/heroes-7.webp' }, { name: 'Hero of the Margin', image: '/images/merge/heroes-8.webp' },
    ],
  },
  paper: {
    id: 'paper', name: 'Paper', unlockLevel: 1,
    items: [
      { name: 'Paper Scrap', image: '/images/merge/paper-1.webp' }, { name: 'Sticky Note', image: '/images/merge/paper-2.webp' }, { name: 'Notebook', image: '/images/merge/paper-3.webp' },
      { name: 'Sketchbook', image: '/images/merge/paper-4.webp' }, { name: 'Storybook', image: '/images/merge/paper-5.webp' }, { name: 'Book Stack', image: '/images/merge/paper-6.webp' },
      { name: 'Library', image: '/images/merge/paper-7.webp' }, { name: 'Story Castle', image: '/images/merge/paper-8.webp' },
    ],
  },
  tools: {
    id: 'tools', name: 'Art Tools', unlockLevel: 3,
    items: [
      { name: 'Pencil Stub', image: '/images/merge/tools-1.webp' }, { name: 'Crayon', image: '/images/merge/tools-2.webp' }, { name: 'Fountain Pen', image: '/images/merge/tools-3.webp' },
      { name: 'Paintbrush', image: '/images/merge/tools-4.webp' }, { name: 'Palette', image: '/images/merge/tools-5.webp' }, { name: 'Framed Picture', image: '/images/merge/tools-6.webp' },
      { name: 'Art Prize', image: '/images/merge/tools-7.webp' }, { name: 'Masterpiece', image: '/images/merge/tools-8.webp' },
    ],
  },
  creatures: {
    id: 'creatures', name: 'Creatures', unlockLevel: 5,
    items: [
      { name: 'Squiggle Worm', image: '/images/merge/creatures-1.webp' }, { name: 'Ladybird', image: '/images/merge/creatures-2.webp' }, { name: 'Paper Bird', image: '/images/merge/creatures-3.webp' },
      { name: 'Ink Cat', image: '/images/merge/creatures-4.webp' }, { name: 'Sketch Fox', image: '/images/merge/creatures-5.webp' }, { name: 'Margin Dragon', image: '/images/merge/creatures-6.webp' },
      { name: 'Unicorn', image: '/images/merge/creatures-7.webp' }, { name: 'Star Whale', image: '/images/merge/creatures-8.webp' },
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
