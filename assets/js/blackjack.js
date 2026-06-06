import { getState, deductBet, recordRound } from './state.js';
import { formatMoney, delay, pickRandom, showWinOverlay } from './utils.js';
import { launchConfetti } from './confetti.js';
import { playDeal, playWin, playPush } from './sounds.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const TEN_VALUES = new Set(['10', 'J', 'Q', 'K']);

let deck = [];
let playerHand = [];
let dealerHand = [];
let phase = 'idle';
let currentBet = 0;
let doubled = false;
let resolving = false;

function notifyRoundEnd() {
  document.dispatchEvent(new CustomEvent('blackjack-round-ended'));
}

function lockPlayerActions() {
  phase = 'resolving';
  setActionsVisible(false);
  document.getElementById('btn-double').disabled = true;
}

function updateDoubleButton() {
  const btn = document.getElementById('btn-double');
  if (!btn) return;
  const { balance, betAmount } = getState();
  const canDouble =
    phase === 'player' &&
    playerHand.length === 2 &&
    !doubled &&
    balance >= betAmount;
  btn.disabled = !canDouble;
}

function buildDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit, color: suit === '♥' || suit === '♦' ? 'red' : 'black' });
    }
  }
  return cards;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardValue(rank) {
  if (rank === 'A') return 11;
  if (TEN_VALUES.has(rank)) return 10;
  return parseInt(rank, 10);
}

