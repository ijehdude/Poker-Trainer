'use client';

import { motion } from 'framer-motion';
import type { GameState } from '@/engine/gameEngine';
import { currentPot } from '@/engine/gameEngine';
import { Seat } from './Seat';
import { Board } from './Board';
import { PotDisplay } from './PotDisplay';
import { ChipStack } from './Chip';

/** Seat anchor points (percent of the table box). Hero is seat 0 at bottom. */
const SEAT_POS: { x: number; y: number }[] = [
  { x: 50, y: 87 }, // 0 hero (bottom)
  { x: 12, y: 65 }, // 1
  { x: 12, y: 25 }, // 2
  { x: 50, y: 8 }, // 3 (top)
  { x: 88, y: 25 }, // 4
  { x: 88, y: 65 }, // 5
];

/** Where each seat's bet chips sit (pulled toward the pot). */
const BET_POS: { x: number; y: number }[] = [
  { x: 50, y: 66 },
  { x: 30, y: 57 },
  { x: 30, y: 37 },
  { x: 50, y: 28 },
  { x: 70, y: 37 },
  { x: 70, y: 57 },
];

function winningsFor(game: GameState, seatId: number): number {
  return game.winners.filter((w) => w.seatId === seatId).reduce((sum, w) => sum + w.amount, 0);
}

export function PokerTable({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const pot = currentPot(game);
  const showWinners = game.status === 'complete';

  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-md sm:aspect-[16/10] sm:max-w-3xl">
      {/* Felt surface */}
      <div className="ring-felt-light/30 absolute inset-[6%] rounded-[44%] bg-felt-radial shadow-deep ring-1 sm:rounded-[46%]">
        <div className="absolute inset-2 rounded-[44%] ring-1 ring-inset ring-black/40 sm:inset-3 sm:rounded-[46%]" />
        <div className="absolute inset-0 rounded-[44%] bg-neon-sheen opacity-30 sm:rounded-[46%]" />
        {/* Center logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-felt-light/15 select-none font-display text-4xl font-bold sm:text-6xl">
            ♠
          </span>
        </div>
      </div>

      {/* Pot + board cluster (center) */}
      <div
        className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
        style={{ left: '50%', top: '44%' }}
      >
        <PotDisplay amount={pot} bigBlind={game.bigBlind} />
        <Board cards={game.board} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Per-seat bet chips */}
      {game.seats.map((seat) => {
        if (seat.streetCommitted <= 0 || seat.status === 'empty') return null;
        const pos = BET_POS[seat.id]!;
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
        const pos = SEAT_POS[seat.id]!;
        return (
          <motion.div
            key={`seat-${seat.id}`}
            className="absolute z-40 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Seat
              seat={seat}
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
