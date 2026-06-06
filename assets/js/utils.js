export function formatMoney(amount) {
  const n = Math.round(amount);
  const prefix = n < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(n).toLocaleString('en-US')}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function animateNumber(el, from, to, duration = 600) {
  const start = performance.now();
  const diff = to - from;

  function frame(now) {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = Math.round(from + diff * eased);
    el.textContent = formatMoney(current);
    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export function showWinOverlay(amount, detail = '') {
  const overlay = document.getElementById('win-overlay');
  const amountEl = document.getElementById('win-popup-amount');
  const detailEl = document.getElementById('win-popup-detail');

  amountEl.textContent = amount > 0 ? `+${formatMoney(amount)}` : formatMoney(amount);
  detailEl.textContent = detail;
  overlay.classList.remove('hidden');

  setTimeout(() => overlay.classList.add('hidden'), 2200);
}

export function $(id) {
  return document.getElementById(id);
}

export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}
