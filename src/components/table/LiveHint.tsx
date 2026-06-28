'use client';

import { useMemo } from 'react';
import { useGame } from '@/store/gameStore';
import { isHeroTurn } from '@/engine/gameEngine';
import { buildSeatContext } from '@/engine/decision';
import { evaluateDecision } from '@/engine/strategy';
import { cn } from '@/lib/cn';

/**
 * A slim, always-visible coaching pill shown on the hero's turn: the
 * recommended action plus live win-equity, so the read is never lost while
 * acting. Tapping it opens the full Coach view. Reuses the exact solver path
 * the CoachPanel uses (buildSeatContext → evaluateDecision) so the hint and
 * the detailed overlay can never disagree.
 */
export function LiveHint({ onOpenCoach }: { onOpenCoach?: () => void }) {
  const { game, heroEquity, equityLoading } = useGame();
  const heroTurn = !!game && isHeroTurn(game);

  const solution = useMemo(() => {
    if (!game || !heroTurn) return null;
    const seat = game.seats[game.toAct];
    if (!seat?.holeCards) return null;
    const ctx = buildSeatContext(game, seat.id, heroEquity?.equity ?? 0);
    return evaluateDecision(ctx);
  }, [game, heroTurn, heroEquity]);

  if (!heroTurn || !solution) return null;

  const rec = solution.recommended;
  const eqPct = Math.round((heroEquity?.equity ?? solution.factors.equity) * 100);
  const loading = equityLoading && !heroEquity;

  return (
    <button
      type="button"
      onClick={onOpenCoach}
      className={cn(
        'mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full',
        'border border-panel-border bg-panel/90 px-3 py-1.5 text-xs backdrop-blur',
        'transition-colors hover:border-accent/40',
      )}
      aria-label="Open coach for the full breakdown"
    >
      <span className="text-[11px] font-bold text-accent">ⓘ</span>
      <span className="text-ink-muted">Coach:</span>
      <span className="font-semibold capitalize text-ink">{rec.label}</span>
      <span className="text-ink-muted">·</span>
      <span className="nums font-semibold text-accent">{loading ? '…' : `${eqPct}%`} eq</span>
      <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted/70">
        Details ›
      </span>
    </button>
  );
}
