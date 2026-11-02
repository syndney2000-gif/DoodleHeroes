import { afterEach, beforeEach, expect, test, vi } from 'vitest';

// Exercise the audio lifecycle: mute and tab visibility must silence already
// queued work, not just prevent the next button click.
let listeners: Record<string, (() => void)[]>;
let stored: Map<string, string>;
let starts: number[];
let contexts: number;
let resumes: number;
let suspended: number;
let gain: { value: number; cancelScheduledValues: ReturnType<typeof vi.fn>; setTargetAtTime: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.resetModules(); listeners = {}; stored = new Map(); starts = []; contexts = 0; resumes = 0; suspended = 0;
  gain = { value: 1, cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() };
  class Context {
    state = 'suspended'; currentTime = 10;
    constructor() { contexts++; }
    createGain() { return { gain, connect() {} }; }
    createBufferSource() { return { buffer: null, connect() {}, disconnect() {}, start(at: number) { starts.push(at); } }; }
    resume() { resumes++; this.state = 'running'; return Promise.resolve(); }
    suspend() { suspended++; this.state = 'suspended'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({}); }
  }
  const add = (name: string, fn: () => void) => (listeners[name] ??= []).push(fn);
  vi.stubGlobal('window', { AudioContext: Context, addEventListener: add, dispatchEvent() {} });
  vi.stubGlobal('document', { hidden: false, addEventListener: add });
  vi.stubGlobal('localStorage', { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => stored.set(k, v) });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
});
afterEach(() => vi.unstubAllGlobals());
async function ready() { await new Promise(resolve => setTimeout(resolve, 0)); }
test('uses one context and caches decoding through repeated gesture unlocks', async () => {
  const audio = await import('../src/lib/audio');
  audio.unlockAudio(); audio.unlockAudio(); await ready();
  audio.playSound('merge');
  expect(contexts).toBe(1); expect(resumes).toBe(1);
  expect(fetch).toHaveBeenCalledTimes(11); expect(starts).toEqual([10]);
});
test('saved mute is applied before the first gesture; enabling restores sound', async () => {
  stored.set('dh:settings:sound', 'false');
  const audio = await import('../src/lib/audio');
  audio.unlockAudio(); await ready(); audio.playSound('merge');
  expect(starts).toEqual([]);
  audio.setSound(true); audio.playSound('merge');
  expect(starts).toHaveLength(1);
  expect(stored.get('dh:settings:sound')).toBe('true');
  audio.setSound(false);
  expect(gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 10, .015);
});
test('background tabs suspend audio and restore on return', async () => {
  const audio = await import('../src/lib/audio');
  audio.unlockAudio(); await ready();
  document.hidden = true;
  listeners.visibilitychange.forEach(fn => fn()); audio.playSound('merge');
  expect(suspended).toBe(1); expect(starts).toHaveLength(0);
  document.hidden = false; listeners.visibilitychange.forEach(fn => fn());
  audio.playSound('merge'); expect(starts).toHaveLength(1);
});
test('pending cue is discarded when muted and then unmuted before decoding', async () => {
  let finish: ((v: unknown) => void) | undefined;
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve; })));
  const audio = await import('../src/lib/audio');
  audio.unlockAudio(); audio.playSound('solved');
  audio.setSound(false); audio.setSound(true);
  finish?.({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }); await ready();
  expect(starts).toHaveLength(0);
});
