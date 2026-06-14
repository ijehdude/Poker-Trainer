'use client';

import { useState, useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Lightweight, accessible tooltip. Shows on hover and keyboard focus, and
 * is announced via `aria-describedby`. No portal — positioned relative to
 * the trigger; fine for short hints.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute left-1/2 z-[80] w-max max-w-xs -translate-x-1/2 rounded-md border border-panel-border bg-panel-raised px-2.5 py-1.5 text-xs text-ink-secondary shadow-deep',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
