# ♠ Poker Trainer

A premium **No-Limit Texas Hold'em** training app that coaches every decision. Play 6-max cash
against styled AI or drill curated spots, and for every action — check, bet, raise, call, fold — get
a **verdict** (optimal → blunder), your **live win probability (equity)**, the **EV of each option**,
and a plain-language explanation of *why*.

Built with Next.js (App Router) + React + TypeScript, Tailwind, Framer Motion, and Zustand. Runs
entirely in your browser — **no account, no backend, no API keys required.**

---

## ✨ Features

- **Play mode** — 6-max cash vs five AI styles (Nit, TAG, LAG, Calling Station, Balanced), 100bb
  deep. Full hand flow: blinds, betting rounds, button rotation, all-ins, and **correct side pots**.
- **Drill mode** — a data-driven library of curated spots (opening ranges, 3-bet/defend, c-betting,
  turn barrels, river bluff-catching, pot-odds math) with per-category progress tracking.
- **Live equity & EV overlay** — a real-time win-% bar, pot odds, and per-action EV table while you
  decide. Heavy simulations run in a **Web Worker** so the UI never freezes.
- **Verdict on every move** — graded by EV loss vs the best line. Color **and** glyph coded
  (★ ✓ ≈ ! ✕) so it's color-blind safe.
- **Two coaches, one quality bar:**
  - **Offline coach** (default, free, instant, private) — a deterministic explanation engine that
    cites your actual pot odds, equity, position, board texture, and EV gap, and detects recurring
    leaks locally.
  - **Cloud coach** (optional, opt-in) — richer phrasing & open-ended Q&A via **DeepSeek**, proxied
    server-side so the API key is never exposed. Falls back to the offline coach automatically.
- **Hand history** — every hand saved locally; replay it street by street with the verdict on each
  decision.
- **Stats & leaks dashboard** — VPIP/PFR, accuracy by street, EV lost, win rate in bb/100, and a
  ranked list of your top recurring leaks with trends.
- **Range charts** — interactive 13×13 opening-range grids by position.
- **Design & polish** — dark "felt" table with neon accents, realistic animated cards & chips,
  fully responsive (mobile portrait → rich desktop), keyboard shortcuts, installable **PWA**,
  optional synthesized **sound effects**, and `prefers-reduced-motion` support.

---

## 🚀 Run locally

Requires **Node 18.18+** (Node 20+ recommended).

```bash
npm install
npm run dev
# open http://localhost:3000
```

That's it — the app is fully functional with **zero environment variables**. The offline coach is on
by default.

### Useful scripts

| Script                 | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the dev server                          |
| `npm run build`        | Production build                              |
| `npm start`            | Serve the production build                    |
| `npm test`             | Run the engine + stats unit tests (Vitest)    |
| `npm run typecheck`    | Strict TypeScript check (no emit)             |
| `npm run lint`         | ESLint                                        |
| `npm run format`       | Prettier write                                |
| `npm run gen:icons`    | Regenerate PWA PNG icons from the SVG logo    |

---

## 🔐 Environment variables

The app needs **none** to run. The only variable enables the optional Cloud coach. See
[`.env.example`](./.env.example).

| Variable            | Required | Purpose                                                            |
| ------------------- | -------- | ----------------------------------------------------------------- |
| `DEEPSEEK_API_KEY`  | No       | Enables the Cloud (DeepSeek) coach. Read **server-side only**.     |
| `DEEPSEEK_BASE_URL` | No       | Override the DeepSeek API base URL (default `https://api.deepseek.com`). |
| `DEEPSEEK_MODEL`    | No       | Override the model (default `deepseek-chat`).                      |

To try the Cloud coach locally:

```bash
cp .env.example .env.local
# edit .env.local and set DEEPSEEK_API_KEY=sk-...
npm run dev
```

`.env.local` is gitignored. The key is read only inside the server route handler
(`src/app/api/coach/route.ts`) and is never sent to the browser. If the key is missing, the network
fails, or the request errors, the app silently falls back to the offline coach.

---

## 🧠 The engine: assumptions & limitations

The equity and pot-odds math are **exact**; the strategy recommendation is an **honest heuristic**,
not a real solver. Specifically:

- **Hand evaluator** (`src/engine/evaluator.ts`) — a correct, fast 5–7 card evaluator producing a
  single comparable score. Exhaustively unit-tested.
- **Equity calculator** (`src/engine/equity.ts`) — exact enumeration when the run-out space is small,
  Monte Carlo otherwise. Verified against known references (e.g. AA vs KK ≈ 82.6% / 17%).
- **Pot odds & EV** (`src/engine/potodds.ts`) — exact break-even equity, EV of call/check, and a
  simple fold-equity model for bets/raises (a teaching approximation that ignores future streets).
- **"GTO-approximate" strategy** (`src/engine/strategy.ts`, `ranges.ts`) — **not** a CFR solver.
  Preflop ranges are derived by percentile from the well-known **Chen formula**; postflop decisions
  blend exact equity, pot odds, position, and board texture. It is deterministic, explainable, and
  good enough to coach, but it is an approximation — treat it as a strong study aid, not gospel.
- **Verdict bucketing** (`src/engine/verdict.ts`) — grades your action by EV loss in big blinds
  against the best available action, using centralized thresholds.
- **AI opponents** (`src/engine/bots.ts`) — use the same engine, biased by a style profile
  (looseness, aggression, calling tendency). Believable, not theoretically perfect.

**Scope:** Hold'em only for v1; the card/evaluator layer is generic enough to extend to PLO later.
**Not gambling** — there is no real money, wagering, or chance to win anything. For study and
entertainment.

### Project structure

```
src/
  engine/        Pure, framework-free poker logic + unit tests
  coach/         Offline + Cloud coach providers, leak detection
  server/        Server-only LLM provider (DeepSeek)
  store/         Zustand stores (game, settings, drills)
  workers/       Equity Web Worker
  components/    UI primitives, table, coach, charts, brand
  app/           Next.js App Router pages + /api/coach route
  data/          drills.json (data-driven drill library)
  design/        Typed design tokens
  lib/           storage, history, stats, sound, helpers
```

---

## ✅ Quality

- Strict TypeScript (`strict`, `noUncheckedIndexedAccess`, no `any` in the engine).
- 68 unit tests across the evaluator, equity, pot-odds/EV, verdict, ranges, game engine
  (incl. side pots & all-ins), and stats.
- ESLint + Prettier configured and passing.
- Production build verified to succeed with **zero environment variables**.

---

## 📦 Deploy to GitHub + Vercel

See the step-by-step walkthrough in the assistant's final message, or:

1. `git init && git add . && git commit -m "Initial commit"`
2. Create an empty GitHub repo, then
   `git remote add origin <url> && git branch -M main && git push -u origin main`
3. Import the repo at [vercel.com/new](https://vercel.com/new) (Vercel auto-detects Next.js).
4. (Optional) add `DEEPSEEK_API_KEY` under **Settings → Environment Variables**.
5. **Deploy.** Future pushes to `main` auto-deploy.

---

## License

For personal study & entertainment. Not affiliated with any casino or gambling operator.
