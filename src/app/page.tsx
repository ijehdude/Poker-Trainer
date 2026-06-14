import Link from 'next/link';
import { Wordmark } from '@/components/brand/Wordmark';

// Shown on the landing page (fits one viewport). The full feature set lives
// inside the app.
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
];

export default function HomePage() {
  return (
    <main className="fit-screen pt-safe relative mx-auto flex max-w-6xl flex-col px-[clamp(1rem,3vw,2rem)]">
      {/* Top bar */}
      <header className="flex items-center justify-between py-[clamp(0.75rem,2vh,1.5rem)]">
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
          >
            Play now
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-[clamp(0.75rem,1.6vh,1.5rem)] py-[clamp(0.5rem,2vh,2rem)] text-center">
        <span className="bg-panel/60 inline-flex items-center gap-2 rounded-full border border-panel-border px-3 py-1 text-[clamp(0.7rem,1.4vw,0.8rem)] font-medium text-ink-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-neon" />
          No-Limit Texas Hold’em · coached every decision
        </span>
        <h1 className="max-w-3xl text-balance font-display text-[clamp(2rem,5.2vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight">
          Play poker that{' '}
          <span className="neon-text bg-gradient-to-r from-accent via-accent-glow to-accent-gold bg-clip-text text-transparent">
            teaches you
          </span>{' '}
          as you go.
        </h1>
        <p className="max-w-xl text-balance text-[clamp(0.9rem,1.7vw,1.125rem)] text-ink-secondary">
          A premium felt-table experience that grades every check, bet, and fold — with live win
          probability, pot odds, and a coach that explains the math behind the right play.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/play"
            className="rounded-pill bg-accent px-7 py-3 font-semibold text-ink-inverse shadow-neon transition-transform hover:scale-[1.03]"
          >
            Deal me in →
          </Link>
          <Link
            href="/drills"
            className="bg-panel/60 hover:border-accent/40 rounded-pill border border-panel-border px-7 py-3 font-semibold text-ink transition-colors"
          >
            Practice drills
          </Link>
        </div>
        <p className="text-[clamp(0.7rem,1.3vw,0.8rem)] text-ink-muted">
          Free · runs entirely in your browser · no account needed
        </p>
      </section>

      {/* Feature grid (three cards, always visible) */}
      <section className="grid gap-[clamp(0.6rem,1.4vw,1rem)] pb-[clamp(0.75rem,2vh,1.5rem)] sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass rounded-lg p-[clamp(0.75rem,1.6vw,1.25rem)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="mb-2 text-[clamp(1.25rem,2.4vw,1.5rem)]" aria-hidden>
              {f.icon}
            </div>
            <h3 className="font-display text-[clamp(0.95rem,1.6vw,1.125rem)] font-semibold">
              {f.title}
            </h3>
            <p className="mt-1 text-[clamp(0.78rem,1.3vw,0.875rem)] leading-relaxed text-ink-secondary">
              {f.body}
            </p>
          </div>
        ))}
      </section>

      <footer className="pb-safe border-t border-panel-border py-[clamp(0.5rem,1.4vh,1rem)] text-center text-[clamp(0.65rem,1.2vw,0.75rem)] text-ink-muted">
        Poker Trainer · for study & entertainment. Strategy output is GTO-<em>approximate</em>, not
        a live solver. Not gambling.
      </footer>
    </main>
  );
}
