'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState } from '@/engine/gameEngine';
import { currentPot } from '@/engine/gameEngine';
import { describeWinner } from './winnerText';
import { Seat } from './Seat';
import { Board } from './Board';
import { PotDisplay } from './PotDisplay';
import { ChipStack } from './Chip';

/**
 * Seat geometry — ONE parametric ellipse function, no per-seat pixel offsets.
 *
 * Every seat (and its bet chips) is derived from the felt ellipse's measured
 * box:  point(θ) = (cx + rx·cosθ, cy + ry·sinθ).  Seat i sits at
 *   θ_i = 90° + i·(360/N),
 * so seat 0 (the hero) points straight down (bottom-center) and the rest are
 * spread evenly and symmetrically about the vertical axis. For the default
 * N = 5 the angles are [90, 162, 234, 306, 18]° → hero bottom-center, two seats
 * on the left arc, two on the right arc, and the top-center slot (270°) left
 * empty for the pot.
 *
 * Centers ride an inset ellipse (RADIUS_INSET of the rim) and are then clamped
 * so every cluster's bounding box stays inside the (padded) stage. Because the
 * stage is a layout sibling of the coach panel and sits above the action bar,
 * no cluster can ever reach the panel, the bar, or the window edges.
 */
const RADIUS_INSET = 0.92; // seat-center ellipse as a fraction of the felt rim
const BET_INSET = 0.5; // bet chips ride a smaller ellipse, pulled toward the pot
const STAGE_PAD = 10; // px breathing room inside the stage on every side

type Dims = { w: number; h: number };
type SeatPoint = { x: number; y: number; sin: number };

function safeClamp(v: number, lo: number, hi: number): number {
  if (hi < lo) return (lo + hi) / 2; // box too small for the margins → center it
  return Math.max(lo, Math.min(hi, v));
}

/** Angle (radians) for seat `i` of `n`; hero (i = 0) points straight down. */
function seatAngle(i: number, n: number): number {
  return Math.PI / 2 + (i * 2 * Math.PI) / n;
}

/**
 * A point on the inset ellipse for seat `i`, clamped so a cluster of size
 * 2·halfW × 2·halfH centered there stays fully inside `dims` (with padding).
 * The hero is pinned to the exact vertical center line.
 */
