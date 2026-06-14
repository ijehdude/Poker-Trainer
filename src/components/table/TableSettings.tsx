'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/store/settingsStore';
import { BOT_PROFILES, type BotStyle } from '@/engine/bots';
import { cn } from '@/lib/cn';

const STYLES: BotStyle[] = ['nit', 'tag', 'lag', 'station', 'balanced'];

export function TableSettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Table settings"
      >
        ⚙︎ <span className="hidden sm:inline">Settings</span>
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Table & Coach">
        <TableSettingsForm />
      </Modal>
    </>
  );
}

export function TableSettingsForm() {
  const s = useSettings();
  return (
    <div className="space-y-6">
      {/* Coach mode */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Coach
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {(['offline', 'cloud'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => s.setCoachMode(mode)}
              className={cn(
                'rounded-md border p-3 text-left transition-colors',
                s.coachMode === mode
                  ? 'bg-accent/10 border-accent'
                  : 'hover:border-accent/40 border-panel-border',
              )}
            >
              <div className="text-sm font-semibold">
                {mode === 'offline' ? 'Offline' : 'Cloud (DeepSeek)'}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {mode === 'offline'
                  ? 'Free, instant, private. Always available.'
                  : 'Richer phrasing & Q&A. Needs an API key (falls back to offline).'}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Opponent composition */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Opponents
          </h4>
          <Button variant="ghost" size="sm" onClick={s.randomizeTable}>
            🎲 Randomize
          </Button>
        </div>
        <div className="space-y-2">
          {s.tableStyles.map((style, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-xs text-ink-muted">{i + 1}</span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {STYLES.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      const next = [...s.tableStyles];
                      next[i] = opt;
                      s.setTableStyles(next);
                    }}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      style === opt
                        ? 'bg-accent/15 border-accent text-accent'
                        : 'hover:border-accent/40 border-panel-border text-ink-secondary',
                    )}
                  >
                    {BOT_PROFILES[opt].name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stack + sound */}
      <section className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Starting stack
          </h4>
          <div className="flex gap-1.5">
            {[50, 100, 200].map((bb) => (
              <button
                key={bb}
                onClick={() => s.setStartingStack(bb)}
                className={cn(
                  'flex-1 rounded-md border py-2 text-sm font-semibold transition-colors',
                  s.startingStackBB === bb
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'hover:border-accent/40 border-panel-border text-ink-secondary',
                )}
              >
                {bb}bb
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Sound
          </h4>
          <button
            onClick={s.toggleSound}
            className={cn(
              'w-full rounded-md border py-2 text-sm font-semibold transition-colors',
              s.soundEnabled
                ? 'bg-accent/15 border-accent text-accent'
                : 'border-panel-border text-ink-secondary',
            )}
          >
            {s.soundEnabled ? '🔊 On' : '🔈 Muted'}
          </button>
        </div>
      </section>

      <p className="text-xs text-ink-muted">Changes apply to the next hand you deal.</p>
    </div>
  );
}
