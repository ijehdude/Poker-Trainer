import { cn } from '@/lib/cn';

export function Stat({
  label,
  value,
  sub,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: 'neon' | 'gold' | 'danger' | 'none';
  className?: string;
}) {
  const accentClass =
    accent === 'neon'
      ? 'text-accent'
      : accent === 'gold'
        ? 'text-accent-gold'
        : accent === 'danger'
          ? 'text-danger'
          : 'text-ink';
  return (
    <div
      className={cn('rounded-md border border-panel-border bg-panel-raised px-3 py-2.5', className)}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={cn('nums mt-1 font-display text-xl font-bold leading-none', accentClass)}>
        {value}
      </div>
      {sub && <div className="nums mt-1 text-xs text-ink-secondary">{sub}</div>}
    </div>
  );
}
