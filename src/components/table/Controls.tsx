'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LegalActions } from '@/engine/gameEngine';
import type { Action } from '@/engine/gameEngine';
import { Button } from '@/components/ui/Button';
import { formatAmount } from './Chip';
import { cn } from '@/lib/cn';

/**
 * Hero action bar with a bet-sizing slider and pot-fraction presets.
 * Sticky to the bottom on mobile for thumb reach; inline on desktop.
 */
export function Controls({
  legal,
  pot,
  currentBet,
  bigBlind,
  onAction,
  disabled,
}: {
  legal: LegalActions;
  pot: number;
  currentBet: number;
  bigBlind: number;
  onAction: (a: Action) => void;
  disabled?: boolean;
}) {
  const { minRaiseTo, maxRaiseTo } = legal;
  const [raiseTo, setRaiseTo] = useState(minRaiseTo);
  const [showSizer, setShowSizer] = useState(false);

  useEffect(() => {
    setRaiseTo((r) => Math.min(maxRaiseTo, Math.max(minRaiseTo, r || minRaiseTo)));
  }, [minRaiseTo, maxRaiseTo]);

  const presets = useMemo(() => {
    const mk = (frac: number) =>
      Math.min(maxRaiseTo, Math.max(minRaiseTo, Math.round((currentBet + frac * pot) * 2) / 2));
    return [
      { label: '½', to: mk(0.5) },
      { label: '¾', to: mk(0.75) },
      { label: 'Pot', to: mk(1) },
      { label: 'Max', to: maxRaiseTo },
    ];
  }, [minRaiseTo, maxRaiseTo, currentBet, pot]);

  const canRaise = legal.canRaise && maxRaiseTo > minRaiseTo - 0.001;
  const raiseLabel = legal.isBet ? 'Bet' : 'Raise';

  const fire = (a: Action) => {
    if (disabled) return;
    setShowSizer(false);
    onAction(a);
  };

  return (
    <div className="w-full">
      {/* Bet sizer */}
      {showSizer && canRaise && (
        <div className="bg-panel/95 mb-2 rounded-lg border border-panel-border p-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-ink-muted">{raiseLabel} to</span>
            <span className="nums font-display text-lg font-bold text-accent">
              {formatAmount(raiseTo)}
              <span className="ml-1 text-xs text-ink-muted">
                {(raiseTo / bigBlind).toFixed(1)}bb
              </span>
            </span>
          </div>
          <input
            type="range"
            min={minRaiseTo}
            max={maxRaiseTo}
            step={Math.max(0.5, bigBlind / 2)}
            value={raiseTo}
            onChange={(e) => setRaiseTo(Number(e.target.value))}
            className="w-full accent-[var(--accent-neon)]"
            aria-label="Bet size"
          />
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setRaiseTo(p.to)}
                className={cn(
                  'rounded-sm border px-2 py-1.5 text-xs font-semibold transition-colors',
                  Math.abs(raiseTo - p.to) < 0.01
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'hover:border-accent/40 border-panel-border text-ink-secondary',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary action row */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="danger"
          size="lg"
          disabled={disabled || !legal.canFold}
          onClick={() => fire({ type: 'fold' })}
        >
          Fold
        </Button>

        {legal.canCheck ? (
          <Button
            variant="secondary"
            size="lg"
            disabled={disabled}
            onClick={() => fire({ type: 'check' })}
          >
            Check
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            disabled={disabled || !legal.canCall}
            onClick={() => fire({ type: 'call' })}
          >
            Call
            <span className="nums ml-1 text-accent">{formatAmount(legal.callAmount)}</span>
          </Button>
        )}

        {canRaise ? (
          showSizer ? (
            <Button
              variant="gold"
              size="lg"
              disabled={disabled}
              onClick={() => fire({ type: legal.isBet ? 'bet' : 'raise', amount: raiseTo })}
            >
              {raiseLabel}
              <span className="nums ml-1">{formatAmount(raiseTo)}</span>
            </Button>
          ) : (
            <Button variant="gold" size="lg" disabled={disabled} onClick={() => setShowSizer(true)}>
              {raiseLabel}…
            </Button>
          )
        ) : (
          <Button variant="gold" size="lg" disabled>
            {raiseLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
