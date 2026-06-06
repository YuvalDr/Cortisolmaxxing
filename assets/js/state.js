const STORAGE_KEY = 'cortisolmaxxing_state';
const PREFS_KEY = 'cortisolmaxxing_prefs';

const DEFAULT_STATE = {
  balance: 1000,
  sessionStartBalance: 1000,
  totalWon: 0,
  biggestWin: 0,
  gamesPlayed: 0,
  currentStreak: 0,
  betAmount: 50,
};

let state = { ...DEFAULT_STATE };
let soundEnabled = true;

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return { ...state };
}

export function getSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  localStorage.setItem(PREFS_KEY, JSON.stringify({ soundEnabled }));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    state = { ...DEFAULT_STATE };
  }

  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (typeof prefs.soundEnabled === 'boolean') {
      soundEnabled = prefs.soundEnabled;
    }
  } catch {
    soundEnabled = true;
  }

  notify();
  return state;
}

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setBetAmount(amount) {
  const clamped = Math.max(1, Math.min(Math.floor(amount), state.balance || 1));
  state.betAmount = clamped;
  saveState();
  notify();
  return clamped;
}

export function canAffordBet(amount = state.betAmount) {
  return state.balance >= amount && amount >= 1;
}

export function deductBet(amount = state.betAmount) {
  if (!canAffordBet(amount)) return false;
  state.balance -= amount;
  saveState();
  notify();
  return true;
}

export function recordRound({ grossPayout, betPlaced }) {
  state.balance += grossPayout;
  state.gamesPlayed += 1;

  const profit = grossPayout - betPlaced;

  if (profit > 0) {
    state.totalWon += profit;
    if (grossPayout > state.biggestWin) {
      state.biggestWin = grossPayout;
    }
  }

  state.currentStreak += 1;

  saveState();
  notify();
  return { grossPayout, profit };
}

export function getSessionProfit() {
  return state.balance - state.sessionStartBalance;
}

export function resetSession() {
  state = { ...DEFAULT_STATE };
  saveState();
  notify();
}
