'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PokerTable } from '@/components/table/PokerTable';
import { Controls } from '@/components/table/Controls';
import { Button } from '@/components/ui/Button';
import { CoachPanel } from '@/components/coach/CoachPanel';
import { TableSettingsButton } from '@/components/table/TableSettings';
import { useGame, type TableConfig } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { isHeroTurn, type Action } from '@/engine/gameEngine';
import { playSound } from '@/lib/sound';

export default function PlayPage() {
  const { game, phase, newHand, heroAct, botStep, legal, lastBotAction } = useGame();
  const settings = useSettings();
  const soundOn = settings.soundEnabled;
  const [started, setStarted] = useState(false);

  const sfx = useCallback(
    (effect: Parameters<typeof playSound>[0]) => {
      if (soundOn) playSound(effect);
    },
    [soundOn],
  );

  const tableConfig: TableConfig = {
    styles: settings.tableStyles,
    startingStack: settings.startingStackBB * 2,
    smallBlind: 1,
    bigBlind: 2,
  };
  const tableRef = useRef(tableConfig);
  tableRef.current = tableConfig;

  const deal = useCallback(() => {
    newHand(tableRef.current);
    setStarted(true);
    sfx('deal');
  }, [newHand, sfx]);

  const handleHeroAct = useCallback(
    (a: Action) => {
      sfx(a.type === 'fold' ? 'fold' : a.type === 'check' ? 'check' : 'chip');
      heroAct(a);
    },
    [heroAct, sfx],
  );

  // Bot pacing: when it's a bot's turn, step after a short, human-like delay.
  useEffect(() => {
    if (!game || game.status !== 'betting') return;
    const seat = game.seats[game.toAct];
    if (!seat || seat.isHero) return;
    const delay = 650 + Math.random() * 600;
    const t = setTimeout(() => botStep(), delay);
    return () => clearTimeout(t);
  }, [game, botStep]);

  // Sound for bot actions.
  useEffect(() => {
    if (!lastBotAction) return;
    sfx(lastBotAction.type === 'fold' ? 'fold' : lastBotAction.type === 'check' ? 'check' : 'chip');
  }, [lastBotAction, sfx]);

  // Win/lose chime at hand completion.
  useEffect(() => {
    if (!game || game.status !== 'complete') return;
    const heroWon = game.winners.some((w) => game.seats[w.seatId]?.isHero);
    sfx(heroWon ? 'win' : 'lose');
  }, [game?.status, game, sfx]);

  const heroTurn = game ? isHeroTurn(game) : false;
  const la = legal();

  // Keyboard shortcuts for hero actions (accessibility & speed).
  useEffect(() => {
    if (!heroTurn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'f' && la.canFold) handleHeroAct({ type: 'fold' });
      else if (k === 'c') {
        if (la.canCheck) handleHeroAct({ type: 'check' });
        else if (la.canCall) handleHeroAct({ type: 'call' });
      } else if ((k === 'r' || k === 'b') && la.canRaise) {
        handleHeroAct({ type: la.isBet ? 'bet' : 'raise', amount: la.minRaiseTo });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [heroTurn, la, handleHeroAct]);

  return (
    <div className="min-h-dvh">
      <AppHeader right={<TableSettingsButton />} />

      <main id="main" className="mx-auto max-w-7xl px-3 pb-40 pt-4 sm:px-5 lg:pb-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* Table column */}
          <section>
            {!started || !game ? <EmptyTable onDeal={deal} /> : <PokerTable game={game} />}
          </section>

          {/* Coach / equity side panel (below table on mobile, sidebar on desktop) */}
          <aside>{game && <CoachPanel />}</aside>
        </div>
      </main>

      {/* Action dock */}
      {game && (
        <div className="bg-bg/90 pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-panel-border px-3 py-3 backdrop-blur-md lg:static lg:mx-auto lg:max-w-3xl lg:border-0 lg:bg-transparent lg:pb-8">
          {game.status === 'complete' ? (
            <div className="mx-auto flex max-w-md items-center justify-center gap-3">
              <Button size="lg" block onClick={deal}>
                Deal next hand →
              </Button>
            </div>
          ) : heroTurn ? (
            <div className="mx-auto max-w-md">
              <Controls
                legal={la}
                pot={game.seats.reduce((s, x) => s + x.committed, 0)}
                currentBet={game.currentBet}
                bigBlind={game.bigBlind}
                onAction={handleHeroAct}
              />
            </div>
          ) : (
            <div className="mx-auto max-w-md text-center text-sm text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                {phase === 'playing' ? 'Opponents are acting…' : 'Dealing…'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyTable({ onDeal }: { onDeal: () => void }) {
  return (
    <div className="ring-felt-light/30 relative mx-auto flex aspect-[3/4] w-full max-w-md flex-col items-center justify-center gap-5 rounded-[44%] bg-felt-radial p-8 text-center shadow-deep ring-1 sm:aspect-[16/10] sm:max-w-3xl">
      <h2 className="font-display text-2xl font-bold">Take a seat</h2>
      <p className="max-w-sm text-sm text-ink-secondary">
        6-max cash, 100bb deep. You’ll be coached on every decision with live equity, pot odds, and
        a verdict.
      </p>
      <Button size="lg" onClick={onDeal}>
        Deal me in →
      </Button>
    </div>
  );
}
