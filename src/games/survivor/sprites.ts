/* Scribble Siege — doodle art, drawn in code.
   Every sprite is sketched three times with a little random wobble; cycling
   the three frames gives the "boiling line" look of hand-drawn animation. */

import { mulberry32 } from '../../lib/rng';
import type { EnemyId, HeroId } from './data';

export const FRAMES = 3;
const INK = '#2D2B33';

type Rand = () => number;
type Draw = (c: CanvasRenderingContext2D, r: Rand, s: number) => void;

/** A sprite: frames drawn at 2× for sharpness, `size` world units across. */
export interface Sprite { frames: HTMLCanvasElement[]; size: number }

function sprite(size: number, seed: number, draw: Draw): Sprite {
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(size * 2);
    const c = cv.getContext('2d')!;
    c.scale(2, 2);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    draw(c, mulberry32(seed * 31 + f), size);
    frames.push(cv);
  }
  return { frames, size };
}

/** A wobbly line through points, like a quick pencil stroke. */
function stroke(c: CanvasRenderingContext2D, r: Rand, pts: [number, number][], j = 1.2, close = false) {
  c.beginPath();
  pts.forEach(([x, y], k) => {
    const px = x + (r() - 0.5) * j, py = y + (r() - 0.5) * j;
    if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
  });
  if (close) c.closePath();
}

function wobblyCircle(c: CanvasRenderingContext2D, r: Rand, cx: number, cy: number, rad: number, j = 1.4) {
  const pts: [number, number][] = [];
  const n = 18;
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2;
    const rr = rad + (r() - 0.5) * j * 2;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  stroke(c, r, pts, 0.6);
}

function eyes(c: CanvasRenderingContext2D, r: Rand, cx: number, cy: number, gap: number, size: number, angry = true) {
  c.fillStyle = INK;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.arc(cx + sx * gap + (r() - 0.5), cy + (r() - 0.5), size, 0, Math.PI * 2);
    c.fill();
    if (angry) {
      stroke(c, r, [[cx + sx * (gap + size * 1.6), cy - size * 2.4], [cx + sx * gap * 0.3, cy - size * 1.2]], 0.6);
      c.stroke();
    }
  }
}

/* ---------- enemies ---------- */

