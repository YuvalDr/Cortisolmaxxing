import { getState, deductBet, recordRound } from './state.js';
import { formatMoney, delay, showWinOverlay } from './utils.js';
import { launchConfetti } from './confetti.js';
import { playSpin, playWin, playClick } from './sounds.js';

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const COLUMN_1 = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
const COLUMN_2 = new Set([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]);
const COLUMN_3 = new Set([3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]);

let activeBets = [];
let spinning = false;
let wheelRotation = 0;
let ballAngle = -Math.PI / 2;
let canvas, ctx;

function notifyBetsChanged() {
  document.dispatchEvent(new CustomEvent('roulette-bets-changed'));
}

export function getRouletteTotalBet() {
  return activeBets.reduce((sum, bet) => sum + bet.amount, 0);
}

function getColor(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

function payoutForBet(bet, winningNumber) {
  const { type, value, amount } = bet;

  switch (type) {
    case 'straight':
      return value === winningNumber ? amount * 36 : 0;
    case 'red':
      return winningNumber !== 0 && RED_NUMBERS.has(winningNumber) ? amount * 2 : 0;
    case 'black':
      return winningNumber !== 0 && !RED_NUMBERS.has(winningNumber) ? amount * 2 : 0;
    case 'odd':
      return winningNumber !== 0 && winningNumber % 2 === 1 ? amount * 2 : 0;
    case 'even':
      return winningNumber !== 0 && winningNumber % 2 === 0 ? amount * 2 : 0;
    case 'low':
      return winningNumber >= 1 && winningNumber <= 18 ? amount * 2 : 0;
    case 'high':
      return winningNumber >= 19 && winningNumber <= 36 ? amount * 2 : 0;
    case 'dozen1':
      return winningNumber >= 1 && winningNumber <= 12 ? amount * 3 : 0;
    case 'dozen2':
      return winningNumber >= 13 && winningNumber <= 24 ? amount * 3 : 0;
    case 'dozen3':
      return winningNumber >= 25 && winningNumber <= 36 ? amount * 3 : 0;
    case 'column1':
      return COLUMN_1.has(winningNumber) ? amount * 3 : 0;
    case 'column2':
      return COLUMN_2.has(winningNumber) ? amount * 3 : 0;
    case 'column3':
      return COLUMN_3.has(winningNumber) ? amount * 3 : 0;
    default:
      return 0;
  }
}

function totalPayoutForNumber(number) {
  return activeBets.reduce((sum, bet) => sum + payoutForBet(bet, number), 0);
}

function findBestWinningNumber() {
  let bestNumber = 0;
  let bestPayout = -1;

  for (let n = 0; n <= 36; n++) {
    const payout = totalPayoutForNumber(n);
    if (payout > bestPayout) {
      bestPayout = payout;
      bestNumber = n;
    }
  }

  return { number: bestNumber, payout: bestPayout };
}

function drawWheel(highlightNumber = null) {
  if (!ctx) return;
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;
  const innerR = outerR * 0.65;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wheelRotation);

  const slice = (Math.PI * 2) / WHEEL_ORDER.length;

  WHEEL_ORDER.forEach((num, i) => {
    const start = i * slice - Math.PI / 2;
    const end = start + slice;
    const color = getColor(num);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, outerR, start, end);
    ctx.closePath();
    ctx.fillStyle = color === 'red' ? '#b91c1c' : color === 'black' ? '#1a1a1a' : '#15803d';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + slice / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px DM Sans, sans-serif';
    ctx.fillText(String(num), outerR * 0.82, 4);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#141010';
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();

  drawBall(cx, cy, outerR, innerR, ballAngle);

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR - 4);
  ctx.lineTo(cx - 10, cy - outerR + 14);
  ctx.lineTo(cx + 10, cy - outerR + 14);
  ctx.closePath();
  ctx.fillStyle = '#ffd700';
  ctx.fill();
}

