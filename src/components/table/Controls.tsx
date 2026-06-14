'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LegalActions } from '@/engine/gameEngine';
import type { Action } from '@/engine/gameEngine';
import { Button } from '@/components/ui/Button';
import { formatAmount } from './Chip';
import { cn } from '@/lib/cn';

/** Small keycap hint shown on action buttons. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1.5 hidden rounded border border-white/25 bg-black/25 px-1 text-[9px] font-bold leading-[14px] text-current opacity-90 sm:inline-block">
      {children}
    </kbd>
  );
}

/**
 * Hero action bar with a bet-sizing control (slider + presets + typed
 * input), shown in both chips and big blinds. Keyboard: F = fold,
 * C = check/call, R = open the raise sizer and focus the input. Sticky to
 * the bottom on mobile for thumb reach; inline on desktop.
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
  const inputRef = useRef<HTMLInputElement>(null);

  const canRaise = legal.canRaise && maxRaiseTo > minRaiseTo - 0.001;
  const raiseLabel = legal.isBet ? 'Bet' : 'Raise';

  const clamp = (v: number) => Math.min(maxRaiseTo, Math.max(minRaiseTo, v));

  useEffect(() => {
    setRaiseTo((r) => clamp(r || minRaiseTo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRaiseTo, maxRaiseTo]);

  // Context-aware presets: pot fractions when opening (a bet), bet
  // multiples when raising — plus an all-in. Standard poker sizings.
  const presets = useMemo(() => {
    const round = (v: number) => clamp(Math.round(v * 2) / 2);
    if (legal.isBet) {
      return [
        { label: '⅓', to: round(pot / 3) },
        { label: '½', to: round(pot / 2) },
        { label: 'Pot', to: round(pot) },
        { label: 'All-in', to: maxRaiseTo },
      ];
    }
    return [
      { label: '2.5×', to: round(currentBet * 2.5) },
      { label: '3×', to: round(currentBet * 3) },
      { label: 'Pot', to: round(currentBet + pot) },
      { label: 'All-in', to: maxRaiseTo },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRaiseTo, maxRaiseTo, currentBet, pot, legal.isBet]);

  const fire = (a: Action) => {
    if (disabled) return;
    setShowSizer(false);
    onAction(a);
  };

  const openSizer = () => {
    setShowSizer(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Keyboard shortcuts (ignored while typing in an input).
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'f' && legal.canFold) {
        e.preventDefault();
        fire({ type: 'fold' });
      } else if (k === 'c') {
        if (legal.canCheck) {
          e.preventDefault();
          fire({ type: 'check' });
        } else if (legal.canCall) {
          e.preventDefault();
          fire({ type: 'call' });
        }
      } else if (k === 'r' && canRaise) {
        e.preventDefault();
        openSizer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, legal, canRaise]);

  return (
    <div className="w-full">
      {/* Bet sizer */}
      {showSizer && canRaise && (
        <div className="bg-panel/95 mb-2 rounded-lg border border-panel-border p-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs text-ink-muted">{raiseLabel} to</span>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                min={minRaiseTo}
                max={maxRaiseTo}
                step={Math.max(0.5, bigBlind / 2)}
                value={raiseTo}
                onChange={(e) => setRaiseTo(Number(e.target.value))}
                onBlur={() => setRaiseTo((r) => clamp(r || minRaiseTo))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    fire({ type: legal.isBet ? 'bet' : 'raise', amount: clamp(raiseTo) });
                }}
                aria-label="Bet size in chips"
                className="nums focus:border-accent/60 w-20 rounded-md border border-panel-border bg-panel-raised px-2 py-1 text-right text-sm font-bold text-accent outline-none"
              />
              <span className="nums w-14 text-right text-xs text-ink-muted">
                {(raiseTo / bigBlind).toFixed(1)} bb
              </span>
            </div>
          </div>
          <input
            type="range"
            min={minRaiseTo}
            max={maxRaiseTo}
            step={Math.max(0.5, bigBlind / 2)}
            value={Math.min(maxRaiseTo, Math.max(minRaiseTo, raiseTo))}
            onChange={(e) => setRaiseTo(Number(e.target.value))}
            className="w-full accent-[var(--accent-neon)]"
            aria-label="Bet size slider"
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
          <Kbd>F</Kbd>
        </Button>

        {legal.canCheck ? (
          <Button
            variant="secondary"
            size="lg"
            disabled={disabled}
            onClick={() => fire({ type: 'check' })}
          >
            Check
            <Kbd>C</Kbd>
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
            <Kbd>C</Kbd>
          </Button>
        )}

        {canRaise ? (
          showSizer ? (
            <Button
              variant="gold"
              size="lg"
              disabled={disabled}
              onClick={() => fire({ type: legal.isBet ? 'bet' : 'raise', amount: clamp(raiseTo) })}
            >
              {raiseLabel}
              <span className="nums ml-1">{formatAmount(clamp(raiseTo))}</span>
            </Button>
          ) : (
            <Button variant="gold" size="lg" disabled={disabled} onClick={openSizer}>
              {raiseLabel}…<Kbd>R</Kbd>
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
