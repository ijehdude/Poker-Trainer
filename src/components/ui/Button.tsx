'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-ink-inverse shadow-neon hover:brightness-110 active:brightness-95 font-semibold',
  secondary:
    'bg-panel-raised text-ink border border-panel-border hover:border-accent/40 hover:bg-panel',
  ghost: 'bg-transparent text-ink-secondary hover:text-ink hover:bg-panel-raised',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  gold: 'bg-accent-gold text-ink-inverse shadow-gold hover:brightness-110 font-semibold',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-sm gap-1.5',
  md: 'h-11 px-5 text-sm rounded-md gap-2',
  lg: 'h-14 px-7 text-base rounded-lg gap-2.5',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150',
        'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
        'active:scale-[0.98]',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
