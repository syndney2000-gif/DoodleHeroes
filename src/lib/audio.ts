/* Original CC0 cues; shared, gesture-unlocked Web Audio engine.
   Architecture informed by ../casino/web/src/lib/sfx.ts; no casino samples. */
import { load, save } from './storage';
/** Background music: CC0 tracks (see public/audio/README.md). Auto picks the
    high-energy track for Scribble Siege and the island track elsewhere. */
export type MusicTrack = 'island' | 'blitz' | 'meadow';
const MUSIC: Record<MusicTrack, string[]> = {
  island: ['/audio/music/island-vibes.ogg', '/audio/music/island-vibes.mp3'],
  blitz: ['/audio/music/shine-blitz.ogg', '/audio/music/shine-blitz.mp3'],
  meadow: ['/audio/meadow-loop.ogg', '/audio/meadow-loop.wav'],
};
export function musicChoice(): MusicTrack | 'auto' {
  return load<MusicTrack | 'auto'>('settings:music-track') ?? 'auto';
}
function musicTrack(): MusicTrack {
  const choice = musicChoice();
  if (choice !== 'auto' && choice in MUSIC) return choice;
  return typeof location !== 'undefined' && location.pathname.startsWith('/scribble-siege/play') ? 'blitz' : 'island';
}
const CUES = ['tap', 'place', 'draw', 'merge', 'discover', 'deliver', 'levelup', 'invalid', 'erase', 'hint', 'solved'] as const;
const SIEGE_CUES = ['sg-hit', 'sg-kill', 'sg-gem', 'sg-coin', 'sg-hurt', 'sg-boss', 'sg-dead', 'sg-splash', 'sg-swipe'] as const;
export type Cue = typeof CUES[number] | typeof SIEGE_CUES[number];
let ctx: AudioContext | undefined;
let bus: GainNode | undefined;
let musicBus: GainNode | undefined;
let musicSource: AudioBufferSourceNode | undefined;
const musicBuffers = new Map<MusicTrack, AudioBuffer>();
let musicPending: Promise<void> | undefined;
let musicPlaying: MusicTrack | undefined;
let unlocked = false;
const buffers = new Map<Cue, AudioBuffer>();
const pending = new Map<Cue, Promise<AudioBuffer | undefined>>();
const last = new Map<Cue, number>();
let enabled = load<boolean>('settings:sound') ?? load<boolean>('scribble-siege:sound') ?? true;
let volume = Math.min(1, Math.max(0, load<number>('settings:volume') ?? .65));
let generation = 0;
let musicEnabled = load<boolean>('settings:music') ?? false;
let musicLevel = Math.min(1, Math.max(0, load<number>('settings:music-volume') ?? .35));

function context() {
  if (ctx || typeof window === 'undefined') return ctx;
  try {
    const Constructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return;
    ctx = new Constructor();
    bus = ctx.createGain();
    bus.gain.value = enabled && !document.hidden ? volume : 0;
    bus.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicEnabled && !document.hidden ? musicLevel : 0;
    musicBus.connect(ctx.destination);
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
      const response = await fetch(`/audio/${cue}.mp3`);
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
  unlocked = true;
  const c = context();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  for (const cue of CUES) void buffer(cue);
  // Siege's own cues load only where they're used.
  if (typeof location !== 'undefined' && location.pathname.startsWith('/scribble-siege/play')) for (const cue of SIEGE_CUES) void buffer(cue);
  void startMusic();
}
export function soundOn() { return enabled; }
export function soundVolume() { return volume; }
export function musicOn() { return musicEnabled; }
export function musicVolume() { return musicLevel; }
async function startMusic() {
  if (!unlocked || !musicEnabled || document.hidden || musicSource) return;
  const c = context();
  if (!c || !musicBus) return;
  const track = musicTrack();
  if (!musicBuffers.has(track)) {
    musicPending ??= (async () => {
      try {
        for (const path of MUSIC[track]) {
          try {
            const response = await fetch(path);
            if (!response.ok) continue;
            musicBuffers.set(track, await c.decodeAudioData(await response.arrayBuffer()));
            break;
          } catch { /* Try the fallback if this browser cannot decode the format. */ }
        }
      } catch { /* Music is optional; a failed load never interrupts play. */ }
      finally { musicPending = undefined; }
    })();
    await musicPending;
  }
  // Recheck after decoding: the user may have muted or left the tab.
  const buffer = musicBuffers.get(track);
  if (!buffer || !musicEnabled || document.hidden || musicSource) return;
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(musicBus);
  musicBus.gain.cancelScheduledValues(c.currentTime);
  musicBus.gain.setTargetAtTime(musicLevel, c.currentTime, .15);
  musicSource = source;
  musicPlaying = track;
  source.start();
}
function stopMusic() {
  if (!musicSource) return;
  musicSource.stop(); musicSource.disconnect(); musicSource = undefined; musicPlaying = undefined;
}
/** Switches the background track; plays the new one at once if music is on. */
export function setMusicTrack(choice: MusicTrack | 'auto') {
  save('settings:music-track', choice);
  if (musicPlaying && musicPlaying !== musicTrack()) { stopMusic(); void startMusic(); }
}
export function setMusic(on: boolean) {
  musicEnabled = on;
  save('settings:music', on);
  if (!on) stopMusic();
  if (on) void startMusic();
  mix();
}
export function setMusicVolume(value: number) {
  musicLevel = Math.min(1, Math.max(0, value));
  save('settings:music-volume', musicLevel);
  mix();
}
function mix() {
  generation++;
  if (ctx && bus) {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(enabled && !document.hidden ? volume : 0, ctx.currentTime, .015);
  }
  if (ctx && musicBus) {
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(musicEnabled && !document.hidden ? musicLevel : 0, ctx.currentTime, .15);
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
    else if ((enabled || musicEnabled) && ctx?.state === 'suspended') {
      void ctx.resume().then(() => startMusic()).catch(() => {});
    }
  });
  window.addEventListener('pagehide', () => { void ctx?.suspend().catch(() => {}); });
  window.addEventListener('pageshow', () => {
    if (unlocked && !document.hidden && (enabled || musicEnabled) && ctx?.state === 'suspended') {
      void ctx.resume().then(() => startMusic()).catch(() => {});
    }
  });
}
