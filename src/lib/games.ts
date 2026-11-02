/** One catalogue for navigation, cards and safe Continue links. */
export const games = [
  { id: 'island-sketch', name: 'Island Sketch', kind: 'Picture logic', symbol: 'grid', color: 'rose', copy: 'Find a little picture, one square at a time.', first: '?p=sun', daily: '?p=daily' },
  { id: 'isle-spans', name: 'Isle Spans', kind: 'Bridge building', symbol: 'bridge', color: 'sage', copy: 'Bring the islands a little closer together.', first: '?p=two-coves', daily: '?p=daily' },
  { id: 'lighthouse-wiring', name: 'Lighthouse Wiring', kind: 'Network puzzle', symbol: 'sun', color: 'gold', copy: 'A turn here, a little more light there.', first: '?p=first-light', daily: '?p=daily' },
  { id: 'doodle-guess', name: 'Doodle Guess', kind: 'Daily discovery', symbol: 'pencil', color: 'blue', copy: 'One mystery drawing. A few thoughtful guesses.', first: '', daily: '' },
  { id: 'margin-merge', name: 'Margin Merge', kind: 'Cozy collecting', symbol: 'spark', color: 'lavender', copy: 'Small beginnings. Wonderful discoveries.', first: '', daily: null },
  { id: 'scribble-siege', name: 'Scribble Siege', kind: 'Little adventures', symbol: 'swords', color: 'peach', copy: 'A brave little hero. Ten minutes of adventure.', first: '', daily: null },
] as const;
