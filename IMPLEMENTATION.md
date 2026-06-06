# Cortisolmaxxing – Implementation Document

**Project Name:** Cortisolmaxxing  
**Tagline:** Luxury Casino Gambling Simulator – *You Always Win*  
**Hosting:** GitHub Pages (static site)  
**Version:** 1.0

## Project Overview

Cortisolmaxxing is a web-based gambling simulator featuring **Roulette**, **Blackjack**, and **Slots**. The core philosophy is **maximum dopamine**: the player always wins big. No real risk, pure serotonin. Luxury casino aesthetic with dark theme, gold accents, neon glows, and satisfying animations.

**Key Constraints & Decisions**
- Starting balance: **$1,000**
- No permanent progress saving (session-only via `localStorage`)
- Fully mobile responsive
- Vanilla HTML + Tailwind CSS + JavaScript (easiest for GitHub Pages, great aesthetics)
- Session stats tracking

## Tech Stack

- **HTML5** + **Tailwind CSS** (via CDN)
- **Vanilla JavaScript** (ES6+)
- Icons: Lucide or Heroicons (CDN)
- Animations: CSS + Canvas (confetti)
- Audio: Web Audio API (simple win sounds)
- Storage: `localStorage` for current session

## Folder Structure

```
cortisolmaxxing/
├── index.html                 # Main hub / game selector
├── games/
│   ├── roulette.html
│   ├── blackjack.html
│   └── slots.html
├── assets/
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── utils.js
│       ├── balance.js
│       ├── confetti.js
│       └── sounds.js
├── components/                # Reusable JS components
├── img/                       # Chips, cards, symbols
└── README.md
```

## Global State

```js
// Shared across all pages via balance.js
const state = {
  balance: 1000,
  sessionStartBalance: 1000,
  totalWon: 0,
  biggestWin: 0,
  gamesPlayed: 0,
  currentStreak: 0,
  betAmount: 50
};
```

## Core UI Layout (Luxury Casino Theme)

- **Dark background** (`#0a0a0a` or deep burgundy)
- **Gold accents** (`#ffd700`, neon glows)
- **Elegant fonts** (serif for headings, sans for body)
- **Header**: Logo "CORTISOLMAXXING", large animated balance, Session Profit, Streak
- **Game Hub** (`index.html`): Three luxurious game cards
- **Floating Bet Panel**: Bottom on mobile, right sidebar on desktop
  - Bet input + quick buttons (10, 50, 100, 500, MAX)
  - Big glowing "Place Bet" / "Spin / Deal" button
- **Session Stats Modal**

## Common Game Flow

1. Player selects/adjusts bet amount
2. Makes game-specific choices
3. Triggers action (Spin/Deal/Roll)
4. Dramatic animation + pause
5. **Player wins** (heavily biased or guaranteed favorable outcome)
6. Balance update with flying numbers, confetti, win sound
7. "Play Again" prompt

## Game Specifications

### 1. Roulette
- European wheel (37 numbers)
- Bet types: Straight-up (35:1), Red/Black, Odd/Even, Dozens, Columns
- Visual: CSS/ Canvas spinning wheel
- Win Logic: Strong bias to player's bets. Guarantee at least one win if multiple bets placed.

### 2. Blackjack
- Standard rules (Dealer stands on 17+)
- Player actions: Hit, Stand, Double Down
- Win Logic: Player gets strong starting hands; dealer busts frequently when player is vulnerable.

### 3. Slots
- 3 reels with luxury symbols (7, Diamond, Cherry, Bell, Gold Bar, Wild, 🤑)
- Payout table heavily skewed toward wins
- Spin animation with reel blur + stopping sequence
- Big wins trigger massive confetti

## Animations & Polish

- Smooth balance counter animation
- Button hover/press effects (glow + scale)
- Win pop-ups with multipliers
- Confetti on wins > $200
- Mobile-first Tailwind classes
- Sound toggle (win jingles, spin sounds)

## Session Stats
- Total profit
- Biggest single win
- Games played
- Current win streak
- Reset session option

## Development Plan

1. Create main hub (`index.html`) + shared utilities
2. Implement Slots (easiest visually rewarding game)
3. Implement Roulette
4. Implement Blackjack
5. Add polish: confetti, sounds, animations
6. Test mobile responsiveness
7. Deploy to GitHub Pages

## Next Steps

- Generate starter files (`index.html`, shared JS/CSS)
- Build one game at a time

---

**Ready to code.** Let me know if you want any adjustments to this document or if I should start generating the actual code files now.