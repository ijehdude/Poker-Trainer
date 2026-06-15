'use client';

import { motion } from 'framer-motion';
import type { GameState } from '@/engine/gameEngine';
import { currentPot } from '@/engine/gameEngine';
import { describeWinner } from './winnerText';
import { Seat, type SeatAlign } from './Seat';
import { Board } from './Board';
import { PotDisplay } from './PotDisplay';
import { ChipStack } from './Chip';
import { cn } from '@/lib/cn';

/**
 * Seat anchor points (percent of the table box), for a 5-handed table.
 * Hero is seat 0 and is LOCKED at bottom-center — it never moves with the
 * button. The four opponents are distributed symmetrically left/right, which
 * leaves the top-center slot empty (reserved for the pot — see below).
 */
// Hero is fixed at bottom-center (x:50). Side seats anchor on the felt RIM:
// left seats place their LEFT edge here (avatar on the rail, content extends
// right); right seats place their RIGHT edge here (content extends left). This
// is what keeps the pods on the rim without clipping the table edge. Mirrored
// left/right; the top-center slot stays empty for the pot.
const SEAT_POS: { x: number; y: number }[] = [
  { x: 50, y: 78 }, // 0 hero — fixed bottom-center (centered)
  { x: 12, y: 75 }, // 1 lower-left
  { x: 5, y: 46 }, // 2 mid-left (left edge on the rim)
  { x: 95, y: 46 }, // 3 mid-right (right edge on the rim)
  { x: 88, y: 75 }, // 4 lower-right
];

/** Where each seat's bet chips sit (pulled toward the pot/board). */
const BET_POS: { x: number; y: number }[] = [
  { x: 50, y: 62 }, // hero
  { x: 32, y: 66 }, // 1 lower-left
  { x: 24, y: 48 }, // 2 mid-left
  { x: 76, y: 48 }, // 3 mid-right
  { x: 68, y: 66 }, // 4 lower-right
];

function winningsFor(game: GameState, seatId: number): number {
  return game.winners.filter((w) => w.seatId === seatId).reduce((sum, w) => sum + w.amount, 0);
}

export function PokerTable({
  game,
  compact = false,
  fill = false,
}: {
  game: GameState;
  compact?: boolean;
  /** Height-driven sizing for the no-scroll desktop layout. */
  fill?: boolean;
}) {
  const pot = currentPot(game);
  const showWinners = game.status === 'complete';
  const winnerLine = showWinners ? describeWinner(game) : null;

  return (
    <div
      className={
        fill
          ? 'relative mx-auto aspect-[3/4] w-full max-w-md sm:aspect-[16/10] lg:h-full lg:max-h-full lg:w-auto lg:max-w-full'
          : 'relative mx-auto aspect-[3/4] w-full max-w-md sm:aspect-[16/10] sm:max-w-3xl'
      }
    >
      {/* Felt surface */}
      <div className="ring-felt-light/30 absolute inset-[6%] rounded-[44%] bg-felt-radial shadow-deep ring-1 sm:rounded-[46%]">
        <div className="absolute inset-2 rounded-[44%] ring-1 ring-inset ring-black/40 sm:inset-3 sm:rounded-[46%]" />
        <div className="absolute inset-0 rounded-[44%] bg-neon-sheen opacity-30 sm:rounded-[46%]" />
      </div>

      {/* Pot — at the empty top-center slot (no player ever sits here) */}
      <div
        className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
        style={{ left: '50%', top: '11%' }}
      >
        <PotDisplay amount={pot} bigBlind={game.bigBlind} />
      </div>

      {/* Community board — true center, directly below the pot */}
      <div
        className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
        style={{ left: '50%', top: '43%' }}
      >
        <Board cards={game.board} size={compact ? 'sm' : 'table'} />
      </div>

      {/* Winner callout (auto-clears when the next hand begins) */}
      {winnerLine && (
        <motion.div
          className="absolute left-1/2 z-40 -translate-x-1/2 -translate-y-1/2"
          style={{ top: '63%' }}
          initial={{ opacity: 0, scale: 0.8, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        >
          <div className="border-accent-gold/50 rounded-full border bg-black/75 px-3 py-1.5 text-center text-[clamp(0.7rem,1.4vw,0.85rem)] font-semibold text-accent-gold shadow-gold backdrop-blur">
            {winnerLine}
          </div>
        </motion.div>
      )}

      {/* Per-seat bet chips */}
      {game.seats.map((seat) => {
        if (seat.streetCommitted <= 0 || seat.status === 'empty') return null;
        const pos = BET_POS[seat.id];
        if (!pos) return null;
        return (
          <div
            key={`bet-${seat.id}`}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <ChipStack amount={seat.streetCommitted} size={16} animateKey={seat.streetCommitted} />
          </div>
        );
      })}

      {/* Seats */}
      {game.seats.map((seat) => {
        if (seat.status === 'empty') return null;
        const pos = SEAT_POS[seat.id];
        if (!pos) return null;
        // Side seats anchor on the rim and grow inward; the hero is centered.
        const align: SeatAlign = seat.isHero
          ? 'center'
          : pos.x < 40
            ? 'left'
            : pos.x > 60
              ? 'right'
              : 'center';
        const xClass =
          align === 'left'
            ? 'translate-x-0'
            : align === 'right'
              ? '-translate-x-full'
              : '-translate-x-1/2';
        return (
          <motion.div
            key={`seat-${seat.id}`}
            className={cn('absolute z-40 -translate-y-1/2', xClass)}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Seat
              seat={seat}
              align={align}
              isToAct={game.toAct === seat.id && game.status === 'betting'}
              isButton={game.buttonIndex === seat.id}
              reveal={game.revealed.includes(seat.id)}
              won={showWinners ? winningsFor(game, seat.id) : 0}
              compact={compact}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
