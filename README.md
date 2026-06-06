# Cortisolmaxxing

Luxury casino gambling simulator — **you always win**.

Roulette, Blackjack, and Slots in a single-page web app with a dark gold aesthetic, session stats, confetti, and rigged odds in your favor.

## Play locally

```bash
cd Cortisolmaxxing
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Deploy

Push to `main`. GitHub Actions deploys the site root to GitHub Pages (enable Pages → source: **GitHub Actions** in repo settings).

## Stack

- HTML + Tailwind CSS (CDN)
- Vanilla ES modules
- Lucide icons
- `localStorage` for session state and sound preference