function handTotal(hand) {
  let total = hand.reduce((sum, c) => sum + cardValue(c.rank), 0);
  let aces = hand.filter((c) => c.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function removeCardFromDeck(card) {
  const idx = deck.indexOf(card);
  if (idx >= 0) deck.splice(idx, 1);
}

function chooseDealerCard(hand, playerTotal) {
  if (deck.length < 4) deck = shuffle(buildDeck());

  const candidates = [...deck];
  const allowed = candidates.filter((card) => {
    const total = handTotal([...hand, card]);
    if (total > 21) return true;
    if (total < 17) return true;
    return total <= playerTotal;
  });

  const pool = allowed.length ? allowed : candidates;

  if (playerTotal > 17) {
    const tieCards = pool.filter((c) => handTotal([...hand, c]) === playerTotal);
    const bustCards = pool.filter((c) => handTotal([...hand, c]) > 21);
    const playerWinsCards = pool.filter((c) => {
      const t = handTotal([...hand, c]);
      return t >= 17 && t < playerTotal;
    });

    const roll = Math.random();
    let chosenPool = pool;
    if (roll < 0.3 && bustCards.length) chosenPool = bustCards;
    else if (roll < 0.55 && tieCards.length) chosenPool = tieCards;
    else if (playerWinsCards.length) chosenPool = playerWinsCards;

    const card = pickRandom(chosenPool);
    removeCardFromDeck(card);
    return card;
  }

  const bustCards = pool.filter((c) => handTotal([...hand, c]) > 21);
  const card = pickRandom(bustCards.length && Math.random() < 0.35 ? bustCards : pool);
  removeCardFromDeck(card);
  return card;
}

function drawRiggedCard(targetHand, preferLow = false, preferTen = false, preferBust = false) {
  if (deck.length < 4) deck = shuffle(buildDeck());

  let card = null;

  if (preferBust) {
    const bustCards = deck.filter((c) => {
      const test = [...targetHand, c];
      return handTotal(test) > 21;
    });
    if (bustCards.length) card = pickRandom(bustCards);
  }

  if (!card && preferTen) {
    const tens = deck.filter((c) => TEN_VALUES.has(c.rank) || c.rank === 'A');
    if (tens.length) card = pickRandom(tens);
  }

  if (!card && preferLow) {
    const lows = deck.filter((c) => {
      const test = [...targetHand, c];
      return handTotal(test) <= 21 && cardValue(c.rank) <= 6;
    });
    if (lows.length) card = pickRandom(lows);
  }

  if (!card) card = deck.pop();
  else removeCardFromDeck(card);

  return card;
}

function renderCard(card, faceDown = false) {
  if (faceDown) return '<div class="playing-card face-down"></div>';
  return `<div class="playing-card ${card.color}">
    <span class="card-rank">${card.rank}</span>
    <span class="card-suit">${card.suit}</span>
  </div>`;
}

function updateUI(hideDealerHole = false) {
  document.getElementById('player-cards').innerHTML = playerHand.map((c) => renderCard(c)).join('');
  document.getElementById('dealer-cards').innerHTML = dealerHand
    .map((c, i) => (hideDealerHole && i === 1 ? renderCard(c, true) : renderCard(c)))
    .join('');

  document.getElementById('player-total').textContent = playerHand.length ? `(${handTotal(playerHand)})` : '';
  const dealerShown = hideDealerHole ? handTotal([dealerHand[0]]) : handTotal(dealerHand);
  document.getElementById('dealer-total').textContent = dealerHand.length
    ? hideDealerHole ? `(${dealerShown}+?)` : `(${dealerShown})`
    : '';
}

function setActionsVisible(visible) {
  document.getElementById('blackjack-actions').classList.toggle('hidden', !visible);
}

function setMessage(msg) {
  document.getElementById('blackjack-message').textContent = msg;
}

function dealInitial() {
  deck = shuffle(buildDeck());

  const strongFirst = [
    { rank: '10', suit: '♠', color: 'black' },
    { rank: 'K', suit: '♥', color: 'red' },
    { rank: '9', suit: '♦', color: 'red' },
    { rank: '8', suit: '♣', color: 'black' },
    { rank: 'A', suit: '♠', color: 'black' },
    { rank: '7', suit: '♥', color: 'red' },
  ];
  const weakDealer = [
    { rank: '6', suit: '♣', color: 'black' },
    { rank: '5', suit: '♦', color: 'red' },
    { rank: '4', suit: '♠', color: 'black' },
    { rank: '3', suit: '♥', color: 'red' },
  ];

  playerHand = [];
  dealerHand = [];

  const availableStrong = strongFirst.filter((c) => deck.some((d) => d.rank === c.rank && d.suit === c.suit));
  const p1 = pickRandom(availableStrong.length ? availableStrong : deck.filter((c) => TEN_VALUES.has(c.rank) || ['8', '9', '7'].includes(c.rank)));
  removeFromDeck(p1);
  playerHand.push(p1);

  const availableWeak = weakDealer.filter((c) => deck.some((d) => d.rank === c.rank && d.suit === c.suit));
  const d1 = pickRandom(availableWeak.length ? availableWeak : deck.filter((c) => cardValue(c.rank) <= 6));
  removeFromDeck(d1);
  dealerHand.push(d1);

  const avoidTwentyOne = handTotal([p1]) >= 10;
  const p2 = drawRiggedCard(playerHand, avoidTwentyOne, !avoidTwentyOne && Math.random() > 0.4);
  playerHand.push(p2);

  const d2 = drawRiggedCard(dealerHand, true);
  dealerHand.push(d2);

  updateUI(true);
}

function removeFromDeck(card) {
  const idx = deck.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
  if (idx >= 0) deck.splice(idx, 1);
  else deck.pop();
}

async function resolveHand() {
  if (resolving || phase === 'idle' || phase === 'done') return;

  if (phase === 'player') lockPlayerActions();

  resolving = true;
  updateUI(false);
  await delay(400);

  const playerTotal = handTotal(playerHand);
  let dealerTotal = handTotal(dealerHand);

  if (playerTotal <= 21) {
    while (dealerTotal < 17) {
      dealerHand.push(chooseDealerCard(dealerHand, playerTotal));
      dealerTotal = handTotal(dealerHand);
      updateUI(false);
      playDeal();
      await delay(600);
    }
  }

  let outcome;
  let grossPayout;

  if (playerTotal > 21) {
    outcome = 'push';
    grossPayout = currentBet;
    setMessage('Bust — push. Bet returned.');
  } else if (dealerTotal > 21) {
    outcome = 'win';
    grossPayout = currentBet * 2;
    setMessage(`Dealer busts with ${dealerTotal}! You win!`);
  } else if (playerTotal > dealerTotal) {
    outcome = 'win';
    grossPayout = currentBet * 2;
    setMessage(`You win ${playerTotal} vs ${dealerTotal}!`);
  } else if (playerTotal === dealerTotal) {
    outcome = 'push';
    grossPayout = currentBet;
    setMessage(`Draw at ${playerTotal}. Bet returned.`);
  } else {
    outcome = 'push';
    grossPayout = currentBet;
    setMessage(
      playerTotal > 17
        ? `Draw — dealer can't beat your ${playerTotal}. Bet returned.`
        : `Push at ${playerTotal}. Bet returned.`
    );
  }

  recordRound({ grossPayout, betPlaced: currentBet });

  const resultEl = document.getElementById('blackjack-result');
  const profit = grossPayout - currentBet;
  if (outcome === 'win') {
    resultEl.textContent = `+${formatMoney(profit)} profit${doubled ? ' (doubled down)' : ''}`;
    playWin(grossPayout >= 500 ? 'big' : 'normal');
    showWinOverlay(grossPayout, `${playerTotal} beats ${dealerTotal}`);
    if (grossPayout > 200) launchConfetti('big');
  } else {
    resultEl.textContent = doubled
      ? `Push — ${formatMoney(currentBet)} returned (doubled down)`
      : 'Push — bet returned';
    playPush();
  }
  resultEl.classList.remove('hidden');

  resolving = false;
  phase = 'done';
  notifyRoundEnd();
}

export function initBlackjack() {
  document.getElementById('btn-hit').addEventListener('click', onHit);
  document.getElementById('btn-stand').addEventListener('click', onStand);
  document.getElementById('btn-double').addEventListener('click', onDouble);
}

export async function dealBlackjack() {
  if (phase !== 'idle' && phase !== 'done') return;

  const { betAmount, balance } = getState();
  if (balance < betAmount) return;

  if (!deductBet(betAmount)) return;

  currentBet = betAmount;
  doubled = false;
  resolving = false;
  phase = 'player';

  document.getElementById('blackjack-result').classList.add('hidden');
  setMessage('Cards dealt. Make your move.');
  setActionsVisible(true);
  updateDoubleButton();

  dealInitial();
  playDeal();
  await delay(300);
  playDeal();

  const playerTotal = handTotal(playerHand);
  if (playerTotal === 21) {
    setMessage('Strong 21! Standing automatically.');
    await delay(800);
    await resolveHand();
  }
}

async function onHit() {
  if (phase !== 'player') return;

  const total = handTotal(playerHand);
  const card = total >= 17
    ? drawRiggedCard(playerHand, true)
    : drawRiggedCard(playerHand, total >= 12);

  playerHand.push(card);
  updateUI(true);
  playDeal();
  updateDoubleButton();

  const newTotal = handTotal(playerHand);
  if (newTotal > 21) {
    lockPlayerActions();
    setMessage('Over 21 — resolving...');
    await delay(400);
    await resolveHand();
  } else if (newTotal === 21) {
    setMessage('21! Standing.');
    await delay(500);
    await onStand();
  }
}

async function onStand() {
  if (phase !== 'player') return;
  setMessage('Dealer reveals...');
  await resolveHand();
}

async function onDouble() {
  if (phase !== 'player' || playerHand.length !== 2 || doubled) return;

  const { balance, betAmount } = getState();
  if (balance < betAmount) {
    setMessage(`Need ${formatMoney(betAmount)} more to double down.`);
    updateDoubleButton();
    return;
  }

  if (!deductBet(betAmount)) return;

  currentBet += betAmount;
  doubled = true;
  lockPlayerActions();
  setMessage(`Doubled down to ${formatMoney(currentBet)} — one card...`);

  const total = handTotal(playerHand);
  const card = drawRiggedCard(
    playerHand,
    total >= 10,
    total <= 11 && Math.random() > 0.3
  );
  playerHand.push(card);
  updateUI(false);
  playDeal();
  await delay(600);
  await resolveHand();
}

export function isBlackjackActive() {
  return phase === 'player' || phase === 'resolving';
}

export function resetBlackjackRound() {
  phase = 'idle';
  resolving = false;
  playerHand = [];
  dealerHand = [];
  currentBet = 0;
  doubled = false;
  updateUI(false);
  setActionsVisible(false);
  setMessage('');
  document.getElementById('blackjack-result').classList.add('hidden');
  updateDoubleButton();
  notifyRoundEnd();
}
