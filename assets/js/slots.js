import { getState, deductBet, recordRound } from './state.js';
import { delay, weightedPick, showWinOverlay } from './utils.js';
import { launchConfetti } from './confetti.js';
import { playSpin, playWin } from './sounds.js';

export const SYMBOLS = [
  { id: 'wild', emoji: '🤑', label: 'Wild', multiplier: 50, weight: 3 },
  { id: 'seven', emoji: '7️⃣', label: 'Lucky 7', multiplier: 25, weight: 8 },
  { id: 'diamond', emoji: '💎', label: 'Diamond', multiplier: 15, weight: 12 },
  { id: 'bar', emoji: '🥇', label: 'Gold Bar', multiplier: 10, weight: 18 },
  { id: 'bell', emoji: '🔔', label: 'Bell', multiplier: 5, weight: 22 },
  { id: 'cherry', emoji: '🍒', label: 'Cherry', multiplier: 3, weight: 37 },
];

const ALL_EMOJIS = SYMBOLS.map((s) => s.emoji);
let spinning = false;

function renderPayoutTable() {
  const grid = document.getElementById('slots-payout-grid');
  grid.innerHTML = SYMBOLS.map(
    (s) => `<div class="payout-item"><span>${s.emoji} ${s.label} ×3</span><span>${s.multiplier}x</span></div>`
  ).join('');
}

function setReelSymbols(reelIndex, emoji) {
  const strip = document.querySelector(`#reel-${reelIndex} .reel-strip`);
  strip.innerHTML = `<div class="reel-symbol">${emoji}</div>`;
  strip.style.transform = 'translateY(0)';
}

function setReelsSpinning(spinning) {
  for (let i = 0; i < 3; i++) {
    const reel = document.getElementById(`reel-${i}`);
    const strip = reel.querySelector('.reel-strip');
    if (spinning) {
      reel.classList.add('spinning');
      strip.innerHTML = ALL_EMOJIS.map((e) => `<div class="reel-symbol">${e}</div>`).join('');
    } else {
      reel.classList.remove('spinning');
    }
  }
}

function generateOutcome() {
  const isWin = Math.random() < 0.8;

  if (!isWin) {
    const pool = [...SYMBOLS];
    const a = weightedPick(pool.map((s) => ({ value: s, weight: s.weight })));
    let b = weightedPick(pool.map((s) => ({ value: s, weight: s.weight })));
    let c = weightedPick(pool.map((s) => ({ value: s, weight: s.weight })));
    while (a.id === b.id && b.id === c.id) {
      c = weightedPick(pool.map((s) => ({ value: s, weight: s.weight })));
    }
    return {
      symbols: [a.emoji, b.emoji, c.emoji],
      multiplier: 0,
      isWin: false,
      label: 'Break Even — bet returned',
    };
  }

  const symbol = weightedPick(SYMBOLS.map((s) => ({ value: s, weight: s.weight })));
  return {
    symbols: [symbol.emoji, symbol.emoji, symbol.emoji],
    multiplier: symbol.multiplier,
    isWin: true,
    label: `${symbol.label} Jackpot! ${symbol.multiplier}x`,
  };
}

export function initSlots() {
  renderPayoutTable();
  SYMBOLS.forEach((s, i) => {
    if (i < 3) setReelSymbols(i, SYMBOLS[i].emoji);
  });
}

export async function spinSlots() {
  if (spinning) return;
  const { betAmount, balance } = getState();
  if (balance < betAmount) return;

  spinning = true;
  const resultEl = document.getElementById('slots-result');
  resultEl.classList.add('hidden');

  if (!deductBet(betAmount)) {
    spinning = false;
    return;
  }

  const outcome = generateOutcome();
  setReelsSpinning(true);
  playSpin();

  await delay(1400);

  for (let i = 0; i < 3; i++) {
    document.getElementById(`reel-${i}`).classList.remove('spinning');
    setReelSymbols(i, outcome.symbols[i]);
    playSpin();
    await delay(450);
  }

  const grossPayout = outcome.isWin ? betAmount * outcome.multiplier : betAmount;
  recordRound({ grossPayout, betPlaced: betAmount });

  resultEl.textContent = outcome.isWin
    ? `🎰 ${outcome.label} — Won ${grossPayout.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`
    : `Near miss! Your ${betAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} returned.`;
  resultEl.classList.remove('hidden');

  if (outcome.isWin) {
    const winSize = grossPayout >= 500 ? 'big' : 'normal';
    playWin(winSize);
    showWinOverlay(grossPayout, outcome.label);
    if (grossPayout > 200) {
      launchConfetti(grossPayout >= 500 ? 'massive' : 'big');
    }
  }

  spinning = false;
  return { grossPayout, outcome };
}

export function isSlotsSpinning() {
  return spinning;
}
