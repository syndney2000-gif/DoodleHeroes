/* Original CC0 cues; shared, gesture-unlocked Web Audio engine.
   Architecture informed by ../casino/web/src/lib/sfx.ts; no casino samples. */
import { load, save } from './storage';
export type Cue = 'tap' | 'place' | 'draw' | 'merge' | 'discover' | 'deliver' | 'levelup' | 'invalid' | 'erase' | 'hint' | 'solved';
let ctx: AudioContext | undefined;
let bus: GainNode | undefined;
const buffers = new Map<Cue, AudioBuffer>();
const pending = new Map<Cue, Promise<AudioBuffer | undefined>>();
const last = new Map<Cue, number>();
let enabled = load<boolean>('settings:sound') ?? load<boolean>('scribble-siege:sound') ?? true;
let volume = Math.min(1, Math.max(0, load<number>('settings:volume') ?? .65));
let generation = 0;

function context() {
  if (ctx || typeof window === 'undefined') return ctx;
  try {
    const Constructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return;
    ctx = new Constructor();
    bus = ctx.createGain();
    bus.gain.value = enabled && !document.hidden ? volume : 0;
    bus.connect(ctx.destination);
  } catch { /* Games keep working if audio is unavailable. */ }
  return ctx;
}
async function buffer(cue: Cue) {
  if (buffers.has(cue)) return buffers.get(cue);
  if (pending.has(cue)) return pending.get(cue);
  const c = context();
  if (!c) return;
  const task = (async () => {
    try {
      const response = await fetch(`/audio/${cue}.wav`);
      if (!response.ok) return;
      const result = await c.decodeAudioData(await response.arrayBuffer());
      buffers.set(cue, result);
      return result;
    } catch { return undefined; }
    finally { pending.delete(cue); }
  })();
  pending.set(cue, task);
  return task;
}
export function unlockAudio() {
  const c = context();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  for (const cue of ['tap', 'place', 'draw', 'merge', 'discover', 'deliver', 'levelup', 'invalid', 'erase', 'hint', 'solved'] as Cue[]) void buffer(cue);
}
export function soundOn() { return enabled; }
export function soundVolume() { return volume; }
function mix() {
  generation++;
  if (ctx && bus) {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(enabled && !document.hidden ? volume : 0, ctx.currentTime, .015);
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('dh:audio-change'));
}
export function setSound(on: boolean) {
  enabled = on;
  save('settings:sound', on);
  save('scribble-siege:sound', on);
  mix();
}
export function setVolume(value: number) {
  volume = Math.min(1, Math.max(0, value));
  save('settings:volume', volume);
  mix();
}
export function playSound(cue: Cue, delay = 0) {
  if (!enabled || typeof document === 'undefined' || document.hidden) return;
  const c = context();
  if (!c || c.state !== 'running' || !bus) return;
  const now = c.currentTime;
  if (now - (last.get(cue) ?? -1) < .065) return;
  last.set(cue, now);
  const request = generation;
  const play = (b: AudioBuffer) => {
    if (!enabled || document.hidden || request !== generation || !bus) return;
    const source = c.createBufferSource();
    source.buffer = b;
    source.connect(bus);
    source.start(c.currentTime + delay);
    source.onended = () => source.disconnect();
  };
  const ready = buffers.get(cue);
  if (ready) play(ready);
  else void buffer(cue).then(b => { if (b && c.currentTime - now < .12) play(b); });
}
/** Original synthesis for high-frequency Siege events on the same master bus. */
export function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = .08, slide?: number, delay = 0) {
  const c = context();
  if (!enabled || !c || !bus || c.state !== 'running' || document.hidden) return;
  const at = c.currentTime + delay;
  const oscillator = c.createOscillator();
  const envelope = c.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, at);
  if (slide) oscillator.frequency.linearRampToValueAtTime(slide, at + duration);
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(gain, at + .008);
  envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
  oscillator.connect(envelope); envelope.connect(bus);
  oscillator.start(at); oscillator.stop(at + duration);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}
if (typeof window !== 'undefined') {
  for (const event of ['pointerdown', 'keydown'] as const) window.addEventListener(event, unlockAudio, { passive: true });
  document.addEventListener('visibilitychange', () => {
    mix();
    if (document.hidden) void ctx?.suspend().catch(() => {});
    else if (enabled && ctx?.state === 'suspended') void ctx.resume().catch(() => {});
  });
}
