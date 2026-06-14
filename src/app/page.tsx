import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';

const features = [
  {
    title: 'Live equity & EV',
    body: 'A real-time win-% bar, pot odds, and the EV of every action while you decide.',
    icon: '📊',
  },
  {
    title: 'Verdict on every move',
    body: 'Optimal → blunder, graded by EV loss against the best line, with a plain-language why.',
    icon: '⚖️',
  },
  {
    title: 'Play vs styled AI',
    body: 'Six-max cash against Nit, TAG, LAG, Calling Station, and Balanced opponents.',
    icon: '🃏',
  },
  {
    title: 'Drill curated spots',
    body: 'Quiz yourself on opening ranges, 3-bets, c-bets, barrels, and bluff-catches.',
    icon: '🎯',
  },
  {
    title: 'Leak tracker',
    body: 'Aggregates your play and surfaces recurring mistakes with trends over time.',
    icon: '🔍',
  },
  {
    title: 'Offline-first coach',
    body: 'A genuinely useful coach with zero API keys. Add DeepSeek for richer Q&A.',
    icon: '🧠',
  },
];

export default function HomePage() {
  return (
    <main className="pt-safe relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
      {/* Top bar */}
      <header className="flex items-center justify-between py-6">
        <Wordmark />
        <nav className="hidden items-center gap-6 text-sm text-ink-secondary sm:flex">
          <Link href="/charts" className="transition-colors hover:text-ink">
            Charts
          </Link>
          <Link href="/drills" className="transition-colors hover:text-ink">
            Drills
          </Link>
          <Link href="/stats" className="transition-colors hover:text-ink">
            Stats
          </Link>
          <Link
            href="/play"
            className="rounded-pill bg-accent px-4 py-2 font-semibold text-ink-inverse shadow-neon transition-transform hover:scale-[1.03]"
            style={{ borderRadius: 999 }}
          >
            Play now
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center py-12 text-center sm:py-20">
        <span className="bg-panel/60 mb-5 inline-flex items-center gap-2 rounded-full border border-panel-border px-3 py-1 text-xs font-medium text-ink-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-neon" />
          No-Limit Texas Hold’em · coached every decision
        </span>
        <h1 className="max-w-3xl text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Play poker that{' '}
          <span className="neon-text bg-gradient-to-r from-accent via-accent-glow to-accent-gold bg-clip-text text-transparent">
            teaches you
          </span>{' '}
          as you go.
        </h1>
        <p className="mt-6 max-w-xl text-balance text-base text-ink-secondary sm:text-lg">
          A premium felt-table experience that grades every check, bet, and fold — with live win
          probability, pot odds, and a coach that explains the math behind the right play.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/play"
            className="rounded-pill bg-accent px-7 py-3.5 font-semibold text-ink-inverse shadow-neon transition-transform hover:scale-[1.03]"
            style={{ borderRadius: 999 }}
          >
            Deal me in →
          </Link>
          <Link
            href="/drills"
            className="bg-panel/60 hover:border-accent/40 rounded-pill border border-panel-border px-7 py-3.5 font-semibold text-ink transition-colors"
            style={{ borderRadius: 999 }}
          >
            Practice drills
          </Link>
        </div>
        <p className="mt-5 text-xs text-ink-muted">
          Free · runs entirely in your browser · no account needed
        </p>
      </section>

      {/* Feature grid */}
      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass rounded-lg p-5 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="mb-3 text-2xl" aria-hidden>
              {f.icon}
            </div>
            <h3 className="font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="pb-safe border-t border-panel-border py-6 text-center text-xs text-ink-muted">
        Poker Trainer · for study & entertainment. Strategy output is GTO-<em>approximate</em>, not
        a live solver. Not gambling.
      </footer>
    </main>
  );
}