const enemyArt: Record<EnemyId, Draw> = {
  scribble(c, r, s) {
    const m = s / 2;
    c.strokeStyle = INK; c.lineWidth = 2;
    // A tangle of loops inside a rough circle.
    for (let k = 0; k < 7; k++) {
      const pts: [number, number][] = [];
      for (let q = 0; q < 6; q++) {
        const a = r() * Math.PI * 2, d = r() * s * 0.4;
        pts.push([m + Math.cos(a) * d, m + Math.sin(a) * d]);
      }
      stroke(c, r, pts, 2);
      c.stroke();
    }
    c.fillStyle = '#FFFDF6';
    c.beginPath(); c.arc(m, m - 1, s * 0.2, 0, Math.PI * 2); c.fill();
    eyes(c, r, m, m - 1, s * 0.09, s * 0.055);
  },
  squiggle(c, r, s) {
    const m = s / 2;
    c.strokeStyle = '#7A55C4'; c.lineWidth = s * 0.16;
    const pts: [number, number][] = [];
    for (let k = 0; k <= 10; k++) pts.push([s * 0.12 + (k / 10) * s * 0.76, m + Math.sin(k * 1.3) * s * 0.18]);
    stroke(c, r, pts, 1.2); c.stroke();
    c.fillStyle = '#FFFDF6';
    c.beginPath(); c.arc(s * 0.8, m + Math.sin(13) * s * 0.18, s * 0.14, 0, Math.PI * 2); c.fill();
    eyes(c, r, s * 0.8, m + Math.sin(13) * s * 0.18, s * 0.06, s * 0.04);
  },
  stickman(c, r, s) {
    const m = s / 2;
    c.strokeStyle = INK; c.lineWidth = 2;
    wobblyCircle(c, r, m, s * 0.28, s * 0.15); c.stroke();
    stroke(c, r, [[m, s * 0.43], [m, s * 0.7]]); c.stroke();
    stroke(c, r, [[m - s * 0.2, s * 0.5], [m, s * 0.53], [m + s * 0.2, s * 0.46]]); c.stroke();
    stroke(c, r, [[m - s * 0.15, s * 0.92], [m, s * 0.7], [m + s * 0.15, s * 0.92]]); c.stroke();
    eyes(c, r, m, s * 0.29, s * 0.055, s * 0.03);
  },
  bat(c, r, s) {
    const m = s / 2;
    c.strokeStyle = INK; c.lineWidth = 1.6; c.fillStyle = '#F2EEE3';
    stroke(c, r, [[m, m - s * 0.1], [s * 0.08, m - s * 0.25], [s * 0.2, m + s * 0.05], [s * 0.1, m + s * 0.15], [m, m + s * 0.18],
      [s * 0.9, m + s * 0.15], [s * 0.8, m + s * 0.05], [s * 0.92, m - s * 0.25]], 1, true);
    c.fill(); c.stroke();
    // Ruled lines: it's folded from homework.
    c.strokeStyle = 'rgba(47,99,200,.35)'; c.lineWidth = 1;
    for (const y of [m - s * 0.05, m + s * 0.06]) { stroke(c, r, [[s * 0.22, y], [s * 0.78, y]], 0.5); c.stroke(); }
    eyes(c, r, m, m, s * 0.07, s * 0.035);
  },
  blot(c, r, s) {
    const m = s / 2;
    c.fillStyle = '#1F3A8A';
    const pts: [number, number][] = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2, d = s * (0.32 + r() * 0.12);
      pts.push([m + Math.cos(a) * d, m + Math.sin(a) * d]);
    }
    stroke(c, r, pts, 1.5, true); c.fill();
    for (let k = 0; k < 3; k++) {
      c.beginPath(); c.arc(m + (r() - 0.5) * s * 0.9, m + (r() - 0.5) * s * 0.9, s * 0.04, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#FFFDF6';
    for (const sx of [-1, 1]) { c.beginPath(); c.arc(m + sx * s * 0.1, m - s * 0.05, s * 0.065, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = INK;
    for (const sx of [-1, 1]) { c.beginPath(); c.arc(m + sx * s * 0.1, m - s * 0.04, s * 0.03, 0, Math.PI * 2); c.fill(); }
  },
  eraser(c, r, s) {
    c.strokeStyle = INK; c.lineWidth = 3; c.fillStyle = '#F2A3B8';
    stroke(c, r, [[s * 0.12, s * 0.28], [s * 0.88, s * 0.2], [s * 0.9, s * 0.78], [s * 0.1, s * 0.82]], 2, true);
    c.fill(); c.stroke();
    c.fillStyle = '#3F7FD8';
    stroke(c, r, [[s * 0.5, s * 0.24], [s * 0.88, s * 0.2], [s * 0.9, s * 0.78], [s * 0.5, s * 0.8]], 1.5, true);
    c.fill(); c.stroke();
    c.fillStyle = '#FFFDF6'; c.font = `bold ${s * 0.11}px sans-serif`; c.textAlign = 'center';
    c.fillText('ERASE', s * 0.69, s * 0.54);
    eyes(c, r, s * 0.3, s * 0.48, s * 0.07, s * 0.035);
    stroke(c, r, [[s * 0.2, s * 0.66], [s * 0.3, s * 0.62], [s * 0.4, s * 0.66]], 1); c.stroke();
  },
};

/* ---------- heroes ---------- */

function face(c: CanvasRenderingContext2D, r: Rand, cx: number, cy: number, s: number) {
  c.fillStyle = INK;
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(cx + sx * s * 0.06, cy, s * 0.03, 0, Math.PI * 2); c.fill(); }
  c.lineWidth = 1.6;
  stroke(c, r, [[cx - s * 0.07, cy + s * 0.06], [cx, cy + s * 0.1], [cx + s * 0.07, cy + s * 0.06]], 0.5); c.stroke();
}

function legs(c: CanvasRenderingContext2D, r: Rand, s: number, y: number) {
  c.strokeStyle = INK; c.lineWidth = 2;
  stroke(c, r, [[s * 0.42, y], [s * 0.38, s * 0.95]]); c.stroke();
  stroke(c, r, [[s * 0.58, y], [s * 0.62, s * 0.95]]); c.stroke();
}

const heroArt: Record<Exclude<HeroId, 'custom'>, Draw> = {
  pip(c, r, s) {
    legs(c, r, s, s * 0.78);
    c.strokeStyle = INK; c.lineWidth = 2;
    c.fillStyle = '#F2C14E';
    stroke(c, r, [[s * 0.33, s * 0.3], [s * 0.67, s * 0.3], [s * 0.67, s * 0.8], [s * 0.33, s * 0.8]], 1, true); c.fill(); c.stroke();
    c.fillStyle = '#F2A3B8';
    stroke(c, r, [[s * 0.33, s * 0.3], [s * 0.67, s * 0.3], [s * 0.66, s * 0.16], [s * 0.34, s * 0.16]], 1, true); c.fill(); c.stroke();
    c.fillStyle = '#E8D9B5';
    stroke(c, r, [[s * 0.33, s * 0.8], [s * 0.67, s * 0.8], [s * 0.5, s * 0.97]], 1, true); c.fill(); c.stroke();
    face(c, r, s * 0.5, s * 0.47, s);
  },
  ed(c, r, s) {
    legs(c, r, s, s * 0.8);
    c.strokeStyle = INK; c.lineWidth = 2; c.fillStyle = '#F2A3B8';
    stroke(c, r, [[s * 0.22, s * 0.3], [s * 0.78, s * 0.26], [s * 0.8, s * 0.8], [s * 0.2, s * 0.82]], 1.4, true); c.fill(); c.stroke();
    face(c, r, s * 0.5, s * 0.5, s);
  },
  mo(c, r, s) {
    legs(c, r, s, s * 0.82);
    c.strokeStyle = INK; c.lineWidth = 2; c.fillStyle = '#3F7FD8';
    stroke(c, r, [[s * 0.32, s * 0.14], [s * 0.68, s * 0.14], [s * 0.68, s * 0.36], [s * 0.32, s * 0.36]], 1, true); c.fill(); c.stroke();
    c.fillStyle = '#F4F1E8';
    stroke(c, r, [[s * 0.32, s * 0.36], [s * 0.68, s * 0.36], [s * 0.68, s * 0.84], [s * 0.32, s * 0.84]], 1, true); c.fill(); c.stroke();
    face(c, r, s * 0.5, s * 0.55, s);
  },
  rae(c, r, s) {
    legs(c, r, s, s * 0.84);
    c.strokeStyle = INK; c.lineWidth = 2; c.fillStyle = '#7CC48D';
    stroke(c, r, [[s * 0.36, s * 0.08], [s * 0.64, s * 0.08], [s * 0.64, s * 0.86], [s * 0.36, s * 0.86]], 1, true); c.fill(); c.stroke();
    c.lineWidth = 1.2;
    for (let k = 1; k < 8; k++) { const y = s * (0.08 + k * 0.1); stroke(c, r, [[s * 0.36, y], [s * (k % 2 ? 0.44 : 0.48), y]], 0.4); c.stroke(); }
    face(c, r, s * 0.53, s * 0.45, s);
  },
};

/* ---------- small things ---------- */

const gemArt = (colour: string): Draw => (c, r, s) => {
  // A pencil shaving: a little curl.
  c.strokeStyle = colour; c.lineWidth = s * 0.16;
  const pts: [number, number][] = [];
  for (let k = 0; k <= 8; k++) { const a = k * 0.8; pts.push([s / 2 + Math.cos(a) * s * (0.12 + k * 0.03), s / 2 + Math.sin(a) * s * (0.12 + k * 0.03)]); }
  stroke(c, r, pts, 0.6); c.stroke();
};

const coinArt: Draw = (c, r, s) => {
  c.fillStyle = '#FFD84D'; c.strokeStyle = INK; c.lineWidth = 1.6;
  wobblyCircle(c, r, s / 2, s / 2, s * 0.36, 0.8); c.fill(); c.stroke();
  c.fillStyle = INK; c.font = `bold ${s * 0.45}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('¢', s / 2, s / 2 + 1);
};

const dartArt: Draw = (c, r, s) => {
  c.strokeStyle = INK; c.lineWidth = 1.4; c.fillStyle = '#F2C14E';
  stroke(c, r, [[s * 0.1, s * 0.42], [s * 0.7, s * 0.42], [s * 0.7, s * 0.58], [s * 0.1, s * 0.58]], 0.6, true); c.fill(); c.stroke();
  c.fillStyle = '#E8D9B5';
  stroke(c, r, [[s * 0.7, s * 0.42], [s * 0.95, s * 0.5], [s * 0.7, s * 0.58]], 0.5, true); c.fill(); c.stroke();
};

const planeArt: Draw = (c, r, s) => {
  c.strokeStyle = INK; c.lineWidth = 1.5; c.fillStyle = '#FFFDF6';
  stroke(c, r, [[s * 0.95, s * 0.5], [s * 0.08, s * 0.18], [s * 0.3, s * 0.5], [s * 0.08, s * 0.82]], 0.8, true); c.fill(); c.stroke();
  stroke(c, r, [[s * 0.95, s * 0.5], [s * 0.3, s * 0.5]], 0.5); c.stroke();
};

const orbitArt: Draw = (c, r, s) => {
  c.strokeStyle = INK; c.lineWidth = 1.5; c.fillStyle = '#F2A3B8';
  stroke(c, r, [[s * 0.15, s * 0.3], [s * 0.85, s * 0.25], [s * 0.88, s * 0.72], [s * 0.12, s * 0.76]], 1, true); c.fill(); c.stroke();
};

/* ---------- the sprite set ---------- */

export interface SpriteSet {
  enemy: Record<EnemyId, Sprite>;
  hero: Partial<Record<HeroId, Sprite>>;
  gem: Sprite[]; // small, medium, large
  coin: Sprite;
  dart: Sprite;
  plane: Sprite;
  orbit: Sprite;
}

/** Draws every sprite once. Enemy sprite size follows its body radius. */
export function buildSprites(radii: Record<EnemyId, number>): SpriteSet {
  const enemy = Object.fromEntries(
    (Object.keys(enemyArt) as EnemyId[]).map((id, k) => [id, sprite(radii[id] * 3.4, 100 + k, enemyArt[id])]),
  ) as Record<EnemyId, Sprite>;
  const hero = Object.fromEntries(
    (Object.keys(heroArt) as (keyof typeof heroArt)[]).map((id, k) => [id, sprite(56, 200 + k, heroArt[id])]),
  ) as Partial<Record<HeroId, Sprite>>;
  return {
    enemy,
    hero,
    gem: ['#3F7FD8', '#3E9E57', '#F08A24'].map((col, k) => sprite(18 + k * 5, 300 + k, gemArt(col))),
    coin: sprite(22, 310, coinArt),
    dart: sprite(26, 320, dartArt),
    plane: sprite(32, 330, planeArt),
    orbit: sprite(32, 340, orbitArt),
  };
}

/** Turns the player's drawing into a hero sprite (one frame, upright). */
export async function customHeroSprite(dataUrl: string): Promise<Sprite> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const size = 58;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size * 2;
  const c = cv.getContext('2d')!;
  const scale = Math.min((size * 2) / img.width, (size * 2) / img.height);
  const w = img.width * scale, h = img.height * scale;
  c.drawImage(img, (size * 2 - w) / 2, (size * 2 - h) / 2, w, h);
  return { frames: [cv, cv, cv], size };
}

/** A small doodle for the endless paper: stars, swirls, smileys. */
export function doodleDecor(c: CanvasRenderingContext2D, kind: number, x: number, y: number, seed: number) {
  const r = mulberry32(seed);
  c.save();
  c.strokeStyle = 'rgba(45,43,51,0.13)';
  c.lineWidth = 2;
  c.lineCap = 'round';
  if (kind === 0) {
    // star
    const pts: [number, number][] = [];
    for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const d = k % 2 ? 9 : 22; pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]); }
    stroke(c, r, pts, 1.5); c.stroke();
  } else if (kind === 1) {
    // spiral
    const pts: [number, number][] = [];
    for (let k = 0; k < 40; k++) { const a = k * 0.45; pts.push([x + Math.cos(a) * k * 0.7, y + Math.sin(a) * k * 0.7]); }
    stroke(c, r, pts, 0.8); c.stroke();
  } else if (kind === 2) {
    // smiley
    wobblyCircle(c, r, x, y, 18); c.stroke();
    c.fillStyle = 'rgba(45,43,51,0.13)';
    c.beginPath(); c.arc(x - 6, y - 4, 2, 0, Math.PI * 2); c.arc(x + 6, y - 4, 2, 0, Math.PI * 2); c.fill();
    stroke(c, r, [[x - 8, y + 5], [x, y + 10], [x + 8, y + 5]], 0.6); c.stroke();
  } else {
    // a little heart
    stroke(c, r, [[x, y + 12], [x - 14, y - 2], [x - 8, y - 12], [x, y - 4], [x + 8, y - 12], [x + 14, y - 2], [x, y + 12]], 1.2); c.stroke();
  }
  c.restore();
}
