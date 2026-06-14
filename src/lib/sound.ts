/**
 * Synthesized sound effects via the Web Audio API — no audio asset files.
 *
 * Effects are short, tasteful, and fully mutable. The engine lazily creates
 * an AudioContext on first use (after a user gesture) and is a no-op on the
 * server or when muted. Honors `prefers-reduced-motion` by staying quiet
 * for ambient cues (callers gate on the sound setting).
 */

type Effect = 'deal' | 'check' | 'chip' | 'fold' | 'win' | 'lose' | 'click';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  gain: number,
): void {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.02);
}

function noise(ac: AudioContext, start: number, duration: number, gain: number): void {
  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const g = ac.createGain();
  g.gain.value = gain;
  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}

export function playSound(effect: Effect): void {
  const ac = audio();
  if (!ac) return;
  switch (effect) {
    case 'deal':
      noise(ac, 0, 0.08, 0.12);
      break;
    case 'check':
      tone(ac, 220, 0, 0.09, 'sine', 0.08);
      break;
    case 'chip':
      noise(ac, 0, 0.05, 0.1);
      tone(ac, 880, 0.01, 0.06, 'triangle', 0.05);
      break;
    case 'fold':
      tone(ac, 180, 0, 0.16, 'sawtooth', 0.05);
      break;
    case 'click':
      tone(ac, 660, 0, 0.05, 'square', 0.03);
      break;
    case 'win':
      tone(ac, 523.25, 0, 0.18, 'triangle', 0.12); // C5
      tone(ac, 659.25, 0.08, 0.18, 'triangle', 0.12); // E5
      tone(ac, 783.99, 0.16, 0.28, 'triangle', 0.14); // G5
      break;
    case 'lose':
      tone(ac, 311.13, 0, 0.22, 'sine', 0.08);
      tone(ac, 233.08, 0.1, 0.3, 'sine', 0.08);
      break;
  }
}
