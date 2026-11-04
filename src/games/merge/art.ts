import { chains, type ChainId } from './data';
export function itemImage(item: { chain: ChainId; tier: number }) {
  return chains[item.chain].items[item.tier - 1].image;
}
/** Artwork is decorative; parent board cells and order labels name the item. */
export function itemMarkup(item: { chain: ChainId; tier: number }) {
  return `<img class="merge-art" src="${itemImage(item)}" alt="" draggable="false" width="160" height="160" decoding="sync" />`;
}
