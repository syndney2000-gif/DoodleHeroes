/* A gentle weekly event that changes how the home island looks. Chosen
   from the date, so everyone sees the same one and nothing is stored. */

export interface IslandEvent { id: string; name: string; blurb: string }

export const events: IslandEvent[] = [
  { id: 'bloom', name: 'Bloom Week', blurb: 'Petals drift across the island.' },
  { id: 'kites', name: 'Kite Festival', blurb: 'Kites dance over the hills.' },
  { id: 'starfall', name: 'Starfall Week', blurb: 'Shooting stars after dark — and a few by day.' },
  { id: 'lanterns', name: 'Lantern Festival', blurb: 'Paper lanterns float up from the bay.' },
];

/** Monday-based week number since 5 Jan 1970 (a Monday). */
export function weekNumber(d: Date): number {
  const day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5;
  return Math.floor((day - 4) / 7);
}

export const eventFor = (d: Date): IslandEvent => events[((weekNumber(d) % events.length) + events.length) % events.length];
