import { getSoundEnabled } from './state.js';

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function tone(freq, duration, type = 'sine', volume = 0.15) {
  if (!getSoundEnabled()) return;

  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* audio unavailable */
  }
}

export function playSpin() {
  tone(220, 0.08, 'square', 0.06);
  setTimeout(() => tone(280, 0.08, 'square', 0.05), 60);
}

export function playWin(size = 'normal') {
  const notes = size === 'big'
    ? [523, 659, 784, 1047]
    : size === 'small'
      ? [440, 554]
      : [523, 659, 784];

  notes.forEach((freq, i) => {
    setTimeout(() => tone(freq, 0.2, 'triangle', 0.12), i * 100);
  });
}

export function playPush() {
  tone(330, 0.15, 'sine', 0.08);
}

export function playDeal() {
  tone(180, 0.05, 'square', 0.04);
}

export function playClick() {
  tone(600, 0.04, 'sine', 0.05);
}

export function resumeAudio() {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* ignore */
  }
}
