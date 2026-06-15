'use client';

import { motion } from 'framer-motion';
import type { Seat as SeatModel } from '@/engine/gameEngine';
import { POSITION_LABELS } from '@/engine/ranges';
import { PlayingCard } from './PlayingCard';
import { formatAmount } from './Chip';
import { cn } from '@/lib/cn';

const ACTION_LABEL: Record<string, string> = {
  fold: 'Fold',
  check: 'Check',
  call: 'Call',
  bet: 'Bet',
  raise: 'Raise',
};

const STYLE_RING: Record<string, string> = {
  nit: 'ring-info/60',
  tag: 'ring-accent/60',
  lag: 'ring-danger/60',
  station: 'ring-warning/60',
  balanced: 'ring-accent-gold/60',
};

export type SeatAlign = 'left' | 'right' | 'center';

export function Seat({
  seat,
  isToAct,
  isButton,
  reveal,
  won,
  compact = false,
  align = 'center',
}: {
  seat: SeatModel;
  isToAct: boolean;
  isButton: boolean;
  reveal: boolean;
  won?: number;
  compact?: boolean;
  /**
   * Which way the pod grows. Side seats anchor their avatar on the rail and
   * extend their cards/name INWARD so nothing clips the table edge.
   */
  align?: SeatAlign;
}) {
  if (seat.status === 'empty') return null;
  const folded = seat.status === 'folded';
  const showFace = seat.isHero || reveal;
  // One consistent card size for every seat (and the board). Hero cards are
  // distinguished by being face-up + highlighted, not by being larger.
  const cardSize = compact ? 'sm' : 'table';
  const itemsClass =
    align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';

  return (
    <div
      className={cn('flex flex-col gap-1', itemsClass, folded && 'opacity-45 saturate-[0.4]')}
    >
      {/* Hole cards */}
      <div className={cn('flex', seat.isHero ? 'gap-1' : '-space-x-1.5')}>
        {seat.holeCards ? (
          seat.holeCards.map((c, i) => (
            <PlayingCard
              key={i}
              card={c}
              faceDown={!showFace}
              size={cardSize}
              dimmed={folded}
              highlight={seat.isHero && isToAct}
              className={
                seat.isHero
                  ? i === 1
                    ? 'rotate-[3deg]'
                    : '-rotate-[3deg]'
                  : i === 1
                    ? 'rotate-[6deg]'
                    : '-rotate-[6deg]'
              }
            />
          ))
        ) : (
          <div className="h-10" />
        )}
      </div>

      {/* Name plate */}
      <motion.div
        animate={isToAct ? { scale: 1.04 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          'bg-panel/90 relative flex items-center gap-2 rounded-full border px-2.5 py-1 backdrop-blur',
          align === 'right' && 'flex-row-reverse',
          isToAct ? 'border-accent shadow-neon' : 'border-panel-border',
        )}
      >
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-felt-700 text-[11px] font-bold ring-2',
            seat.style ? STYLE_RING[seat.style] : 'ring-accent',
          )}
        >
          {seat.isHero ? '★' : seat.name.slice(0, 2)}
        </div>
        <div className={cn('min-w-0 leading-tight', align === 'right' && 'text-right')}>
          <div className={cn('flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
            <span className="truncate text-xs font-semibold text-ink">{seat.name}</span>
            <span className="rounded bg-black/55 px-1.5 text-[10px] font-bold tracking-wide text-ink ring-1 ring-white/15">
              {seat.position}
            </span>
          </div>
          <div className="nums text-[11px] font-medium text-accent">{formatAmount(seat.stack)}</div>
        </div>

        {isButton && (
          <span
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-gold text-[10px] font-bold text-ink-inverse shadow-gold"
            title="Dealer button"
          >
            D
          </span>
        )}
      </motion.div>

      {/* Last action / all-in / win badge */}
      <div className="h-4">
        {won && won > 0 ? (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full bg-accent px-2 text-[10px] font-bold text-ink-inverse shadow-neon"
          >
            +{formatAmount(won)}
          </motion.span>
        ) : seat.status === 'allin' ? (
          <span className="bg-danger/20 rounded-full px-2 text-[10px] font-bold uppercase text-danger">
            All-in
          </span>
        ) : seat.lastAction && !folded ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
            {ACTION_LABEL[seat.lastAction.type]}
          </span>
        ) : folded ? (
          <span className="bg-ink/10 rounded-full px-2 text-[10px] font-bold uppercase tracking-wider text-ink-secondary ring-1 ring-white/10">
            Folded
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function seatTooltip(seat: SeatModel): string {
  return seat.style
    ? `${seat.name} · ${POSITION_LABELS[seat.position]}`
    : `You · ${POSITION_LABELS[seat.position]}`;
}
