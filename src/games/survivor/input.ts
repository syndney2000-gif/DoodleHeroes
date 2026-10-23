/* Scribble Siege — controls. Keys on a keyboard; on a touch screen (or with
   a mouse drag) a joystick appears wherever the press starts. */

export interface Controls {
  /** Current stick direction, length 0–1. */
  vector(): { x: number; y: number };
  onPause(fn: () => void): void;
  dispose(): void;
}

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export function makeControls(surface: HTMLElement, base: HTMLElement, knob: HTMLElement): Controls {
  const held = new Set<string>();
  let stick: { id: number; x: number; y: number; dx: number; dy: number } | null = null;
  const RADIUS = 56;
  let pauseFn = () => {};

  const keydown = (e: KeyboardEvent) => {
    if (KEYS[e.code]) { held.add(e.code); e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); pauseFn(); }
  };
  const keyup = (e: KeyboardEvent) => { held.delete(e.code); };
  const blur = () => { held.clear(); stick = null; base.hidden = true; };

  const down = (e: PointerEvent) => {
    if (stick || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // Presses on buttons and menus (pause, level-up cards, report card) must
    // reach them; capturing the pointer here would swallow their clicks.
    if ((e.target as Element).closest('button, a, .sg-overlay')) return;
    surface.setPointerCapture(e.pointerId);
    stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    const r = surface.getBoundingClientRect();
    base.style.left = `${e.clientX - r.left}px`;
    base.style.top = `${e.clientY - r.top}px`;
    knob.style.transform = 'translate(-50%, -50%)';
    base.hidden = false;
  };
  const move = (e: PointerEvent) => {
    if (!stick || e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.x, dy = e.clientY - stick.y;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { dx = (dx / d) * RADIUS; dy = (dy / d) * RADIUS; }
    stick.dx = dx / RADIUS;
    stick.dy = dy / RADIUS;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  const up = (e: PointerEvent) => {
    if (!stick || e.pointerId !== stick.id) return;
    stick = null;
    base.hidden = true;
  };

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', blur);
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointercancel', up);

  return {
    vector() {
      if (stick) return { x: stick.dx, y: stick.dy };
      let x = 0, y = 0;
      for (const code of held) { x += KEYS[code][0]; y += KEYS[code][1]; }
      const d = Math.hypot(x, y);
      return d ? { x: x / d, y: y / d } : { x: 0, y: 0 };
    },
    onPause(fn) { pauseFn = fn; },
    dispose() {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerup', up);
      surface.removeEventListener('pointercancel', up);
    },
  };
}
