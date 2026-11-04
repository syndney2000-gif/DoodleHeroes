/* Game feel shared by every board: pops, sparkles, confetti, rising chimes
   and phone haptics. Everything is optional decoration — each effect checks
   reduced motion (or the haptics setting) and quietly does nothing. */

import { tone } from './audio';
import { load } from './storage';

const calm = () => document.documentElement.hasAttribute('data-reduced-motion');

export function hapticsOn(): boolean {
  return load<boolean>('settings:haptics') ?? true;
}

/** A short vibration on phones that support it. */
export function buzz(pattern: number | number[] = 12): void {
  if (!hapticsOn() || calm()) return;
  try { navigator.vibrate?.(pattern); } catch { /* Not every browser allows it. */ }
}

/** A springy scale bounce. Works on HTML and SVG elements. */
export function pop(el: Element, scale = 1.14): void {
  if (calm() || !(el as HTMLElement).animate) return;
  if (el instanceof SVGElement) (el as SVGElement).style.transformBox = 'fill-box';
  (el as HTMLElement).style.transformOrigin = 'center';
  (el as HTMLElement).animate(
    [{ transform: 'scale(1)' }, { transform: `scale(${scale})`, offset: .35 }, { transform: 'scale(.97)', offset: .7 }, { transform: 'scale(1)' }],
    { duration: 360, easing: 'cubic-bezier(.3,1.5,.5,1)' },
  );
}

/** A small sideways wobble for "not quite". */
export function wiggle(el: Element): void {
  if (calm() || !(el as HTMLElement).animate) return;
  (el as HTMLElement).animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }],
    { duration: 320, easing: 'ease-out' },
  );
}

/* ---------- notes ---------- */

// A major pentatonic run, so any sequence of chimes sounds like a tune.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

/** One bright note; higher steps climb the scale, so a streak becomes a melody. */
export function chime(step: number): void {
  const f = SCALE[Math.min(SCALE.length - 1, Math.max(0, step))];
  tone(f, .22, 'triangle', .05);
  tone(f * 2, .12, 'sine', .015, undefined, .01);
}

/** A little rising arpeggio for a finished puzzle. */
export function fanfare(): void {
  [0, 2, 4, 5, 7].forEach((s, k) => tone(SCALE[s], .3, 'triangle', .055, undefined, k * .09));
  tone(SCALE[9], .6, 'sine', .03, undefined, .5);
}

/* ---------- particles ---------- */

interface Particle {
  x: number; y: number; vx: number; vy: number; g: number;
  life: number; max: number; size: number; color: string; spin: number; angle: number;
  shape: 'star' | 'dot' | 'paper';
}

const COLORS = ['#F2C14E', '#E98A6A', '#7FB685', '#6CB4C4', '#B79CD9', '#F6A5C0'];
let canvas: HTMLCanvasElement | undefined;
let ctx2d: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let raf = 0;
let lastFrame = 0;

function layer() {
  if (canvas) return ctx2d;
  canvas = document.createElement('canvas');
  canvas.className = 'juice-layer';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '90' });
  document.body.append(canvas);
  ctx2d = canvas.getContext('2d');
  return ctx2d;
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  ctx2d?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawStar(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  for (let k = 0; k < 8; k++) {
    const rad = k % 2 ? r * .42 : r;
    const a = (k * Math.PI) / 4;
    c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  c.closePath();
  c.fill();
}

function frame(t: number) {
  const c = ctx2d;
  if (!c || !canvas) return;
  const dt = Math.min(48, t - (lastFrame || t)) / 16.67;
  lastFrame = t;
  resize();
  c.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => (p.life += dt) < p.max && p.y < innerHeight + 40);
  for (const p of particles) {
    p.vy += p.g * dt;
    p.vx *= p.shape === 'paper' ? .985 : .96;
    p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.spin * dt;
    const fade = Math.min(1, (p.max - p.life) / 14);
    c.save();
    c.globalAlpha = fade;
    c.translate(p.x, p.y);
    c.rotate(p.angle);
    c.fillStyle = p.color;
    if (p.shape === 'star') drawStar(c, p.size);
    else if (p.shape === 'paper') { c.scale(1, Math.cos(p.angle * 2)); c.fillRect(-p.size, -p.size * .55, p.size * 2, p.size * 1.1); }
    else { c.beginPath(); c.arc(0, 0, p.size * .6, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  if (particles.length) raf = requestAnimationFrame(frame);
  else { raf = 0; lastFrame = 0; c.clearRect(0, 0, innerWidth, innerHeight); }
}

function run() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function centre(at: Element | { x: number; y: number }) {
  if ('x' in at && 'y' in at && !(at instanceof Element)) return at;
  const r = (at as Element).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** A small burst of stars from an element (or a screen point). */
export function sparkle(at: Element | { x: number; y: number }, count = 9, colors = COLORS): void {
  if (calm() || !layer()) return;
  const { x, y } = centre(at);
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + Math.random() * .5;
    const speed = 2.2 + Math.random() * 2.6;
    particles.push({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 1.2, g: .12,
      life: 0, max: 30 + Math.random() * 16, size: 3 + Math.random() * 3.5,
      color: colors[(Math.random() * colors.length) | 0], spin: (Math.random() - .5) * .3, angle: 0,
      shape: Math.random() < .7 ? 'star' : 'dot',
    });
  }
  run();
}

/** Paper confetti across the whole screen. */
export function confetti(pieces = 140): void {
  if (calm() || !layer()) return;
  const w = innerWidth;
  for (let k = 0; k < pieces; k++) {
    const fromLeft = k % 2 === 0;
    particles.push({
      x: fromLeft ? -10 : w + 10, y: innerHeight * (.35 + Math.random() * .35),
      vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 9), vy: -(9 + Math.random() * 9), g: .32,
      life: 0, max: 150 + Math.random() * 60, size: 4 + Math.random() * 4,
      color: COLORS[(Math.random() * COLORS.length) | 0], spin: (Math.random() - .5) * .35, angle: Math.random() * 6,
      shape: Math.random() < .8 ? 'paper' : 'star',
    });
  }
  run();
}
