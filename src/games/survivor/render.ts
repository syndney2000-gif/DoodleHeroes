/* Scribble Siege — draws a game state onto a canvas. Reads the state, never
   changes it. */

import { BASE, weapons as WEAPONS } from './data';
import type { Game } from './engine';
import { FRAMES, doodleDecor, type Sprite, type SpriteSet } from './sprites';
import { hashString } from '../../lib/rng';

const PAPER = '#FBF7EC';
const RULE = 'rgba(47, 99, 200, 0.16)';
const LINE_GAP = 40;
const DECOR_TILE = 420;

export interface View {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** CSS pixels per world unit. */
  zoom: number;
  w: number; h: number; // CSS pixels
  dpr: number;
  shake: number;
  reducedMotion: boolean;
}

export function makeView(canvas: HTMLCanvasElement): View {
  const view: View = {
    canvas, ctx: canvas.getContext('2d')!, zoom: 1, w: 0, h: 0, dpr: 1, shake: 0,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  resize(view);
  return view;
}

export function resize(v: View) {
  const rect = v.canvas.getBoundingClientRect();
  v.dpr = Math.min(2, window.devicePixelRatio || 1);
  v.w = rect.width;
  v.h = rect.height;
  v.canvas.width = Math.round(rect.width * v.dpr);
  v.canvas.height = Math.round(rect.height * v.dpr);
  // Zoom so the hero and scribbles stay big enough to read on a phone,
  // while still showing a fair stretch of paper around you.
  v.zoom = Math.max(0.8, Math.min(1.25, Math.min(v.w, v.h) / 520));
}

function blit(c: CanvasRenderingContext2D, s: Sprite, x: number, y: number, frame: number, scale = 1, rot = 0, alpha = 1) {
  const img = s.frames[frame % FRAMES];
  const size = s.size * scale;
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.drawImage(img, -size / 2, -size / 2, size, size);
  c.restore();
}

export function draw(v: View, g: Game, sprites: SpriteSet, heroSprite: Sprite) {
  const c = v.ctx;
  const p = g.player;
  // Lines "boil" at eight frames a second; reduced motion holds them still.
  const frame = v.reducedMotion ? 0 : Math.floor(g.t * 8);

  c.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
  c.fillStyle = PAPER;
  c.fillRect(0, 0, v.w, v.h);

  let sx = 0, sy = 0;
  if (v.shake > 0 && !v.reducedMotion) { sx = (Math.random() - 0.5) * v.shake; sy = (Math.random() - 0.5) * v.shake; }
  v.shake = Math.max(0, v.shake - 0.6);

  // World → screen: the hero stays centred.
  c.translate(v.w / 2 + sx, v.h / 2 + sy);
  c.scale(v.zoom, v.zoom);
  c.translate(-p.x, -p.y);
  const halfW = v.w / 2 / v.zoom, halfH = v.h / 2 / v.zoom;
  const left = p.x - halfW, right = p.x + halfW, top = p.y - halfH, bottom = p.y + halfH;

  // Ruled lines across endless paper.
  c.strokeStyle = RULE;
  c.lineWidth = 1.5 / v.zoom;
  c.beginPath();
  for (let y = Math.floor(top / LINE_GAP) * LINE_GAP; y <= bottom; y += LINE_GAP) { c.moveTo(left, y); c.lineTo(right, y); }
  c.stroke();
  // Little doodles dotted around, the same every time you pass.
  for (let tx = Math.floor(left / DECOR_TILE); tx <= Math.floor(right / DECOR_TILE); tx++) {
    for (let ty = Math.floor(top / DECOR_TILE); ty <= Math.floor(bottom / DECOR_TILE); ty++) {
      const h = hashString(`${tx},${ty}`);
      if (h % 3 !== 0) continue;
      doodleDecor(c, h % 4, tx * DECOR_TILE + (h % 300) + 60, ty * DECOR_TILE + ((h >> 8) % 300) + 60, h);
    }
  }

  const visible = (x: number, y: number, r: number) => x + r > left && x - r < right && y + r > top && y - r < bottom;

  // Ink puddles under everything.
  for (const fx of g.effects) {
    if (fx.kind !== 'puddle' || !visible(fx.x, fx.y, fx.radius)) continue;
    c.fillStyle = `rgba(31, 58, 138, ${0.22 * Math.min(1, fx.life * 2)})`;
    c.beginPath(); c.ellipse(fx.x, fx.y, fx.radius, fx.radius * 0.8, 0.3, 0, Math.PI * 2); c.fill();
  }

  for (const gem of g.gems) {
    if (!visible(gem.x, gem.y, 12)) continue;
    blit(c, sprites.gem[gem.value >= 8 ? 2 : gem.value >= 3 ? 1 : 0], gem.x, gem.y, frame);
  }
  for (const coin of g.coins) if (visible(coin.x, coin.y, 12)) blit(c, sprites.coin, coin.x, coin.y, frame);

  // Enemies, lower ones drawn last so they overlap naturally.
  const sorted = g.enemies.filter((e) => visible(e.x, e.y, e.radius * 1.5)).sort((a, b) => a.y - b.y);
  for (const e of sorted) {
    const s = sprites.enemy[e.def.id];
    const scale = e.radius / e.def.radius;
    if (e.elite) {
      c.strokeStyle = 'rgba(224,71,76,0.55)'; c.lineWidth = 3;
      c.beginPath(); c.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2); c.stroke();
    }
    blit(c, s, e.x, e.y, frame + e.uid, scale, 0, 1);
    if (e.flash > 0) {
      c.globalAlpha = 0.6;
      c.fillStyle = '#FFFDF6';
      c.beginPath(); c.arc(e.x, e.y, e.radius, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }

  // Splash rings and ruler swings.
  for (const fx of g.effects) {
    const k = 1 - fx.life / fx.maxLife;
    if (fx.kind === 'splash') {
      c.strokeStyle = `rgba(224, 71, 76, ${0.7 * (1 - k)})`;
      c.lineWidth = 10 * (1 - k) + 2;
      c.beginPath(); c.arc(fx.x, fx.y, fx.radius * (0.4 + 0.6 * k), 0, Math.PI * 2); c.stroke();
    } else if (fx.kind === 'ruler') {
      c.strokeStyle = `rgba(62, 158, 87, ${0.75 * (1 - k)})`;
      c.lineWidth = 14;
      c.beginPath(); c.arc(fx.x, fx.y, fx.radius * 0.75, fx.angle - Math.PI / 3, fx.angle - Math.PI / 3 + (2 * Math.PI / 3) * Math.min(1, k * 1.6)); c.stroke();
    }
  }

  // The hero. Blinks while briefly invulnerable.
  const blink = p.invulnerable > 0 && Math.floor(g.t * 20) % 2 === 0;
  const facingLeft = p.faceX < -0.1;
  c.fillStyle = 'rgba(45,43,51,0.12)';
  c.beginPath(); c.ellipse(p.x, p.y + BASE.radius + 4, BASE.radius, BASE.radius * 0.35, 0, 0, Math.PI * 2); c.fill();
  c.save();
  c.translate(p.x, p.y);
  if (facingLeft) c.scale(-1, 1);
  blit(c, heroSprite, 0, 0, frame, 1, 0, blink ? 0.35 : 1);
  c.restore();

  // Orbiting erasers.
  const orbit = g.weapons.find((w) => w.id === 'orbit');
  if (orbit) {
    const st = WEAPONS.orbit.levels[orbit.level - 1];
    for (let k = 0; k < st.count; k++) {
      const a = g.t * 3 + (k * Math.PI * 2) / st.count;
      blit(c, sprites.orbit, p.x + Math.cos(a) * st.area, p.y + Math.sin(a) * st.area, frame, 1, a);
    }
  }

  for (const pr of g.projectiles) {
    if (!visible(pr.x, pr.y, 20)) continue;
    blit(c, pr.kind === 'dart' ? sprites.dart : sprites.plane, pr.x, pr.y, frame, 1, Math.atan2(pr.vy, pr.vx));
  }

  // Hand-written damage numbers; crits are bigger, red and underlined.
  c.textAlign = 'center';
  for (const f of g.floaters) {
    c.globalAlpha = Math.min(1, f.life * 2.5);
    c.font = `${f.crit ? 28 : 19}px "Patrick Hand", cursive`;
    c.fillStyle = f.crit ? '#E0474C' : '#2D2B33';
    c.fillText(f.text, f.x, f.y);
    if (f.crit) {
      const w = c.measureText(f.text).width;
      c.strokeStyle = '#E0474C'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(f.x - w / 2, f.y + 4); c.lineTo(f.x + w / 2, f.y + 3); c.stroke();
    }
  }
  c.globalAlpha = 1;
}

export function bump(v: View, amount: number) {
  v.shake = Math.min(14, v.shake + amount);
}