function drawBall(cx, cy, outerR, innerR, angle) {
  const trackR = outerR * 0.9;
  const bx = cx + Math.cos(angle) * trackR;
  const by = cy + Math.sin(angle) * trackR;

  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f5f5';
  ctx.fill();
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(bx - 2, by - 2, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();
}

function animateWheelToNumber(targetNumber) {
  return new Promise((resolve) => {
    const targetIndex = WHEEL_ORDER.indexOf(targetNumber);
    const slice = (Math.PI * 2) / WHEEL_ORDER.length;
    const targetAngle = -(targetIndex * slice + slice / 2) + Math.PI / 2;
    const extraSpins = Math.PI * 2 * (4 + Math.floor(Math.random() * 3));
    const startRotation = wheelRotation;
    const endRotation = startRotation + extraSpins + (targetAngle - (startRotation % (Math.PI * 2)));
    const startBall = ballAngle;
    const ballSpins = Math.PI * 2 * (6 + Math.floor(Math.random() * 4));
    const endBall = -Math.PI / 2;
    const duration = 3200;
    const startTime = performance.now();

    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      const ballEased = 1 - Math.pow(1 - t, 5);
      wheelRotation = startRotation + (endRotation - startRotation) * eased;
      ballAngle = startBall + ballSpins * ballEased;
      if (t >= 1) ballAngle = endBall;
      drawWheel(targetNumber);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        wheelRotation = endRotation;
        ballAngle = endBall;
        drawWheel(targetNumber);
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

function renderTable() {
  const grid = document.getElementById('roulette-number-grid');
  const layout = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  let numbersHtml = '';
  layout.forEach((row) => {
    row.forEach((num) => {
      const color = getColor(num);
      numbersHtml += `<button type="button" class="number-cell ${color}" data-bet-type="straight" data-bet-value="${num}">${num}</button>`;
    });
  });

  grid.innerHTML = `
    <div class="roulette-zero-col">
      <button type="button" class="number-cell green roulette-zero" data-bet-type="straight" data-bet-value="0">0</button>
    </div>
    <div class="roulette-numbers-grid">${numbersHtml}</div>
  `;

  const outside = document.getElementById('roulette-outside-bets');
  outside.innerHTML = `
    <button type="button" class="outside-bet-btn red-btn" data-bet-type="red">Red 1:1</button>
    <button type="button" class="outside-bet-btn black-btn" data-bet-type="black">Black 1:1</button>
    <button type="button" class="outside-bet-btn" data-bet-type="odd">Odd 1:1</button>
    <button type="button" class="outside-bet-btn" data-bet-type="even">Even 1:1</button>
    <button type="button" class="outside-bet-btn" data-bet-type="low">1–18</button>
    <button type="button" class="outside-bet-btn" data-bet-type="high">19–36</button>
    <button type="button" class="outside-bet-btn" data-bet-type="dozen1">1st 12 (2:1)</button>
    <button type="button" class="outside-bet-btn" data-bet-type="dozen2">2nd 12 (2:1)</button>
    <button type="button" class="outside-bet-btn" data-bet-type="dozen3">3rd 12 (2:1)</button>
    <button type="button" class="outside-bet-btn" data-bet-type="column1">Col 1 (2:1)</button>
    <button type="button" class="outside-bet-btn" data-bet-type="column2">Col 2 (2:1)</button>
    <button type="button" class="outside-bet-btn" data-bet-type="column3">Col 3 (2:1)</button>
  `;
}

function updateActiveBetsUI() {
  const list = document.getElementById('roulette-active-bets');
  const clearBtn = document.getElementById('btn-clear-bets');
  const totalBet = activeBets.reduce((s, b) => s + b.amount, 0);

  if (activeBets.length === 0) {
    list.textContent = 'Tap numbers or outside bets to place chips.';
    clearBtn.classList.add('hidden');
    return;
  }

  list.innerHTML = activeBets
    .map((b) => {
      const label = b.type === 'straight' ? `#${b.value}` : b.type;
      return `<span class="bet-chip">${label}: ${formatMoney(b.amount)}</span>`;
    })
    .join('') + `<span class="bet-chip">Total: ${formatMoney(totalBet)}</span>`;

  clearBtn.classList.remove('hidden');
}

function highlightBetCells() {
  document.querySelectorAll('[data-bet-type]').forEach((el) => el.classList.remove('has-bet'));
  activeBets.forEach((bet) => {
    if (bet.type === 'straight') {
      document.querySelector(`[data-bet-type="straight"][data-bet-value="${bet.value}"]`)?.classList.add('has-bet');
    } else {
      document.querySelector(`[data-bet-type="${bet.type}"]:not([data-bet-value])`)?.classList.add('has-bet');
    }
  });
}

function addBet(type, value = null) {
  const { betAmount, balance } = getState();
  const totalPlaced = getRouletteTotalBet();
  const list = document.getElementById('roulette-active-bets');

  if (betAmount < 1) {
    list.textContent = 'Set a bet amount first.';
    return false;
  }

  if (totalPlaced + betAmount > balance) {
    list.textContent = `Not enough balance. Committed: ${formatMoney(totalPlaced)}, available: ${formatMoney(balance - totalPlaced)}.`;
    return false;
  }

  const existing = activeBets.find((b) => b.type === type && b.value === value);
  if (existing) {
    existing.amount += betAmount;
  } else {
    activeBets.push({ type, value, amount: betAmount });
  }

  updateActiveBetsUI();
  highlightBetCells();
  notifyBetsChanged();
  playClick();
  return true;
}

export function initRoulette() {
  canvas = document.getElementById('roulette-canvas');
  ctx = canvas.getContext('2d');
  renderTable();
  drawWheel();
  updateActiveBetsUI();

  document.getElementById('roulette-number-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bet-type]');
    if (!btn || spinning) return;
    addBet('straight', parseInt(btn.dataset.betValue, 10));
  });

  document.getElementById('roulette-outside-bets').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bet-type]');
    if (!btn || spinning) return;
    addBet(btn.dataset.betType);
  });

  document.getElementById('btn-clear-bets').addEventListener('click', () => {
    if (spinning) return;
    activeBets = [];
    updateActiveBetsUI();
    highlightBetCells();
    notifyBetsChanged();
  });
}

