/* Doodle Guess — turns strokes into pencil lines and draws a fraction of a
   drawing's ink, so the picture appears the way someone would sketch it. */

import { hashString, mulberry32 } from '../../lib/rng';
import type { Drawing, Stroke } from './drawings';

type Pt = [number, number];

/** Points along a stroke, close enough together to draw it smoothly. */
export function strokePoints(s: Stroke): Pt[] {
  const ring = (x: number, y: number, rx: number, ry: number, from: number, to: number) => {
    const steps = Math.max(6, Math.ceil(Math.abs(to - from) / 10));
    return Array.from({ length: steps + 1 }, (_, k) => {
      const a = ((from + ((to - from) * k) / steps) * Math.PI) / 180;
      return [x + Math.cos(a) * rx, y + Math.sin(a) * ry] as Pt;
    });
  };
  switch (s.t) {
    case 'l': {
      const pts: Pt[] = [];
      for (let k = 0; k + 1 < s.p.length; k += 2) pts.push([s.p[k], s.p[k + 1]]);
      if (s.close) pts.push(pts[0]);
      return pts;
    }
    case 'c': return ring(s.x, s.y, s.r, s.r, 0, 360);
    case 'e': return ring(s.x, s.y, s.rx, s.ry, 0, 360);
    case 'a': return ring(s.x, s.y, s.r, s.r, s.from, s.to);
    case 'q': {
      const [x0, y0, cx, cy, x1, y1] = s.p;
      return Array.from({ length: 13 }, (_, k) => {
        const t = k / 12, u = 1 - t;
        return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1] as Pt;
      });
    }
  }
}

const segLength = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Total ink in a drawing, in page units. */
export function inkLength(d: Drawing): number {
  let total = 0;
  for (const s of d.strokes) {
    const pts = strokePoints(s);
    for (let k = 1; k < pts.length; k++) total += segLength(pts[k - 1], pts[k]);
  }
  return total;
}

/** Draws the first `fraction` of the drawing's ink into a square canvas. */
export function drawInk(canvas: HTMLCanvasElement, d: Drawing, fraction: number) {
  const c = canvas.getContext('2d')!;
  const size = canvas.width;
  const scale = size / 100;
  c.clearRect(0, 0, size, size);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = '#2D2B33';
  c.lineWidth = Math.max(2, size / 110);
  // The same wobble every time this drawing is shown.
  const rand = mulberry32(hashString(d.id));
  let budget = inkLength(d) * Math.max(0, Math.min(1, fraction));
  for (const s of d.strokes) {
    const pts = strokePoints(s).map(([x, y]) => [x + (rand() - 0.5) * 0.9, y + (rand() - 0.5) * 0.9] as Pt);
    if (budget <= 0) break;
    c.beginPath();
    c.moveTo(pts[0][0] * scale, pts[0][1] * scale);
    for (let k = 1; k < pts.length && budget > 0; k++) {
      const len = segLength(pts[k - 1], pts[k]);
      if (len <= budget) {
        c.lineTo(pts[k][0] * scale, pts[k][1] * scale);
        budget -= len;
      } else {
        const t = budget / len;
        c.lineTo((pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t) * scale, (pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t) * scale);
        budget = 0;
      }
    }
    c.stroke();
  }
}
