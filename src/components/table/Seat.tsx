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

export function Seat({
  seat,
  isToAct,
  isButton,
  reveal,
  won,
  compact = false,
}: {
  seat: SeatModel;
  isToAct: boolean;
  isButton: boolean;
  reveal: boolean;
  won?: number;
  compact?: boolean;
}) {
  if (seat.status === 'empty') return null;
  const folded = seat.status === 'folded';
  const showFace = seat.isHero || reveal;
  const cardSize = compact ? 'xs' : seat.isHero ? 'sm' : 'xs';

  return (
    <div className={cn('flex flex-col items-center gap-1', folded && 'opacity-50')}>
      {/* Hole cards */}
      <div className="flex -space-x-1.5">
        {seat.holeCards ? (
          seat.holeCards.map((c, i) => (
            <PlayingCard
              key={i}
              card={c}
              faceDown={!showFace}
              size={cardSize}
              dimmed={folded}
              className={i === 1 ? 'rotate-[6deg]' : '-rotate-[6deg]'}
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
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1">
            <span className="truncate text-xs font-semibold text-ink">{seat.name}</span>
            <span className="rounded bg-panel-raised px-1 text-[9px] font-medium text-ink-muted">
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
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">Folded</span>
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