export async function spinRoulette() {
  if (spinning) return;
  if (activeBets.length === 0) return;

  const totalBet = activeBets.reduce((s, b) => s + b.amount, 0);
  const { balance } = getState();
  if (balance < totalBet) return;

  spinning = true;
  const resultEl = document.getElementById('roulette-result');
  const badge = document.getElementById('roulette-result-number');
  resultEl.classList.add('hidden');
  badge.classList.add('hidden');

  if (!deductBet(totalBet)) {
    spinning = false;
    return;
  }

  const { number, payout } = findBestWinningNumber();
  playSpin();
  await animateWheelToNumber(number);

  badge.textContent = number;
  badge.className = `roulette-result-badge ${getColor(number)}`;
  badge.classList.remove('hidden');

  recordRound({ grossPayout: payout, betPlaced: totalBet });

  const profit = payout - totalBet;
  resultEl.textContent = `Ball lands on ${number}! You won ${formatMoney(payout)}${profit > 0 ? ` (+${formatMoney(profit)} profit)` : ''}`;
  resultEl.classList.remove('hidden');

  playWin(payout >= 500 ? 'big' : 'normal');
  showWinOverlay(payout, `Lucky ${number}`);
  if (payout > 200) launchConfetti(payout >= 1000 ? 'massive' : 'big');

  activeBets = [];
  updateActiveBetsUI();
  highlightBetCells();
  notifyBetsChanged();
  spinning = false;

  return { number, payout };
}

export function isRouletteSpinning() {
  return spinning;
}

export function hasRouletteBets() {
  return activeBets.length > 0;
}
