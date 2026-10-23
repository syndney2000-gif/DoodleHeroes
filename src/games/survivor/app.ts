/* Scribble Siege — the menus, the game loop and the overlays. */

import {
  MAX_LEVEL, RUN_SECONDS, enemies as ENEMIES, heroes, passives as PASSIVES, twists, upgrades, weapons as WEAPONS,
  type EnemyId, type HeroDef, type HeroId, type WeaponId,
} from './data';
import { STEP, chooseCard, grade, newGame, reroll, runCoins, skip, step, type Card, type Game } from './engine';
import { FRAMES, buildSprites, customHeroSprite, type Sprite } from './sprites';
import { bump, draw, makeView, resize, type View } from './render';
import { makeControls } from './input';
import * as audio from './audio';
import {
  buyUpgrade, isUnlocked, loadProfile, nextGoal, recordRun, saveProfile, unlockProgress, unlockText,
} from './meta';
import { hashString, localDateKey } from '../../lib/rng';
import { load, save } from '../../lib/storage';
import { formatTime } from '../../lib/scoring';

type Screen = 'menu' | 'heroes' | 'upgrades' | 'daily' | 'draw' | 'records' | 'game';
const SCREENS: Screen[] = ['menu', 'heroes', 'upgrades', 'daily', 'draw', 'records', 'game'];

const pips = (level: number, max = MAX_LEVEL) => '●'.repeat(level) + '○'.repeat(Math.max(0, max - level));

