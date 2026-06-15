'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from '@/components/brand/Wordmark';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/play', label: 'Play' },
  { href: '/drills', label: 'Drills' },
  { href: '/charts', label: 'Charts' },
  { href: '/history', label: 'History' },
  { href: '/stats', label: 'Stats' },
];

export function AppHeader({ right }: { right?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="bg-bg/80 pt-safe sticky top-0 z-50 border-b border-panel-border backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <Wordmark />
          <span
            className="font-mono text-[10px] text-ink-muted/70"
            title="Live build commit — confirms which version is deployed"
          >
            build:{process.env.NEXT_PUBLIC_COMMIT ?? 'dev'}
          </span>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-panel-raised text-accent' : 'text-ink-secondary hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-panel-border px-2 py-1.5 md:hidden">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                active ? 'bg-panel-raised text-accent' : 'text-ink-secondary',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
