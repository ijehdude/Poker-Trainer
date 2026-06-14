import Link from 'next/link';

/**
 * Poker Trainer wordmark: a spade glyph inside a neon-ringed token,
 * followed by the product name. Classy, compact, scales down cleanly.
 */
export function Wordmark({ href = '/' }: { href?: string | null }) {
  const content = (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="h-8 w-8" />
      <span className="font-display text-lg font-bold tracking-tight">
        Poker<span className="text-accent"> Trainer</span>
      </span>
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} aria-label="Poker Trainer — home" className="shrink-0">
      {content}
    </Link>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Poker Trainer logo"
      fill="none"
    >
      <defs>
        <linearGradient id="pt-ring" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="#5dffba" />
          <stop offset="0.55" stopColor="#3ef2a1" />
          <stop offset="1" stopColor="#e7c46a" />
        </linearGradient>
        <radialGradient id="pt-felt" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#16412f" />
          <stop offset="1" stopColor="#0b2018" />
        </radialGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="url(#pt-felt)"
        stroke="url(#pt-ring)"
        strokeWidth="2.5"
      />
      {/* spade */}
      <path
        d="M24 13c4.5 4.6 9 7.6 9 12.1 0 3-2.3 5-5 5-1.4 0-2.7-.6-3.5-1.6.2 2 .9 3.4 2.3 4.5h-5.6c1.4-1.1 2.1-2.5 2.3-4.5-.8 1-2.1 1.6-3.5 1.6-2.7 0-5-2-5-5C15 20.6 19.5 17.6 24 13Z"
        fill="#f2f6f3"
      />
    </svg>
  );
}