export async function start(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  let profile = loadProfile();
  const sprites = buildSprites(Object.fromEntries(Object.values(ENEMIES).map((e) => [e.id, e.radius])) as Record<EnemyId, number>);
  let customSprite: Sprite | null = null;

  const refreshCustom = async () => {
    customSprite = profile.custom ? await customHeroSprite(profile.custom.image).catch(() => null) : null;
  };
  await refreshCustom();

  const customHero = (): HeroDef => ({
    id: 'custom', name: profile.custom?.name || 'My Hero', weapon: profile.custom?.weapon ?? 'darts',
    health: 1, speed: 1, colour: '#2D2B33', story: 'Drawn by you. Nobody else has one quite like it.', unlock: { kind: 'free' },
  });
  const heroById = (id: HeroId): HeroDef => (id === 'custom' ? customHero() : heroes.find((h) => h.id === id)!);
  const spriteFor = (id: HeroId): Sprite => (id === 'custom' && customSprite ? customSprite : sprites.hero[id === 'custom' ? 'pip' : id]!);
  const canPlay = (id: HeroId) => (id === 'custom' ? !!profile.custom : isUnlocked(profile, heroById(id)));

  let selected: HeroId = load<HeroId>('scribble-siege:hero') ?? 'pip';
  if (!canPlay(selected)) selected = 'pip';
  const select = (id: HeroId) => { selected = id; save('scribble-siege:hero', id); };

  /* ---------- screens ---------- */

  let current: Screen = 'menu';
  let menuTimer: number | undefined;

  function show(s: Screen) {
    current = s;
    for (const name of SCREENS) $(`scr-${name}`).hidden = name !== s;
    root.querySelector<HTMLElement>('.sg-top')!.hidden = s === 'game';
    $('sg-coins').textContent = String(profile.coins);
    clearInterval(menuTimer);
    if (s === 'menu') renderMenu();
    if (s === 'heroes') renderHeroes();
    if (s === 'upgrades') renderUpgrades();
    if (s === 'daily') renderDaily();
    if (s === 'draw') renderDraw();
    if (s === 'records') renderRecords();
    if (s !== 'game') window.scrollTo(0, 0);
  }
  for (const b of root.querySelectorAll<HTMLElement>('[data-go]')) {
    b.addEventListener('click', () => show(b.dataset.go as Screen));
  }

  /** Draws a hero's boiling-line frames into a small canvas. */
  function animateHero(canvas: HTMLCanvasElement, sprite: Sprite, every = 125) {
    const c = canvas.getContext('2d')!;
    let f = 0;
    const paint = () => {
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.drawImage(sprite.frames[f++ % FRAMES], 0, 0, canvas.width, canvas.height);
    };
    paint();
    return window.setInterval(paint, every);
  }

  function renderMenu() {
    const hero = heroById(selected);
    $('sg-menu-hero-name').textContent = `Playing as ${hero.name}`;
    menuTimer = animateHero($<HTMLCanvasElement>('sg-menu-hero'), spriteFor(selected));
  }
  $('sg-play').addEventListener('click', () => startRun({}));

  /* ---------- heroes ---------- */

  let heroTab: 'crew' | 'mine' = 'crew';
  for (const t of root.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
    t.addEventListener('click', () => {
      heroTab = t.dataset.tab as 'crew' | 'mine';
      for (const o of root.querySelectorAll('[data-tab]')) o.setAttribute('aria-selected', String(o === t));
      renderHeroes();
    });
  }

  function heroCard(hero: HeroDef, playable: boolean): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `sg-hero-card${playable ? '' : ' locked'}`;
    b.setAttribute('aria-pressed', String(selected === hero.id));
    if (playable) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 168;
      cv.getContext('2d')!.drawImage(spriteFor(hero.id).frames[0], 0, 0, 168, 168);
      b.append(cv);
    } else {
      const sil = document.createElement('span');
      sil.className = 'sg-silhouette';
      sil.textContent = '?';
      b.append(sil);
    }
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = hero.name;
    b.append(nm);
    if (!playable) {
      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.textContent = unlockText(hero);
      const bar = document.createElement('span');
      bar.className = 'sg-progress';
      bar.innerHTML = `<i style="width:${Math.round(unlockProgress(profile, hero) * 100)}%"></i>`;
      b.append(lock, bar);
    }
    b.addEventListener('click', () => {
      if (playable) select(hero.id);
      renderHeroes(hero.id);
    });
    return b;
  }

  function renderHeroes(focus: HeroId = selected) {
    const grid = $('sg-hero-grid');
    const detail = $('sg-hero-detail');
    grid.textContent = '';
    detail.textContent = '';
    if (heroTab === 'mine') {
      if (profile.custom) grid.append(heroCard(customHero(), true));
      else {
        grid.innerHTML = '<p>You haven’t drawn a hero yet.</p>';
        const go = document.createElement('button');
        go.className = 'btn';
        go.type = 'button';
        go.textContent = '✏️ Draw one now';
        go.addEventListener('click', () => show('draw'));
        grid.append(go);
        detail.hidden = true;
        return;
      }
      focus = 'custom';
    } else {
      for (const h of heroes) grid.append(heroCard(h, isUnlocked(profile, h)));
      if (focus === 'custom') focus = 'pip';
    }
    const hero = heroById(focus);
    const w = WEAPONS[hero.weapon];
    const playable = canPlay(focus);
    detail.hidden = false;
    detail.innerHTML = `
      <h3></h3>
      <p class="sg-stat-row"><span>❤ Health ×${hero.health}</span><span>👟 Speed ×${hero.speed}</span><span>⏱ Best: ${formatTime(profile.bestTime[hero.id] ?? 0)}</span></p>
      <p><strong>Starts with ${w.icon} ${w.name}.</strong> ${w.blurb}</p>
      <p class="story"></p>
      <p class="status"></p>`;
    detail.querySelector('h3')!.textContent = hero.name;
    detail.querySelector('.story')!.textContent = hero.story;
    detail.querySelector('.status')!.textContent = playable
      ? (selected === focus ? '✓ Selected — this hero goes into the next run.' : 'Tap the card to choose this hero.')
      : `Locked. ${unlockText(hero)}`;
  }

  /* ---------- upgrades mind map ---------- */

  function renderUpgrades() {
    const tree = $('sg-tree');
    tree.textContent = '';
    const n = upgrades.length;
    const pos = upgrades.map((_, k) => {
      const a = -Math.PI / 2 + (k / n) * Math.PI * 2;
      return { x: 50 + Math.cos(a) * 37, y: 50 + Math.sin(a) * 37 };
    });
    // Wobbly pencil lines from the centre out to each idea.
    const lines = pos.map(({ x, y }, k) => {
      const mx = (50 + x) / 2 + ((k % 2 ? 1 : -1) * 3), my = (50 + y) / 2 + ((k % 3) - 1) * 3;
      return `<path d="M50 50 Q${mx} ${my} ${x} ${y}" />`;
    }).join('');
    tree.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#2D2B33" stroke-width=".6" stroke-linecap="round" stroke-dasharray="1.6 1.2">${lines}</g></svg><span class="sg-you">You</span>`;
    upgrades.forEach((u, k) => {
      const owned = profile.upgrades[u.id] ?? 0;
      const maxed = owned >= u.max;
      const price = maxed ? 0 : u.cost(owned);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `sg-node${owned ? ' owned' : ''}${maxed ? ' maxed' : ''}${!maxed && profile.coins >= price ? ' afford' : ''}`;
      b.style.left = `${pos[k].x}%`;
      b.style.top = `${pos[k].y}%`;
      b.innerHTML = `<span class="ic" aria-hidden="true">${u.icon}</span><span class="nm"></span><span class="pips" aria-hidden="true">${pips(owned, u.max)}</span><span class="cost">${maxed ? 'MAX' : `${price} 🪙`}</span>`;
      b.querySelector('.nm')!.textContent = u.name;
      b.setAttribute('aria-label', `${u.name}, level ${owned} of ${u.max}. ${u.effect}. ${maxed ? 'Fully upgraded.' : `Costs ${price} coins.`}`);
      b.title = u.effect;
      b.addEventListener('click', () => {
        const status = $('sg-up-status');
        if (maxed) { status.textContent = `${u.name} is fully upgraded.`; return; }
        if (buyUpgrade(profile, u.id)) {
          status.textContent = `Bought ${u.name} level ${owned + 1}: ${u.effect}.`;
          $('sg-coins').textContent = String(profile.coins);
          renderUpgrades();
        } else {
          status.textContent = `${u.name} costs ${price} coins — you have ${profile.coins}. ${u.effect}.`;
        }
      });
      tree.append(b);
    });
  }

  /* ---------- daily siege ---------- */

  const today = localDateKey();
  const dailySeed = hashString(`${today}:scribble-siege`);
  const dailyTwist = twists[dailySeed % twists.length];
  const dailyHero = heroes[(dailySeed >>> 5) % heroes.length];

  function renderDaily() {
    const box = $('sg-daily');
    const best = profile.daily[today];
    box.innerHTML = `
      <h3>${today}</h3>
      <p><strong>Today’s twist: <span class="tw"></span>.</strong> <span class="tt"></span></p>
      <p>Everyone plays as <strong class="hn"></strong> today, with the same waves of scribbles — even if you haven’t unlocked this hero yet. Your permanent upgrades still count.</p>
      <p>${best ? `Your best today: <strong>${formatTime(best.seconds)}</strong> with ${best.kills} scribbles defeated.` : 'You haven’t played today’s siege yet.'}</p>
      <p><button class="btn" type="button" id="daily-go">Start today’s siege ▶</button></p>`;
    box.querySelector('.tw')!.textContent = dailyTwist.name;
    box.querySelector('.tt')!.textContent = dailyTwist.text;
    box.querySelector('.hn')!.textContent = dailyHero.name;
    box.querySelector('#daily-go')!.addEventListener('click', () => startRun({ daily: true }));
  }

  /* ---------- draw your hero ---------- */

  const drawCanvas = $<HTMLCanvasElement>('sg-draw');
  const dctx = drawCanvas.getContext('2d', { willReadFrequently: true })!;
  const colours = ['#2D2B33', '#E0474C', '#3F7FD8', '#3E9E57', '#F08A24', '#E58FA8'];
  let pen = colours[0];
  let thick = false;
  const undoStack: ImageData[] = [];
  let drawingInit = false;

  function renderDraw() {
    if (!drawingInit) {
      drawingInit = true;
      const sw = $('sg-swatches');
      for (const col of colours) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sg-swatch';
        b.style.background = col;
        b.setAttribute('aria-label', `Pen colour ${col}`);
        b.setAttribute('aria-pressed', String(col === pen));
        b.addEventListener('click', () => {
          pen = col;
          for (const o of sw.children) o.setAttribute('aria-pressed', String(o === b));
        });
        sw.append(b);
      }
      if (profile.custom) {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(320 / img.width, 320 / img.height);
          dctx.drawImage(img, (480 - img.width * s) / 2, (480 - img.height * s) / 2, img.width * s, img.height * s);
        };
        img.src = profile.custom.image;
        $<HTMLInputElement>('sg-name').value = profile.custom.name;
      }
    }
    const sel = $<HTMLSelectElement>('sg-weapon');
    sel.textContent = '';
    for (const h of heroes) {
      if (!isUnlocked(profile, h)) continue;
      const w = WEAPONS[h.weapon];
      const o = document.createElement('option');
      o.value = w.id;
      o.textContent = `${w.icon} ${w.name}`;
      sel.append(o);
    }
    if (profile.custom) sel.value = profile.custom.weapon;
  }

  let last: { x: number; y: number } | null = null;
  const pos = (e: PointerEvent) => {
    const r = drawCanvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 480, y: ((e.clientY - r.top) / r.height) * 480 };
  };
  drawCanvas.addEventListener('pointerdown', (e) => {
    drawCanvas.setPointerCapture(e.pointerId);
    undoStack.push(dctx.getImageData(0, 0, 480, 480));
    if (undoStack.length > 25) undoStack.shift();
    last = pos(e);
    dctx.fillStyle = pen;
    dctx.beginPath(); dctx.arc(last.x, last.y, (thick ? 12 : 5) / 2, 0, Math.PI * 2); dctx.fill();
  });
  drawCanvas.addEventListener('pointermove', (e) => {
    if (!last) return;
    const p = pos(e);
    dctx.strokeStyle = pen;
    dctx.lineWidth = thick ? 12 : 5;
    dctx.lineCap = 'round';
    dctx.lineJoin = 'round';
    dctx.beginPath(); dctx.moveTo(last.x, last.y); dctx.lineTo(p.x, p.y); dctx.stroke();
    last = p;
  });
  const lift = () => { last = null; };
  drawCanvas.addEventListener('pointerup', lift);
  drawCanvas.addEventListener('pointercancel', lift);
  $('sg-size').addEventListener('click', () => { thick = !thick; $('sg-size').textContent = thick ? 'Thick' : 'Thin'; });
  $('sg-undo').addEventListener('click', () => { const s = undoStack.pop(); if (s) dctx.putImageData(s, 0, 0); });
  $('sg-clear').addEventListener('click', () => { undoStack.push(dctx.getImageData(0, 0, 480, 480)); dctx.clearRect(0, 0, 480, 480); });

  $('sg-save').addEventListener('click', async () => {
    // Crop to what was actually drawn, then shrink to a small sprite.
    const img = dctx.getImageData(0, 0, 480, 480);
    let minX = 480, minY = 480, maxX = -1, maxY = -1;
    for (let y = 0; y < 480; y++) {
      for (let x = 0; x < 480; x++) {
        if (img.data[(y * 480 + x) * 4 + 3] > 10) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const status = $('sg-draw-status');
    if (maxX < 0) { status.textContent = 'Draw something first!'; return; }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const scale = Math.min(1, 160 / Math.max(w, h));
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(w * scale));
    out.height = Math.max(1, Math.round(h * scale));
    out.getContext('2d')!.drawImage(drawCanvas, minX, minY, w, h, 0, 0, out.width, out.height);
    profile.custom = {
      image: out.toDataURL('image/png'),
      weapon: $<HTMLSelectElement>('sg-weapon').value as WeaponId,
      name: $<HTMLInputElement>('sg-name').value.trim().slice(0, 18) || 'My Hero',
    };
    saveProfile(profile);
    await refreshCustom();
    select('custom');
    status.textContent = `Saved! ${profile.custom.name} is ready for the next run.`;
  });

  /* ---------- records ---------- */

  function renderRecords() {
    const box = $('sg-records');
    const rows = [...heroes, ...(profile.custom ? [customHero()] : [])]
      .map((h) => `<tr><td>${h.name.replace(/[<>&]/g, '')}</td><td>${formatTime(profile.bestTime[h.id] ?? 0)}</td></tr>`).join('');
    const days = Object.entries(profile.daily).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7)
      .map(([d, r]) => `<tr><td>${d}</td><td>${formatTime(r.seconds)} · ${r.kills} defeated</td></tr>`).join('');
    box.innerHTML = `
      <table><thead><tr><th>Hero</th><th>Longest run</th></tr></thead><tbody>${rows}</tbody></table>
      <table><tbody>
        <tr><th>Runs played</th><td>${profile.runs}</td></tr>
        <tr><th>Sieges survived</th><td>${profile.wins}</td></tr>
        <tr><th>Scribbles defeated</th><td>${profile.totalKills.toLocaleString()}</td></tr>
      </tbody></table>
      ${days ? `<h3>Recent daily sieges</h3><table><tbody>${days}</tbody></table>` : ''}`;
  }

  /* ---------- the run ---------- */

  const canvas = $<HTMLCanvasElement>('sg-canvas');
  let view: View | null = null;
  const controls = makeControls($('scr-game'), $('sg-stick'), $('sg-knob'));
  let game: Game | null = null;
  let runHero: HeroId = 'pip';
  let runDaily = false;
  let paused = false;
  let raf = 0;
  let lastTs = 0;
  let acc = 0;
  let shownStatus: Game['status'] = 'playing';
  const hudCache = new Map<string, string>();

  const setText = (id: string, text: string) => {
    if (hudCache.get(id) === text) return;
    hudCache.set(id, text);
    $(id).textContent = text;
  };
  const setWidth = (id: string, pct: number) => {
    const v = `${Math.max(0, Math.min(100, pct)).toFixed(1)}%`;
    if (hudCache.get(id) === v) return;
    hudCache.set(id, v);
    $(id).style.width = v;
  };

  function startRun(opts: { daily?: boolean }) {
    runDaily = !!opts.daily;
    const hero = runDaily ? dailyHero : heroById(selected);
    runHero = hero.id;
    game = newGame({
      hero, weapon: hero.weapon, meta: profile.upgrades,
      seed: runDaily ? dailySeed : (Math.random() * 2 ** 32) >>> 0,
      twist: runDaily ? dailyTwist : undefined,
    });
    paused = false;
    shownStatus = 'playing';
    hudCache.clear();
    for (const id of ['ov-pause', 'ov-level', 'ov-end']) $(id).hidden = true;
    show('game');
    view ??= makeView(canvas);
    resize(view);
    lastTs = performance.now();
    acc = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function frame(ts: number) {
    raf = requestAnimationFrame(frame);
    if (!game || !view) return;
    const dt = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    if (game.status === 'playing' && !paused) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 6 && game.status === 'playing') { step(game, controls.vector()); acc -= STEP; n++; }
    } else acc = 0;

    if (game.events.length) {
      audio.play(game.events);
      if (game.events.includes('hurt')) bump(view, 7);
      if (game.events.includes('boss')) bump(view, 14);
      game.events.length = 0;
    }
    draw(view, game, sprites, spriteFor(runHero));
    updateHud(game);

    if (game.status !== shownStatus) {
      shownStatus = game.status;
      if (game.status === 'levelup') showLevelUp();
      else if (game.status === 'dead' || game.status === 'won') endRun();
      else $('ov-level').hidden = true;
    }
  }

  function updateHud(g: Game) {
    setText('hud-level', String(g.level));
    setWidth('hud-xp', (g.xp / g.xpNeed) * 100);
    setWidth('hud-hp', (g.player.hp / g.player.maxHp) * 100);
    setText('hud-hp-text', `${Math.ceil(g.player.hp)}`);
    setText('hud-time', formatTime(Math.max(0, Math.ceil(RUN_SECONDS - g.t))));
    setText('hud-kills', String(g.kills));
    const boss = g.enemies.find((e) => e.def.id === 'eraser');
    $('hud-boss').hidden = !boss;
    if (boss) setWidth('hud-boss-hp', (boss.hp / boss.maxHp) * 100);
    const loadout = [
      ...g.weapons.map((w) => `${WEAPONS[w.id].icon}|${w.level}`),
      ...g.passives.map((p) => `${PASSIVES[p.id].icon}|${p.level}`),
    ].join(',');
    if (hudCache.get('loadout') !== loadout) {
      hudCache.set('loadout', loadout);
      const ul = $('hud-loadout');
      ul.textContent = '';
      for (const item of loadout.split(',').filter(Boolean)) {
        const [icon, lv] = item.split('|');
        const li = document.createElement('li');
        li.innerHTML = `<span aria-hidden="true">${icon}</span><small>${pips(Number(lv))}</small>`;
        li.setAttribute('aria-label', `level ${lv}`);
        ul.append(li);
      }
    }
  }

  /* ---------- level up ---------- */

  function cardInfo(card: Card): { icon: string; name: string; tag: string; tagClass: string; text: string } {
    if (card.kind === 'weapon') {
      const w = WEAPONS[card.id];
      return card.level === 1
        ? { icon: w.icon, name: w.name, tag: 'New weapon', tagClass: 'new', text: w.blurb }
        : { icon: w.icon, name: w.name, tag: card.level === MAX_LEVEL ? 'Max level' : `Level ${card.level}`, tagClass: card.level === MAX_LEVEL ? 'max' : 'up', text: w.changes[card.level - 1] };
    }
    if (card.kind === 'passive') {
      const p = PASSIVES[card.id];
      return { icon: p.icon, name: p.name, tag: card.level === 1 ? 'New item' : card.level === MAX_LEVEL ? 'Max level' : `Level ${card.level}`, tagClass: card.level === 1 ? 'new' : card.level === MAX_LEVEL ? 'max' : 'up', text: p.effect };
    }
    if (card.kind === 'snack') return { icon: '🍪', name: 'Snack Break', tag: 'Heal', tagClass: 'up', text: 'Recover 30 health.' };
    return { icon: '🪙', name: 'Pocket Money', tag: 'Coins', tagClass: 'up', text: '+10 coins for this run.' };
  }

  function showLevelUp() {
    if (!game) return;
    const box = $('lv-cards');
    box.textContent = '';
    game.cards.forEach((card, k) => {
      const info = cardInfo(card);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sg-card';
      b.innerHTML = `<span class="key" aria-hidden="true">${k + 1}</span><span class="ic" aria-hidden="true">${info.icon}</span><span class="nm"></span><span class="tag ${info.tagClass}"></span><span class="fx"></span>`;
      b.querySelector('.nm')!.textContent = info.name;
      b.querySelector('.tag')!.textContent = info.tag;
      b.querySelector('.fx')!.textContent = info.text;
      b.addEventListener('click', () => pickCard(k));
      box.append(b);
    });
    const r = $<HTMLButtonElement>('lv-reroll');
    r.textContent = `🎲 Reroll (${game.rerolls})`;
    r.disabled = game.rerolls <= 0;
    $('ov-level').hidden = false;
    box.querySelector<HTMLButtonElement>('.sg-card')?.focus({ preventScroll: true });
  }

  function pickCard(k: number) {
    if (!game || game.status !== 'levelup') return;
    chooseCard(game, k);
    afterLevelChoice();
  }
  function afterLevelChoice() {
    if (!game) return;
    if (game.status === 'levelup') showLevelUp();
    else { $('ov-level').hidden = true; shownStatus = game.status; lastTs = performance.now(); }
  }
  $('lv-reroll').addEventListener('click', () => { if (game) { reroll(game); showLevelUp(); } });
  $('lv-skip').addEventListener('click', () => { if (game) { skip(game); afterLevelChoice(); } });
  window.addEventListener('keydown', (e) => {
    if (current !== 'game' || !game || game.status !== 'levelup') return;
    const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    if (n >= 0) { e.preventDefault(); pickCard(n); }
  });

  /* ---------- pause ---------- */

  function setPaused(v: boolean) {
    if (!game || game.status !== 'playing') return;
    paused = v;
    $('ov-pause').hidden = !v;
    $('pz-sound').textContent = `Sound: ${audio.soundOn() ? 'on' : 'off'}`;
    lastTs = performance.now();
  }
  controls.onPause(() => setPaused(!paused));
  $('hud-pause').addEventListener('click', () => setPaused(true));
  $('pz-resume').addEventListener('click', () => setPaused(false));
  $('pz-sound').addEventListener('click', () => { audio.setSound(!audio.soundOn()); $('pz-sound').textContent = `Sound: ${audio.soundOn() ? 'on' : 'off'}`; });
  $('pz-quit').addEventListener('click', () => {
    if (!game) return;
    paused = false;
    $('ov-pause').hidden = true;
    game.status = 'dead';
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && current === 'game') setPaused(true); });
  window.addEventListener('resize', () => { if (view) resize(view); });

  /* ---------- end of run ---------- */

  function endRun() {
    if (!game) return;
    const g = game;
    const won = g.status === 'won';
    const coins = runCoins(g);
    const unlocked = recordRun(profile, {
      hero: runHero, seconds: g.t, kills: g.kills, coins, won,
      daily: runDaily ? today : undefined,
    });
    $('end-grade').textContent = grade(g);
    $('end-title').textContent = won ? 'You survived the siege!' : 'The scribbles got you';
    $('end-time').textContent = formatTime(Math.floor(g.t));
    $('end-kills').textContent = g.kills.toLocaleString();
    $('end-level').textContent = String(g.level);
    // Coins count up, unless motion is reduced.
    const coinEl = $('end-coins');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) coinEl.textContent = String(coins);
    else {
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / 900);
        coinEl.textContent = String(Math.round(coins * k));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    const un = $('end-unlocked');
    un.hidden = unlocked.length === 0;
    un.textContent = unlocked.map((h) => `🎉 New hero unlocked: ${h.name}`).join(' · ');
    const goal = nextGoal(profile);
    $('end-goal').innerHTML = goal
      ? `Next upgrade: <strong></strong> — ${goal.need - goal.have} coins away<div class="sg-progress"><i style="width:${Math.round((goal.have / goal.need) * 100)}%"></i></div>`
      : 'Every upgrade bought — you’re fully kitted out.';
    if (goal) $('end-goal').querySelector('strong')!.textContent = goal.label;
    $('ov-end').hidden = false;
    $('ov-level').hidden = true;
    $<HTMLButtonElement>('end-again').focus({ preventScroll: true });
  }
  $('end-again').addEventListener('click', () => startRun({ daily: runDaily }));
  $('end-menu').addEventListener('click', () => {
    cancelAnimationFrame(raf);
    game = null;
    profile = loadProfile();
    show('menu');
  });

  show('menu');
}
