/* Pip the Pencil, the island's guide: one friendly line and a suggestion,
   chosen from the time of day and the player's progress. Pure, so the
   choices are tested in tests/pip.test.ts. */

import type { World } from './world';

export interface PipContext {
  hour: number;
  world: World;
  streak: number;
  dailyDoneToday: boolean;
  /** The last game played, if any. */
  last?: { name: string; href: string };
  /** Changes daily, so the small talk varies. */
  day: number;
}

export interface PipLine {
  mood: 'wave' | 'cheer' | 'sleepy' | 'think';
  text: string;
  cta?: { label: string; href: string };
}

const SMALL_TALK = [
  'Every puzzle here can be solved by thinking alone — no guessing needed.',
  'Stuck? A hint costs a star, but it never stops you finishing.',
  'Fun fact: I was drawn with a pencil. Obviously.',
  'Finishing a whole row in Island Sketch makes the clue sparkle. Try it!',
  'The lighthouse keeper left the lamp to you. No pressure!',
  'Islands love bridges. Bridges love islands. It’s very sweet.',
  'A little puzzle a day keeps the fog away.',
];

export function pipSays(c: PipContext): PipLine {
  const { world: w } = c;
  const fresh = w.overall === 0 && !c.last;
  if (fresh) {
    return {
      mood: 'wave',
      text: 'Hi, I’m Pip! This little island has gone quiet. Help me light it up again — shall we start with a tiny picture puzzle?',
      cta: { label: 'Let’s go!', href: '/island-sketch/play?p=sun' },
    };
  }
  const late = c.hour >= 22 || c.hour < 5;
  if (c.streak >= 2 && !c.dailyDoneToday) {
    return {
      mood: 'think',
      text: `Your ${c.streak}-day streak is waiting${late ? ' — just enough time before bed' : ''}! Today’s daily sketch is ready.`,
      cta: { label: 'Keep the streak', href: '/island-sketch/play?p=daily' },
    };
  }
  if (w.beam && w.chapters === 4) {
    return { mood: 'cheer', text: 'The lighthouse shines over the whole of the Lantern Isles again. You did that!', cta: c.last && { label: `Back to ${c.last.name}`, href: c.last.href } };
  }
  if (late) {
    return { mood: 'sleepy', text: 'Yawn… night owl? One cosy puzzle, then off to bed. I’ll keep the lamp on.', cta: c.last && { label: `Continue ${c.last.name}`, href: c.last.href } };
  }
  if (c.dailyDoneToday) {
    return { mood: 'cheer', text: `Today’s daily: done! ${SMALL_TALK[c.day % SMALL_TALK.length]}`, cta: c.last && { label: `Continue ${c.last.name}`, href: c.last.href } };
  }
  const greeting = c.hour < 12 ? 'Good morning' : c.hour < 18 ? 'Good afternoon' : 'Good evening';
  if (c.last) {
    return { mood: 'wave', text: `${greeting}! Welcome back. ${SMALL_TALK[c.day % SMALL_TALK.length]}`, cta: { label: `Continue ${c.last.name}`, href: c.last.href } };
  }
  return { mood: 'wave', text: `${greeting}! ${SMALL_TALK[c.day % SMALL_TALK.length]}`, cta: { label: 'Today’s daily', href: '/island-sketch/play?p=daily' } };
}
