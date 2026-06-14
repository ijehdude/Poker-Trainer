'use client';

import { motion } from 'framer-motion';
import type { Card } from '@/engine/types';
import { SUIT_SYMBOL, rankChar } from '@/engine/cards';
import { cn } from '@/lib/cn';

type CardSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<CardSize, { box: string; rank: string; pip: string; center: string }> = {
  xs: {
    box: 'w-7 h-10 rounded-[5px]',
    rank: 'text-[11px]',
    pip: 'text-[9px]',
    center: 'text-base',
  },
  sm: { box: 'w-9 h-13 rounded-md', rank: 'text-sm', pip: 'text-[11px]', center: 'text-xl' },
  md: { box: 'w-12 h-[4.4rem] rounded-md', rank: 'text-lg', pip: 'text-sm', center: 'text-2xl' },
  lg: { box: 'w-16 h-24 rounded-lg', rank: 'text-2xl', pip: 'text-lg', center: 'text-4xl' },
};

/**
 * A realistic playing card with a 3D flip between face-down and face-up.
 * Suit is conveyed by symbol shape (color-blind safe) and color. Cards
 * deal/flip with spring motion; reduced-motion users get instant state
 * via Framer's global reduced-motion handling.
 */
export function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  className,
  highlight,
  dimmed,
}: {
  card?: Card | null;
  faceDown?: boolean;
  size?: CardSize;
  className?: string;
  highlight?: boolean;
  dimmed?: boolean;
}) {
  const s = SIZES[size];
  const isRed = card ? card.suit === 'h' || card.suit === 'd' : false;
  const showBack = faceDown || !card;

  return (
    <div className={cn('relative [perspective:900px]', className)}>
      <motion.div
        className={cn('relative [transform-style:preserve-3d]', s.box)}
        animate={{ rotateY: showBack ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      >
        {/* Face */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col justify-between overflow-hidden p-1 [backface-visibility:hidden]',
            s.box,
            'bg-[var(--card-face)] shadow-card',
            highlight && 'shadow-neon ring-2 ring-accent',
            dimmed && 'opacity-55 saturate-50',
          )}
          style={{
            backgroundImage:
              'linear-gradient(160deg, #ffffff 0%, var(--card-face) 55%, #e8edea 100%)',
          }}
        >
          {card && (
            <>
              <div className={cn('flex flex-col items-start leading-none', s.rank)}>
                <span
                  className={cn(
                    'font-bold',
                    isRed ? 'text-[var(--card-red)]' : 'text-[var(--card-black)]',
                  )}
                >
                  {rankChar(card.rank)}
                </span>
                <span
                  className={cn(
                    s.pip,
                    isRed ? 'text-[var(--card-red)]' : 'text-[var(--card-black)]',
                  )}
                >
                  {SUIT_SYMBOL[card.suit]}
                </span>
              </div>
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  s.center,
                  isRed ? 'text-[var(--card-red)]' : 'text-[var(--card-black)]',
                )}
                aria-hidden
              >
                {SUIT_SYMBOL[card.suit]}
              </div>
              <div
                className={cn('flex rotate-180 flex-col items-start self-end leading-none', s.rank)}
              >
                <span
                  className={cn(
                    'font-bold',
                    isRed ? 'text-[var(--card-red)]' : 'text-[var(--card-black)]',
                  )}
                >
                  {rankChar(card.rank)}
                </span>
                <span
                  className={cn(
                    s.pip,
                    isRed ? 'text-[var(--card-red)]' : 'text-[var(--card-black)]',
                  )}
                >
                  {SUIT_SYMBOL[card.suit]}
                </span>
              </div>
              <span className="sr-only">
                {rankChar(card.rank)} of{' '}
                {{ s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }[card.suit]}
              </span>
            </>
          )}
        </div>

        {/* Back */}
        <div
          className={cn(
            'absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]',
            s.box,
            'border-felt-light/40 border shadow-card',
          )}
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--felt-700) 0px, var(--felt-700) 3px, var(--felt-800) 3px, var(--felt-800) 6px)',
          }}
        >
          <div className="border-accent/25 absolute inset-1 rounded-[3px] border" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-accent/40">♠</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
