import { chains } from './data';
import type { MergeState } from './engine';
import { itemMarkup } from './art';
import { continueFreePlay, restoreStudio, studioChapters, studioStatus, supplyStudio } from './studio';
import { playSound } from '../../lib/audio';

export function setupStudio(root: HTMLElement, state: MergeState, onChange: () => void) {
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  let wasFreePlay = false;
  function render() {
    const status = studioStatus(state);
    const { progress, chapter, goals, complete } = status;
    root.dataset.complete = String(complete);
    root.dataset.freePlay = String(!!progress.freePlay);
    get('[data-studio-count]').textContent = `${progress.restored} of ${studioChapters.length} corners restored`;
    const bar = get<HTMLProgressElement>('[data-studio-progress]');
    bar.max = status.totalGoals + studioChapters.length;
    bar.value = status.doneGoals + progress.restored;
    bar.setAttribute('aria-label', 'Overall studio restoration');
    get('[data-studio-title]').textContent = complete ? (progress.freePlay ? 'Your studio. Your next adventure.' : 'A place to call your own.') : `Chapter ${progress.restored + 1} · ${chapter.title}`;
    get('[data-studio-story]').textContent = complete ? 'You brought every corner of the island studio back to life. The restoration story is complete.' : chapter.story;
    get('[data-studio-scene]').dataset.restored = String(progress.restored);
    get('[data-studio-scene]').setAttribute('aria-label', `Island studio: ${progress.restored} of four corners restored.${progress.restored ? ` ${studioChapters.slice(0, progress.restored).map(c => c.room).join(', ')} furnished.` : ' Empty corners are waiting for your help.'}`);
    get('[data-studio-chapters]').innerHTML = studioChapters.map((c, i) => `<li class="${i < progress.restored ? 'restored' : i === progress.restored ? 'current' : ''}"${i === progress.restored ? ' aria-current="step"' : ''}><span aria-hidden="true">${i < progress.restored ? '✓' : i + 1}</span>${c.room}<span class="sr-only">${i < progress.restored ? ', restored' : i === progress.restored ? ', current chapter' : ', later chapter'}</span></li>`).join('');
    get('[data-studio-goals]').innerHTML = goals.map(goal => {
      const locked = state.level < chains[goal.item.chain].unlockLevel;
      return `<li class="studio-goal${goal.done ? ' done' : ''}">
        <div class="studio-goal-item">${itemMarkup(goal.item)}<span><strong>${goal.kind === 'discover' ? 'Discover' : 'Supply'} ${goal.name}</strong><small>${goal.reason}</small></span></div>
        ${goal.done ? '<span class="studio-check">✓ Done</span>' : goal.kind === 'discover' ? `<span class="studio-goal-note">${locked ? `Unlocks at level ${chains[goal.item.chain].unlockLevel}` : `Merge to tier ${goal.item.tier} · keep the item`}</span>` : `<button class="btn secondary" type="button" data-studio-supply="${goal.id}"${goal.ready ? '' : ' disabled'} aria-label="Supply ${goal.name} to the studio">${goal.ready ? 'Supply item' : locked ? `Level ${chains[goal.item.chain].unlockLevel}` : `Need tier ${goal.item.tier}`}</button>`}
      </li>`;
    }).join('');
    get('[data-studio-goals]').hidden = complete;
    get('[data-studio-supply-note]').hidden = complete;
    const restore = get<HTMLButtonElement>('[data-studio-restore]');
    restore.hidden = complete;
    restore.disabled = !status.canRestore;
    restore.dataset.studioRestore = chapter?.id ?? '';
    restore.textContent = chapter ? `Restore the ${chapter.room.toLowerCase()} →` : '';
    get('[data-studio-reward]').textContent = chapter ? `Restoration reward: ${chapter.reward.coins} coins · ${chapter.reward.ink} ink · ${chapter.reward.xp} XP` : '';
    get('[data-studio-ending]').hidden = !complete || !!progress.freePlay;
    get('[data-studio-free-play]').hidden = !progress.freePlay;
    if (progress.freePlay && !wasFreePlay) get<HTMLDetailsElement>('[data-studio-visual]').open = false;
    wasFreePlay = !!progress.freePlay;
  }
  root.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const supply = button.dataset.studioSupply;
    const restore = button.dataset.studioRestore;
    let message = '';
    if (supply && supplyStudio(state, supply)) {
      message = 'Item supplied to the studio. One step closer to a new home.';
      playSound('deliver');
    } else if (restore) {
      const chapter = studioStatus(state).chapter;
      if (!restoreStudio(state, restore, Date.now())) return;
      message = chapter!.restored;
      playSound(studioStatus(state).complete ? 'solved' : 'levelup');
    } else if (button.hasAttribute('data-studio-continue') && continueFreePlay(state)) {
      message = 'Free play is open. Keep collecting, fill optional orders, and make the studio your own.';
      playSound('tap');
    } else return;
    // The board and reward commit together to the existing single save object.
    onChange();
    get('[data-studio-status]').textContent = message;
    if (event.detail === 0) {
      (root.querySelector<HTMLButtonElement>('[data-studio-restore]:not(:disabled):not([hidden]), [data-studio-supply]:not(:disabled), [data-studio-ending]:not([hidden]) [data-studio-continue]') ?? get<HTMLElement>('[data-studio-title]')).focus({ preventScroll: true });
    }
  });
  return { render };
}
