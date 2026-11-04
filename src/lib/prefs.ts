/* Who's playing and how they like it: play style, text size and clearer
   patterns. Each is mirrored onto <html> as a data attribute so CSS can
   respond; Base.astro applies them before first paint. */

import { load, save } from './storage';

export type PlayStyle = 'sprout' | 'explorer' | 'master';
export type TextSize = 'normal' | 'large' | 'larger';

export const playStyles: { id: PlayStyle; name: string; blurb: string }[] = [
  { id: 'sprout', name: 'Sprout', blurb: 'Relaxed: no clock, bigger text, and Pip offers a hand when you pause.' },
  { id: 'explorer', name: 'Explorer', blurb: 'The classic: a quiet timer, hints when you want them.' },
  { id: 'master', name: 'Master', blurb: 'Personal bests, a hint check, and badges for flawless solves.' },
];

export const playStyle = (): PlayStyle => load<PlayStyle>('settings:play-style') ?? 'explorer';
export const hasChosenStyle = () => load<PlayStyle>('settings:play-style') != null;
export const textSize = (): TextSize => load<TextSize>('settings:text-size') ?? 'normal';
export const patternsOn = () => !!load<boolean>('settings:patterns');

export function applyPrefs(): void {
  const root = document.documentElement;
  root.dataset.style = playStyle();
  root.dataset.text = textSize();
  root.toggleAttribute('data-patterns', patternsOn());
}

export function setPlayStyle(style: PlayStyle): void { save('settings:play-style', style); applyPrefs(); }
export function setTextSize(size: TextSize): void { save('settings:text-size', size); applyPrefs(); }
export function setPatterns(on: boolean): void { save('settings:patterns', on); applyPrefs(); }
