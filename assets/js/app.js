import {
  loadState,
  subscribe,
  getState,
  setBetAmount,
  getSessionProfit,
  getSoundEnabled,
  setSoundEnabled,
  resetSession,
  canAffordBet,
} from './state.js';
import { formatMoney, animateNumber, $ } from './utils.js';
import { resumeAudio, playClick } from './sounds.js';
import { initSlots, spinSlots, isSlotsSpinning } from './slots.js';
import { initRoulette, spinRoulette, isRouletteSpinning, hasRouletteBets } from './roulette.js';
import {
  initBlackjack,
  dealBlackjack,
  isBlackjackActive,
  resetBlackjackRound,
} from './blackjack.js';

let currentView = 'hub';
let lastBalance = 1000;

const ACTION_LABELS = {
  hub: 'Play',
  slots: 'Spin',
  roulette: 'Spin Wheel',
  blackjack: 'Deal',
};

function initIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function showView(view) {
  currentView = view;

  document.querySelectorAll('.view').forEach((el) => {
    el.classList.toggle('hidden', el.id !== `view-${view}`);
    el.classList.toggle('active', el.id === `view-${view}`);
  });

  const betPanel = document.getElementById('bet-panel');
  betPanel.classList.toggle('hidden', view === 'hub');

  const label = document.getElementById('primary-action-label');
  label.textContent = ACTION_LABELS[view] || 'Play';

  if (view === 'blackjack' && !isBlackjackActive()) {
    resetBlackjackRound();
  }

  updatePrimaryButton();
}

function updateHeader(state) {
  const balanceEl = document.getElementById('display-balance');
  const profitEl = document.getElementById('display-profit');
  const streakEl = document.getElementById('display-streak');

  if (balanceEl.textContent !== formatMoney(state.balance)) {
    balanceEl.classList.add('animating');
    animateNumber(balanceEl, lastBalance, state.balance, 500);
    setTimeout(() => balanceEl.classList.remove('animating'), 500);
    lastBalance = state.balance;
  }

  const profit = state.balance - state.sessionStartBalance;
  profitEl.textContent = (profit >= 0 ? '+' : '') + formatMoney(profit);
  profitEl.classList.toggle('positive', profit > 0);
  profitEl.classList.toggle('negative', profit < 0);

  streakEl.textContent = String(state.currentStreak);
}

function updateBetInput() {
  const { betAmount, balance } = getState();
  const input = document.getElementById('bet-input');
  input.value = betAmount;
  input.max = balance;
}

function updatePrimaryButton() {
  const btn = document.getElementById('btn-primary-action');
  const { balance, betAmount } = getState();

  if (currentView === 'hub') {
    btn.disabled = true;
    return;
  }

  if (currentView === 'roulette') {
    btn.disabled = !hasRouletteBets() || isRouletteSpinning() || !canAffordBet();
    return;
  }

  if (currentView === 'slots') {
    btn.disabled = isSlotsSpinning() || !canAffordBet();
    return;
  }

  if (currentView === 'blackjack') {
    btn.disabled = isBlackjackActive() || !canAffordBet();
    btn.querySelector('#primary-action-label').textContent = isBlackjackActive() ? 'In Progress' : 'Deal';
    return;
  }

  btn.disabled = !canAffordBet();
}

function updateSoundButton() {
  const on = getSoundEnabled();
  document.querySelector('.icon-sound-on').classList.toggle('hidden', !on);
  document.querySelector('.icon-sound-off').classList.toggle('hidden', on);
}

function openStatsModal() {
  const state = getState();
  document.getElementById('stats-profit').textContent = formatMoney(getSessionProfit());
  document.getElementById('stats-biggest').textContent = formatMoney(state.biggestWin);
  document.getElementById('stats-played').textContent = String(state.gamesPlayed);
  document.getElementById('stats-streak').textContent = String(state.currentStreak);
  document.getElementById('stats-modal').classList.remove('hidden');
}

function closeStatsModal() {
  document.getElementById('stats-modal').classList.add('hidden');
}

async function handlePrimaryAction() {
  resumeAudio();
  playClick();
  updatePrimaryButton();

  if (currentView === 'slots') {
    await spinSlots();
  } else if (currentView === 'roulette') {
    await spinRoulette();
  } else if (currentView === 'blackjack') {
    await dealBlackjack();
  }

  updatePrimaryButton();
  updateBetInput();
}

function bindEvents() {
  document.querySelectorAll('[data-game]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClick();
      resumeAudio();
      showView(btn.dataset.game);
    });
  });

  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClick();
      if (currentView === 'blackjack') resetBlackjackRound();
      showView('hub');
    });
  });

  document.getElementById('btn-home').addEventListener('click', () => {
    playClick();
    if (currentView === 'blackjack') resetBlackjackRound();
    showView('hub');
  });

  document.getElementById('btn-primary-action').addEventListener('click', handlePrimaryAction);

  document.getElementById('bet-input').addEventListener('change', (e) => {
    const val = setBetAmount(parseInt(e.target.value, 10) || 1);
    e.target.value = val;
    updatePrimaryButton();
  });

  document.querySelectorAll('[data-bet-delta]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.betDelta, 10);
      const { betAmount } = getState();
      setBetAmount(betAmount + delta);
      updateBetInput();
      updatePrimaryButton();
      playClick();
    });
  });

  document.querySelectorAll('.quick-bet').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { balance } = getState();
      const amount = btn.dataset.bet === 'max' ? balance : parseInt(btn.dataset.bet, 10);
      setBetAmount(amount);
      updateBetInput();
      updatePrimaryButton();
      playClick();
    });
  });

  document.getElementById('btn-sound').addEventListener('click', () => {
    setSoundEnabled(!getSoundEnabled());
    updateSoundButton();
    playClick();
  });

  document.getElementById('btn-stats').addEventListener('click', () => {
    playClick();
    openStatsModal();
  });

  document.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeStatsModal);
  });

  document.getElementById('btn-reset-session').addEventListener('click', () => {
    resetSession();
    resetBlackjackRound();
    lastBalance = 1000;
    updateBetInput();
    updatePrimaryButton();
    closeStatsModal();
    showView('hub');
    playClick();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStatsModal();
  });
}

function init() {
  const state = loadState();
  lastBalance = state.balance;

  initIcons();
  initSlots();
  initRoulette();
  initBlackjack();
  bindEvents();

  subscribe((s) => {
    updateHeader(s);
    updateBetInput();
    updatePrimaryButton();
  });

  updateHeader(state);
  updateBetInput();
  updateSoundButton();
  showView('hub');
}

init();
