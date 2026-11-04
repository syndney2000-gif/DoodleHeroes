/* Pip's how-to-play tours: short, and each step waits for the player to
   actually do the thing ("move" = any move, "gain" = complete a line,
   island or cottage, "ok" = press the button). */

export interface TourStep { text: string; until: 'move' | 'gain' | 'ok' }

export const tours: Record<string, TourStep[]> = {
  'island-sketch': [
    { text: 'Each number is a run of filled squares in that row or column. Tap a square to fill it — try one!', until: 'move' },
    { text: 'Lovely! Fill a whole row or column to match its clue, and the clue sparkles.', until: 'gain' },
    { text: 'You’ve got it! Switch to ✕ to mark squares you know are empty. The bulb gives a hint if you’re stuck.', until: 'ok' },
  ],
  'isle-spans': [
    { text: 'Each number says how many bridges touch that island. Drag from an island towards a neighbour to build one.', until: 'move' },
    { text: 'Nice! Tap the same spot again for a double bridge. Give an island all its bridges and it lights up.', until: 'gain' },
    { text: 'Perfect. Bridges can’t cross, and every island must join up in the end. Off you go!', until: 'ok' },
  ],
  'lighthouse-wiring': [
    { text: 'Tap a tile to turn it. Orange wires are connected to the lighthouse in the middle.', until: 'move' },
    { text: 'Keep turning! Connect a cottage and its window lights up.', until: 'gain' },
    { text: 'Brilliant. Light every cottage with no loose ends. Use Lock to pin tiles you’re sure of.', until: 'ok' },
  ],
};
