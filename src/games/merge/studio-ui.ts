import { chains } from './data';
import type { MergeState } from './engine';
import { itemMarkup } from './art';
import { continueFreePlay, continueStory, restoreStudio, studioChapters, studioStatus, supplyStudio } from './studio';
import { storyActs } from './island-stories';
import { mergePerks } from './perks';
import { playSound } from '../../lib/audio';
import { reducedMotion } from '../../lib/site-shell';

export function setupStudio(root: HTMLElement, state: MergeState, onChange: () => void) {
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  let wasFreePlay = false;
  let chaptersKey = '';
  let archiveCount = -1;
  let restoredCount = -1;
  const goalEls = new Map<string, HTMLElement>();
  function render() {
    const status = studioStatus(state);
    const { progress, chapter, goals, actComplete, complete, act, actIndex } = status;
    const perks = mergePerks(state);
    root.dataset.complete = String(complete);
    root.dataset.freePlay = String(!!progress.freePlay);
    get('[data-story-act]').textContent = `Story ${actIndex + 1} of ${storyActs.length} · ${act.title}`;
    get('[data-studio-count]').textContent = `${progress.restored} of ${studioChapters.length} projects complete`;
    const bar = get<HTMLProgressElement>('[data-studio-progress]');
    bar.max = status.totalGoals + studioChapters.length;
    bar.value = status.doneGoals + progress.restored;
    bar.setAttribute('aria-label', 'Overall island story progress');
    get('[data-studio-title]').textContent = actComplete ? act.ending : `Chapter ${progress.restored + 1} · ${chapter!.title}`;
    get('[data-studio-story]').textContent = actComplete ? act.text : chapter!.story;
    get('[data-story-letter]').hidden = !chapter;
    get('[data-story-speaker]').textContent = chapter?.speaker ?? '';
    get('[data-story-letter-text]').textContent = chapter?.letter ?? '';
    const scene = get('[data-studio-scene]');
    scene.dataset.act = String(actIndex + 1);
    scene.dataset.localRestored = String(Math.min(4, progress.restored - actIndex * 4));
    scene.setAttribute('aria-label', `${act.place}: ${Math.min(4, progress.restored - actIndex * 4)} of four projects complete.`);
    scene.querySelector('[data-original-studio]')?.setAttribute('data-restored', String(Math.min(4, progress.restored)));
    get('[data-scene-caption]').textContent = act.place;
    const nextChaptersKey = `${actIndex}:${progress.restored}`;
    if (chaptersKey !== nextChaptersKey) {
    chaptersKey = nextChaptersKey;
    get('[data-studio-chapters]').innerHTML = studioChapters.slice(actIndex * 4, actIndex * 4 + 4).map((c, local) => {
      const i = actIndex * 4 + local;
      return `<li class="${i < progress.restored ? 'restored' : i === progress.restored && !actComplete ? 'current' : ''}"${i === progress.restored && !actComplete ? ' aria-current="step"' : ''}><span aria-hidden="true">${i < progress.restored ? '✓' : i + 1}</span>${c.room}<span class="sr-only">${i < progress.restored ? ', complete' : i === progress.restored ? ', current chapter' : ', later chapter'}</span></li>`;
    }).join('');
    }
    const host = get('[data-studio-goals]');
    for (const [id, element] of goalEls) {
      if (!goals.some(goal => goal.id === id)) { element.remove(); goalEls.delete(id); }
    }
    for (const goal of goals) {
      const locked = state.level < chains[goal.item.chain].unlockLevel;
      const amount = goal.kind === 'supply' && goal.needed > 1 ? ` · ${goal.supplied}/${goal.needed} supplied` : '';
      let row = goalEls.get(goal.id);
      if (!row) {
        row = document.createElement('li');
        row.innerHTML = `<div class="studio-goal-item">${itemMarkup(goal.item)}<span><strong></strong><small></small></span></div><span class="studio-check">✓ Done</span><span class="studio-goal-note"></span><button class="btn secondary" type="button"></button>`;
        goalEls.set(goal.id, row); host.append(row);
      }
      row.className = `studio-goal${goal.done ? ' done' : ''}`;
      row.querySelector('strong')!.textContent = `${goal.kind === 'discover' ? 'Discover' : `Supply${goal.needed > 1 ? ` ${goal.needed} ×` : ''}`} ${goal.name}`;
      row.querySelector('small')!.textContent = `${goal.reason}${amount}`;
      row.querySelector<HTMLElement>('.studio-check')!.hidden = !goal.done;
      const note = row.querySelector<HTMLElement>('.studio-goal-note')!;
      note.hidden = goal.done || goal.kind !== 'discover';
      note.textContent = locked ? `Unlocks at level ${chains[goal.item.chain].unlockLevel}` : `Merge to tier ${goal.item.tier} · keep the item`;
      const button = row.querySelector<HTMLButtonElement>('button')!;
      button.hidden = goal.done || goal.kind !== 'supply';
      button.disabled = !goal.ready;
      if (!button.hidden) button.dataset.studioSupply = goal.id;
      else delete button.dataset.studioSupply;
      button.textContent = goal.ready ? 'Supply one' : locked ? `Level ${chains[goal.item.chain].unlockLevel}` : `Need tier ${goal.item.tier}`;
      button.setAttribute('aria-label', `Supply one ${goal.name} to the project`);
    }
    const mini = document.querySelector('[data-chapter-mini]');
    const summary = document.querySelector('[data-goal-summary]');
    const next = goals.find(goal => !goal.done);
    if (mini) mini.textContent = actComplete ? act.ending : `Chapter ${progress.restored + 1} · ${chapter!.room}`;
    if (summary) summary.textContent = next ? `${next.kind === 'discover' ? 'Discover' : 'Supply'} ${next.name}${next.needed > 1 ? ` · ${next.supplied}/${next.needed}` : ''}` : status.canRestore ? 'Your project is ready to complete! ↓' : 'Your next little adventure awaits ↓';
    get('[data-studio-goals]').hidden = actComplete;
    get('[data-studio-supply-note]').hidden = actComplete;
    const restore = get<HTMLButtonElement>('[data-studio-restore]');
    restore.hidden = actComplete;
    restore.disabled = !status.canRestore;
    restore.dataset.studioRestore = chapter?.id ?? '';
    restore.textContent = chapter ? `Complete the ${chapter.room.toLowerCase()} →` : '';
    get('[data-studio-reward]').textContent = chapter ? `Project reward: ${chapter.reward.coins} coins · ${chapter.reward.ink} ink · ${chapter.reward.xp} XP${chapter.unlock ? ` · ${chapter.unlock}` : ''}` : '';
    get('[data-studio-ending]').hidden = !actComplete || !!progress.freePlay;
    get('[data-ending-title]').textContent = act.ending;
    get('[data-ending-text]').textContent = act.text;
    get('[data-next-story]').hidden = !status.nextAct;
    get('[data-next-story-text]').textContent = act.invitation;
    get<HTMLButtonElement>('[data-story-continue]').textContent = act.action;
    get('[data-studio-free-play]').hidden = !progress.freePlay;
    get('[data-studio-free-play]').textContent = `Free play · ${act.title} is complete. Your earned tools and all discoveries stay with you.${status.nextAct ? ' Your next story is waiting below.' : ' All three stories are complete.'}`;
    get('[data-story-resume]').hidden = !progress.freePlay || !status.nextAct;
    get<HTMLButtonElement>('[data-story-resume]').textContent = act.action;
    get('[data-perks-summary]').textContent = `${perks.inkSeconds}s ink refill${perks.focus ? ' · focused drawing' : ''}${perks.satchel ? ` · ${perks.satchel}-item satchel` : ''}`;
    if (archiveCount !== progress.restored) {
    archiveCount = progress.restored;
    get('[data-story-archive]').innerHTML = progress.restored ? studioChapters.slice(0, progress.restored).map((c, i) => `<article class="story-memory"><p class="eyebrow">Chapter ${i + 1} · ${c.speaker}</p><h3>${c.title}</h3><p>“${c.letter}”</p><p class="story-outcome">${c.restored}</p></article>`).join('') : '<p class="muted">Your first completed project will leave a letter here.</p>';
    }
    if (restoredCount >= 0 && progress.restored > restoredCount && !reducedMotion()) {
      scene.animate([{ opacity: .6, transform: 'translateY(8px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    restoredCount = progress.restored;
    if (progress.freePlay && !wasFreePlay) get<HTMLDetailsElement>('[data-studio-visual]').open = false;
    if (!progress.freePlay && wasFreePlay) get<HTMLDetailsElement>('[data-studio-visual]').open = true;
    wasFreePlay = !!progress.freePlay;
  }
  root.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const supply = button.dataset.studioSupply;
    const restore = button.dataset.studioRestore;
    let message = '';
    if (supply && supplyStudio(state, supply)) {
      message = 'Item supplied. Thank you for helping this little corner of the island.';
      playSound('deliver');
    } else if (restore) {
      const chapter = studioStatus(state).chapter;
      if (!restoreStudio(state, restore, Date.now())) return;
      message = chapter!.restored;
      get<HTMLDetailsElement>('.studio-reading').open = true;
      playSound(studioStatus(state).actComplete ? 'solved' : 'levelup');
    } else if (button.hasAttribute('data-studio-continue') && continueFreePlay(state)) {
      message = 'Free play is open. Your next adventure will wait until you are ready.';
      playSound('tap');
    } else if ((button.hasAttribute('data-story-continue') || button.hasAttribute('data-story-resume')) && continueStory(state)) {
      message = `A new story begins: ${studioStatus(state).act.title}.`;
      playSound('discover');
      get<HTMLDetailsElement>('.studio-reading').open = true;
      get<HTMLDetailsElement>('[data-studio-visual]').open = true;
    } else return;
    onChange();
    get('[data-studio-status]').textContent = message;
    if (event.detail === 0) {
      (root.querySelector<HTMLButtonElement>('[data-studio-restore]:not(:disabled):not([hidden]), [data-studio-supply]:not(:disabled)') ?? get<HTMLElement>('[data-studio-title]')).focus({ preventScroll: true });
    }
  });
  return { render };
}
