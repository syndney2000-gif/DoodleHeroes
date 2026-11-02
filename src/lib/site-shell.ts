import { games } from './games';
import { load, save } from './storage';
import { playSound, setSound, soundOn } from './audio';

export function reducedMotion() {
  return !!load<boolean>('settings:reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function syncMotion() {
  document.documentElement.toggleAttribute('data-reduced-motion', reducedMotion());
}
syncMotion();
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', syncMotion);

function syncSound() {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')) {
    button.setAttribute('aria-label', soundOn() ? 'Mute sound' : 'Enable sound');
    button.setAttribute('aria-pressed', String(!soundOn()));
    button.dataset.sound = String(soundOn());
  }
}
syncSound();
window.addEventListener('dh:audio-change', syncSound);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')) {
  button.addEventListener('click', () => { setSound(!soundOn()); if (soundOn()) playSound('tap'); });
}

const current = games.find(game => location.pathname === `/${game.id}/play`);
if (current) {
  save('last-played', { id: current.id, href: location.pathname + location.search });
  if (!document.querySelector('.play-back') && !document.body.classList.contains('game-page')) {
    const back = document.createElement('a');
    back.className = 'play-back'; back.href = '/games'; back.textContent = '← Your game collection';
    document.querySelector('main')?.prepend(back);
  }
}
const last = load<{ id: string; href: string }>('last-played');
const game = games.find(g => g.id === last?.id);
const continueLink = document.querySelector<HTMLAnchorElement>('[data-continue]');
if (game && last && continueLink) {
  try {
    const url = new URL(last.href, location.origin);
    if (url.origin === location.origin && url.pathname === `/${game.id}/play`) {
      continueLink.href = url.pathname + url.search;
      continueLink.textContent = 'Continue your adventure →';
      const caption = document.querySelector('[data-continue-caption]');
      if (caption) caption.textContent = `${game.name} · Pick up where you left off`;
    }
  } catch { /* Ignore malformed Continue data. */ }
}
