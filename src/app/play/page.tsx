'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PokerTable } from '@/components/table/PokerTable';
import { StreetIndicator } from '@/components/table/StreetIndicator';
import { Controls } from '@/components/table/Controls';
import { Button } from '@/components/ui/Button';
import { CoachPanel } from '@/components/coach/CoachPanel';
import { TableSettingsButton } from '@/components/table/TableSettings';
import { useGame, type TableConfig } from '@/store/gameStore';
import { useSettings } from '@/store/settingsStore';
import { useSession } from '@/store/sessionStore';
import { isHeroTurn, type Action } from '@/engine/gameEngine';
import { playSound } from '@/lib/sound';

export default function PlayPage() {
  const { game, phase, startSession, dealHand, heroAct, botStep, legal, lastBotAction } = useGame();
  const settings = useSettings();
  const sessionStatus = useSession((s) => s.status);
  const winnerName = useSession((s) => s.winnerName);
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

  // Start a fresh game (resets stacks & eliminations, wipes session history).
  const startNew = useCallback(() => {
    startSession(tableRef.current);
    setStarted(true);
    sfx('deal');
  }, [startSession, sfx]);

  // Continue the session: deal the next hand (carry-over stacks), or start a
  // new game if there's no live session yet (first visit / after a refresh).
  const deal = useCallback(() => {
    const s = useSession.getState();
    if (s.active && s.status === 'active') dealHand();
    else startSession(tableRef.current);
    setStarted(true);
    sfx('deal');
  }, [dealHand, startSession, sfx]);

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
  // Hero action hotkeys (F/C/R) live inside <Controls> so R can focus the
  // sizing input. No global handler needed here.

  const dock = game ? (
    <div className="pb-safe shrink-0 px-1 pb-[clamp(0.5rem,2vh,1rem)] pt-1">
      <div className="mx-auto flex min-h-[clamp(3.25rem,8vh,4.5rem)] max-w-md items-center justify-center">
        <div className="w-full">
          {game.status === 'complete' ? (
            sessionStatus === 'hero-busted' ? (
              <EndState
                title="You’re out — busted"
                subtitle="Your stack hit zero. Start a new game to reset the table."
                onNewGame={startNew}
              />
            ) : sessionStatus === 'table-won' ? (
              <EndState
                title={`${winnerName ?? 'You'} ${winnerName && winnerName !== 'You' ? 'wins' : 'win'} the table 🏆`}
                subtitle="Last player standing — everyone else busted."
                onNewGame={startNew}
              />
            ) : (
              <Button size="lg" block onClick={deal}>
                Deal next hand →
              </Button>
            )
          ) : heroTurn ? (
            <Controls
              legal={la}
              pot={game.seats.reduce((s, x) => s + x.committed, 0)}
              currentBet={game.currentBet}
              bigBlind={game.bigBlind}
              onAction={handleHeroAct}
            />
          ) : (
            <div className="text-center text-sm text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                {phase === 'playing' ? 'Opponents are acting…' : 'Dealing…'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="fit-screen flex flex-col">
      <AppHeader right={<TableSettingsButton />} />

      <main
        id="main"
        className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-2 px-3 pb-2 pt-3 sm:px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(320px,26vw,380px)] lg:gap-5 lg:overflow-hidden lg:pb-3"
      >
        {/* Table column */}
        <section className="flex min-h-0 flex-col gap-2">
          {game && (
            <div className="flex shrink-0 items-center justify-center">
              <StreetIndicator street={game.street} />
            </div>
          )}
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {!started || !game ? <EmptyTable onDeal={deal} /> : <PokerTable game={game} fill />}
          </div>
          {dock}
        </section>

        {/* Coach / equity side panel (below table on mobile, sidebar on desktop) */}
        <aside className="min-h-0 lg:overflow-hidden">{game && <CoachPanel />}</aside>
      </main>
    </div>
  );
}

function EndState({
  title,
  subtitle,
  onNewGame,
}: {
  title: string;
  subtitle: string;
  onNewGame: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="font-display text-base font-bold text-accent-gold">{title}</div>
      <p className="text-xs text-ink-secondary">{subtitle}</p>
      <Button size="lg" block onClick={onNewGame}>
        Start new game
      </Button>
    </div>
  );
}

function EmptyTable({ onDeal }: { onDeal: () => void }) {
  return (
    <div className="ring-felt-light/30 relative mx-auto flex aspect-[3/4] w-full max-w-md flex-col items-center justify-center gap-5 rounded-[44%] bg-felt-radial p-8 text-center shadow-deep ring-1 sm:aspect-[16/10] sm:max-w-2xl lg:h-full lg:max-h-full lg:w-auto lg:max-w-full">
      <h2 className="font-display text-2xl font-bold">Take a seat</h2>
      <p className="max-w-sm text-sm text-ink-secondary">
        5-handed cash, 100bb deep. You’ll be coached on every decision with live equity, pot odds,
        and a verdict.
      </p>
      <Button size="lg" onClick={onDeal}>
        Deal me in →
      </Button>
    </div>
  );
}