function seatPoint(
  i: number,
  n: number,
  dims: Dims,
  inset: number,
  halfW: number,
  halfH: number,
  isHero: boolean,
): SeatPoint {
  const cx = dims.w / 2;
  const cy = dims.h / 2;
  const ang = seatAngle(i, n);
  const sin = Math.sin(ang);
  const x = isHero ? cx : cx + (dims.w / 2) * inset * Math.cos(ang);
  const y = cy + (dims.h / 2) * inset * sin;
  return {
    x: safeClamp(x, halfW + STAGE_PAD, dims.w - halfW - STAGE_PAD),
    y: safeClamp(y, halfH + STAGE_PAD, dims.h - halfH - STAGE_PAD),
    sin,
  };
}

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

  // Measure the felt box so all seat math is relative to its rendered size.
  const boxRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<Dims>({ w: 0, h: 0 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = game.seats.length;
  const ready = dims.w > 0 && dims.h > 0;
  // Dense rendering on small/short stages (phones): smaller cards and tighter
  // clamp boxes so every seat pod stays inside the felt rim. Driven by the
  // measured box so it adapts to the actual rendered size, not a breakpoint.
  const dense = compact || (ready && (dims.w < 400 || dims.h < 480));
  // Cluster half-extents (px), sized to the rendered cluster. Used to face
  // cards inward and to clamp each cluster's bounding box inside the stage.
  const halfW = dense ? 64 : 96;
  const halfH = dense ? 50 : 66;
  const cardSize = dense ? 'sm' : 'table';
  // Pull seat centers a touch further off the rim on dense stages so pods get
  // breathing room from the felt edge.
  const radiusInset = dense ? 0.86 : RADIUS_INSET;

  // Outer sizing: `fill` is height-driven on every breakpoint so the ellipse
  // exactly fills the viewport-locked table region (never overflowing into a
  // scroll). The replay/standalone views keep an aspect ratio. Either way the
  // inner box is what gets measured.
  const outerClass = fill
    ? 'relative mx-auto h-full max-h-full w-full'
    : compact
      ? 'relative mx-auto aspect-[16/10] w-full max-w-3xl'
      : 'relative mx-auto aspect-[3/4] w-full max-w-md sm:aspect-[16/10] sm:max-w-3xl';

  return (
    <div className={outerClass}>
      <div
        ref={boxRef}
        data-testid="table-stage"
        className="absolute inset-0 select-none [-webkit-tap-highlight-color:transparent]"
      >
        {/* Felt — a true ellipse filling the stage box */}
        <div className="ring-felt-light/30 absolute inset-0 rounded-[50%] bg-felt-radial shadow-deep ring-1">
          <div className="absolute inset-2 rounded-[50%] ring-1 ring-inset ring-black/40 sm:inset-3" />
          <div className="absolute inset-0 rounded-[50%] bg-neon-sheen opacity-30" />
        </div>

        {/* Pot — upper-center, below the two top seats (no player sits at the
            top-center slot) and above the community board. */}
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: '50%', top: '27%' }}
        >
          <PotDisplay amount={pot} bigBlind={game.bigBlind} />
        </div>

        {/* Community board — center of the ellipse */}
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: '50%', top: '46%' }}
        >
          <Board cards={game.board} size={cardSize} />
        </div>

        {/* Winner callout (auto-clears when the next hand begins) */}
        {winnerLine && (
          <motion.div
            className="absolute left-1/2 z-40 -translate-x-1/2 -translate-y-1/2"
            style={{ top: '65%' }}
            initial={{ opacity: 0, scale: 0.8, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <div className="border-accent-gold/50 rounded-full border bg-black/75 px-3 py-1.5 text-center text-[clamp(0.7rem,1.4vw,0.85rem)] font-semibold text-accent-gold shadow-gold backdrop-blur">
              {winnerLine}
            </div>
          </motion.div>
        )}

        {ready && (
          <>
            {/* Per-seat bet chips — same angle, pulled toward the pot */}
            {game.seats.map((seat) => {
              if (seat.streetCommitted <= 0 || seat.status === 'empty') return null;
              const p = seatPoint(seat.id, n, dims, BET_INSET, 24, 24, seat.isHero);
              return (
                <div
                  key={`bet-${seat.id}`}
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: p.x, top: p.y }}
                >
                  <ChipStack
                    amount={seat.streetCommitted}
                    size={16}
                    animateKey={seat.streetCommitted}
                  />
                </div>
              );
            })}

            {/* Seats — one cluster each, centered on its ellipse point */}
            {game.seats.map((seat) => {
              if (seat.status === 'empty') return null;
              const p = seatPoint(seat.id, n, dims, radiusInset, halfW, halfH, seat.isHero);
              return (
                // Center the cluster on its ellipse point with a plain wrapper.
                // (The translate must NOT live on the motion element — Framer
                // writes its own `transform` for the entrance scale, which would
                // overwrite a Tailwind -translate and anchor by the corner.)
                <div
                  key={`seat-${seat.id}`}
                  data-testid="seat"
                  data-seat-id={seat.id}
                  className="absolute z-40"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}
                >
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Seat
                      seat={seat}
                      cardsBelow={p.sin < 0}
                      isToAct={game.toAct === seat.id && game.status === 'betting'}
                      isButton={game.buttonIndex === seat.id}
                      reveal={game.revealed.includes(seat.id)}
                      won={showWinners ? winningsFor(game, seat.id) : 0}
                      compact={dense}
                    />
                  </motion.div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
