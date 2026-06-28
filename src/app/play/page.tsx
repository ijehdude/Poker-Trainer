'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PokerTable } from '@/components/table/PokerTable';
import { StreetIndicator } from '@/components/table/StreetIndicator';
import { Controls } from '@/components/table/Controls';
import { LiveHint } from '@/components/table/LiveHint';
import { Button } from '@/components/ui/Button';
import { CoachPanel } from '@/components/coach/CoachPanel';
import { TableSettingsButton } from '@/components/table/TableSettings';
import { cn } from '@/lib/cn';
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
  // Mobile-only: which face of the Play screen is showing. On desktop the
  // table and coach are side-by-side, so this is ignored (toggle is hidden).
  const [view, setView] = useState<'table' | 'coach'>('table');
  // When the bet sizer overlay is open, the table reserves a bottom band so the
  // overlay can never cover the hero's hole cards (which otherwise sit at the
  // felt's bottom edge). The felt shrinks; seats reflow up via ResizeObserver.
  const [sizerOpen, setSizerOpen] = useState(false);

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

  // Between hands: Space or Enter deals the next hand (or starts a new game
  // when the session has ended). Ignored while typing in the coach chat.
  useEffect(() => {
    if (!game || game.status !== 'complete') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (sessionStatus === 'active') deal();
        else startNew();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, sessionStatus, deal, startNew]);

  const dock = game ? (
    <div data-testid="action-bar" className="pb-safe shrink-0 px-1 pb-[clamp(0.5rem,2vh,1rem)] pt-1">
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
                <kbd className="ml-2 hidden rounded border border-black/25 bg-black/15 px-1.5 text-[10px] font-bold text-current opacity-80 sm:inline-block">
                  Space
                </kbd>
              </Button>
            )
          ) : heroTurn ? (
            <Controls
              legal={la}
              pot={game.seats.reduce((s, x) => s + x.committed, 0)}
              currentBet={game.currentBet}
              bigBlind={game.bigBlind}
              onAction={handleHeroAct}
              onSizerOpenChange={setSizerOpen}
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
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <AppHeader right={<TableSettingsButton />} />

      <main
        id="main"
        className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-2 px-3 pb-2 pt-2 sm:px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(320px,26vw,380px)] lg:gap-5 lg:overflow-hidden lg:pb-3 lg:pt-3"
      >
        {/* Table column */}
        <section className="flex min-h-0 flex-1 flex-col gap-2">
          {game && (
            <div className="flex shrink-0 items-center justify-center gap-2">
              <StreetIndicator street={game.street} />
              {/* Mobile Table/Coach toggle (desktop shows both at once). */}
              <ViewToggle view={view} onChange={setView} className="lg:hidden" />
            </div>
          )}

          {/* Stage: table on desktop always; on mobile the table OR the coach
              view, swapped by the toggle. Reserve a bottom band while the bet
              sizer is open so its overlay never covers the hero's cards. */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center transition-[padding] duration-200"
            style={{ paddingBottom: sizerOpen ? 150 : undefined }}
          >
            {!started || !game ? (
              <EmptyTable onDeal={deal} />
            ) : (
              <>
                <div
                  className={cn(
                    'h-full w-full items-center justify-center',
                    view === 'coach' ? 'hidden lg:flex' : 'flex',
                  )}
                >
                  <PokerTable game={game} fill />
                </div>
                {view === 'coach' && (
                  <div className="absolute inset-0 overflow-y-auto lg:hidden">
                    <CoachPanel />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Live coaching hint (hero's turn, table view only). */}
          {game && view === 'table' && heroTurn && (
            <div className="shrink-0 lg:hidden">
              <LiveHint onOpenCoach={() => setView('coach')} />
            </div>
          )}

          {dock}
        </section>

        {/* Coach / equity sidebar — desktop only (mobile uses the toggle). */}
        <aside data-testid="coach-panel" className="hidden min-h-0 lg:block lg:overflow-hidden">
          {game && <CoachPanel />}
        </aside>
      </main>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
  className,
}: {
  view: 'table' | 'coach';
  onChange: (v: 'table' | 'coach') => void;
  className?: string;
}) {
  return (
    <div className={cn('flex rounded-full bg-panel-raised p-0.5', className)}>
      {(['table', 'coach'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors',
            view === v ? 'bg-accent text-ink-inverse' : 'text-ink-secondary',
          )}
        >
          {v}
        </button>
      ))}
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
        <kbd className="ml-2 hidden rounded border border-black/25 bg-black/15 px-1.5 text-[10px] font-bold text-current opacity-80 sm:inline-block">
          Space
        </kbd>
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
