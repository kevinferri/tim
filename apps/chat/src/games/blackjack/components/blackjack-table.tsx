"use client";

import { useEffect, useRef, useState } from "react";
import {
  BETTING_WINDOW_MS,
  TURN_MS,
  type BlackjackPlayAction,
  type BlackjackSeatView,
  type BlackjackTableAction,
  type BlackjackTableView,
} from "@tim/casino";
import {
  BetSpot,
  CARD_PX,
  breakdown,
  CARD_SIZES,
  ChipRack,
  ChipButton,
  ChipLaunchProvider,
  DealProvider,
  DealShoe,
  OccupantAvatar,
  PlayerAvatar,
  PlayerSpot,
  StatusLine,
  TableLayout,
  cardBox,
  useTable,
  type BetStack,
  type CardSize,
} from "@/games/casino";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { blackjackGame } from "./game";
import { Hand, ScoredCards, TurnGlow } from "./hand";

const CHIPS = [10, 25, 50, 100];

const PLAY_BUTTONS: {
  action: BlackjackPlayAction;
  label: string;
  key: string;
}[] = [
  { action: "hit", label: "Hit", key: "h" },
  { action: "stand", label: "Stand", key: "s" },
  { action: "double", label: "Double", key: "d" },
  { action: "split", label: "Split", key: "p" },
];

type Act = (action: BlackjackTableAction) => void;

/** Bigger cards at a smaller table; only changes between rounds so cards don't resize mid-hand. */
function useCardSize(view: BlackjackTableView | null): CardSize {
  const count = view ? view.seats.filter(Boolean).length : 0;
  const target: CardSize = count <= 3 ? "2xl" : count <= 6 ? "xl" : "lg";
  const betweenRounds = view?.phase === "waiting" || view?.phase === "betting";
  // Unset until the first snapshot, so loading mid-round still sizes for that table.
  const [size, setSize] = useState<CardSize | null>(null);
  if (view && size !== target && (size === null || betweenRounds)) {
    setSize(target);
  }
  return size ?? target;
}

/** Modified keys, typing in a field, and Enter on a focused control (which it activates) aren't table commands. */
function ignoreKey(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return true;
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName ?? "";
  if (
    target?.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(tag)
  )
    return true;
  return e.key === "Enter" && (tag === "BUTTON" || tag === "A");
}

// The hand's padding (p-1 on both sides), part of a two-card hand's size.
const HAND_PAD_PX = 8;

// Gap between cards in the opening deal, dealt one at a time like a real dealer.
const DEAL_STAGGER_MS = 130;

// Places leftover chips this long before betting closes, so the bet reaches the server in time.
const AUTO_PLACE_LEAD_MS = 400;

const smaller = (size: CardSize) =>
  CARD_SIZES[Math.max(0, CARD_SIZES.indexOf(size) - 1)];

type Props = {
  circleId: string;
  circleName: string;
  circleImageUrl: string | null;
};

export function BlackjackTable({
  circleId,
  circleName,
  circleImageUrl,
}: Props) {
  const { view, status, deadline, mySeat, sit, stand, act } = useTable<
    BlackjackTableView,
    BlackjackTableAction
  >({ circleId, game: "blackjack" });
  const cardSize = useCardSize(view);
  const me = view && mySeat !== null ? view.seats[mySeat] : null;
  const myBet = me?.bet ?? null;
  const phase = view?.phase;
  // The chips I've put in my circle this round: picked locally, then sent with "Place bet".
  const [chips, setChips] = useState<number[]>([]);
  const chipsTotal = chips.reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (phase === "betting") setChips([]);
  }, [phase]);

  const minBet = view?.limits.minBet ?? 0;
  const cap = me && view ? Math.min(view.limits.maxBet, me.stack) : 0;
  const canPlace = (n: number) => n >= minBet && n <= cap;
  const picking = phase === "betting" && me !== null && myBet === null;

  // Chips left in the circle when betting closes still count, like on a real table.
  useEffect(() => {
    if (!picking || deadline === null || !canPlace(chipsTotal)) return;
    const id = setTimeout(
      () => act({ type: "bet", amount: chipsTotal }),
      Math.max(0, deadline - performance.now() - AUTO_PLACE_LEAD_MS),
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, deadline, chipsTotal]);

  const shell = {
    backHref: `/circles/${circleId}`,
    backLabel: circleName,
    // Same look as the circle in the circles rail.
    backAvatar: (
      <Avatar className="size-5">
        <AvatarImage src={circleImageUrl ?? undefined} alt="" />
        <AvatarFallback className="text-[9px]">
          {getInitials(circleName)}
        </AvatarFallback>
      </Avatar>
    ),
    titleIcon: <blackjackGame.Icon className="size-4" />,
    title: "Blackjack",
  };

  if (status === "off") {
    return (
      <TableLayout
        {...shell}
        notice={
          <Alert variant="secondary" className="max-w-sm text-center">
            <AlertDescription>
              Blackjack isn&rsquo;t on in this circle yet.
            </AlertDescription>
          </Alert>
        }
      />
    );
  }
  if (!view) {
    return (
      <TableLayout
        {...shell}
        notice={<Skeleton className="h-full w-full rounded-3xl" />}
      />
    );
  }

  const live = status === "live";
  const isMyTurn = view.phase === "players" && view.turn?.seat === mySeat;
  const playing = view.phase !== "waiting" && view.phase !== "betting";

  // Opening deal order: one card to each player from first base, one to the dealer, then again.
  const dealt = view.seats.flatMap((s, i) => (s?.inRound ? [i] : []));
  const perPass = dealt.length + 1;
  const dealDelay = (position: number) => (cardIndex: number) =>
    cardIndex < 2 ? (cardIndex * perPass + position) * DEAL_STAGGER_MS : 0;

  const controls = (
    <Dock
      view={view}
      me={me}
      isMyTurn={isMyTurn}
      chips={chips}
      setChips={setChips}
      canPlace={canPlace}
      cap={cap}
      join={() => sit()}
      act={act}
    />
  );

  return (
    <DealProvider live={live} snapshot={view}>
      <ChipLaunchProvider>
        <TableLayout
          {...shell}
          headerRight={
            me && (
              <>
                <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  {me.stack.toLocaleString()} chips
                </span>
                {!me.leaving && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm"
                    onClick={stand}
                  >
                    Leave
                  </Button>
                )}
              </>
            )
          }
          rack={<ChipRack />}
          // A two-card hand plus the hand's padding: fixes where each bet circle sits.
          spotSize={{
            w:
              2 * CARD_PX[cardSize].w - CARD_PX[cardSize].overlap + HAND_PAD_PX,
            h: CARD_PX[cardSize].h + HAND_PAD_PX,
          }}
          dealer={
            <div className="flex flex-col items-center" aria-label="Dealer">
              <div className="relative">
                {/* Printed on the felt; the dealt cards cover it. */}
                <div
                  aria-hidden
                  className={cn(
                    cardBox(cardSize),
                    "absolute left-1/2 top-0 -translate-x-1/2 rounded-md border-2 border-dashed border-white/20",
                  )}
                />
                {view.phase === "dealer" && (
                  <TurnGlow count={view.dealer.cards.length} size={cardSize} />
                )}
                {view.dealer.cards.length > 0 ? (
                  <ScoredCards
                    cards={view.dealer.cards}
                    total={view.dealer.total}
                    size={cardSize}
                    dealDelayMs={dealDelay(dealt.length)}
                  />
                ) : (
                  <div className={cardBox(cardSize)} />
                )}
                {/* Well off to the dealer's left, angled like a real shoe, so it doesn't read as a second card. */}
                <DealShoe
                  size={cardSize}
                  className="absolute left-full -top-3 ml-24 rotate-[18deg]"
                />
              </div>
            </div>
          }
          status={
            <StatusLine
              leading={
                live &&
                view.phase === "players" &&
                view.turn &&
                view.seats[view.turn.seat] && (
                  <OccupantAvatar
                    occupant={view.seats[view.turn.seat]!.occupant}
                    size="md"
                  />
                )
              }
              deadline={live ? deadline : null}
              highlight={live && isMyTurn}
              duration={
                view.phase === "betting"
                  ? BETTING_WINDOW_MS
                  : view.phase === "players"
                    ? TURN_MS
                    : null
              }
            >
              {statusText(view, me, live)}
            </StatusLine>
          }
          players={view.seats.flatMap((seat, i) => {
            if (!seat) return [];
            const busted =
              seat.hands.length > 0 &&
              seat.hands.every((h) => h.outcome === "bust");
            const dimmedReason = seat.leaving
              ? "Leaving after this round"
              : playing && !seat.inRound
                ? "Joins next round"
                : busted
                  ? "Busted"
                  : null;
            // Everyone but the current turn fades a little, you included.
            const waiting = view.phase === "players" && view.turn?.seat !== i;
            return [
              {
                key: seat.occupant.userId,
                seat: i,
                node: (
                  <PlayerSpot
                    dimmed={!!dimmedReason && !busted}
                    waiting={waiting}
                  >
                    <SeatHands
                      seat={seat}
                      view={view}
                      dealDelayMs={
                        seat.hands.length === 1
                          ? dealDelay(dealt.indexOf(i))
                          : undefined
                      }
                      // A split seat steps down a size so both hands fit.
                      size={
                        seat.hands.length > 1 ? smaller(cardSize) : cardSize
                      }
                    />
                  </PlayerSpot>
                ),
                bet: (
                  <PlayerSpot
                    dimmed={!!dimmedReason && !busted}
                    waiting={waiting}
                  >
                    <SeatBet
                      seat={seat}
                      view={view}
                      myChips={
                        i === mySeat
                          ? {
                              chips,
                              picking,
                              takeBack: () => setChips((c) => c.slice(0, -1)),
                            }
                          : undefined
                      }
                    />
                  </PlayerSpot>
                ),
                rail: (
                  <PlayerAvatar
                    occupant={seat.occupant}
                    isYou={i === mySeat}
                    active={view.phase === "players" && view.turn?.seat === i}
                    result={
                      view.phase === "results" &&
                      seat.inRound &&
                      seat.lastNet !== null && <NetAmount net={seat.lastNet} />
                    }
                    dimmedReason={dimmedReason}
                    waiting={waiting}
                  />
                ),
              },
            ];
          })}
          dock={live && controls}
        />
      </ChipLaunchProvider>
    </DealProvider>
  );
}

function NetAmount({ net }: { net: number }) {
  return (
    <span
      className={cn(
        "text-sm font-semibold tabular-nums",
        net > 0
          ? "text-emerald-300"
          : net < 0
            ? "text-rose-300"
            : "text-white/60",
      )}
    >
      {net > 0 ? `+${net}` : net < 0 ? `−${-net}` : "Push"}
    </span>
  );
}

function statusText(
  view: BlackjackTableView,
  me: BlackjackSeatView | null,
  live: boolean,
) {
  if (!live) return "Reconnecting…";
  switch (view.phase) {
    case "waiting":
      return "Waiting for players";
    case "betting":
      if (!me || me.bet !== null) return "Waiting for bets";
      return me.stack < view.limits.minBet
        ? "Not enough chips to bet"
        : "Place your bet";
    case "players": {
      if (!view.turn) return "";
      if (me && view.turn.seat === me.seat) return "Your turn";
      const name = view.seats[view.turn.seat]?.occupant.displayName;
      return `${name}'s turn`;
    }
    case "dealer":
      return "Dealer's turn";
    case "results": {
      if (me?.inRound && me.lastNet !== null) {
        const net = me.lastNet;
        const blackjack = me.hands.some((h) => h.outcome === "blackjack");
        if (net > 0) return `${blackjack ? "Blackjack! " : ""}You won ${net}`;
        if (net < 0) return `You lost ${-net}`;
        return "Push";
      }
      const { cards, total } = view.dealer;
      if (cards.length === 2 && total === 21) return "Dealer has blackjack";
      if (total !== null && total > 21) return "Dealer busts";
      return `Dealer has ${total}`;
    }
  }
}

function SeatHands({
  seat,
  view,
  size,
  dealDelayMs,
}: {
  seat: BlackjackSeatView;
  view: BlackjackTableView;
  size: CardSize;
  dealDelayMs?: (cardIndex: number) => number;
}) {
  const playing = view.phase !== "waiting" && view.phase !== "betting";
  if (playing && !seat.inRound) return null;
  const playingHand =
    view.phase === "players" && view.turn?.seat === seat.seat
      ? view.turn.hand
      : null;
  return (
    <div className="relative flex flex-wrap justify-center gap-2">
      {(seat.hands.length ? seat.hands : [null]).map((hand, h) => (
        <Hand
          key={h}
          hand={hand}
          size={size}
          dealDelayMs={dealDelayMs}
          glow={playingHand === h}
        />
      ))}
    </div>
  );
}

/** One stack per hand: a split gives each hand its own, a double makes that hand's stack taller. */
function betStacks(seat: BlackjackSeatView, chips?: number[]): BetStack[] {
  const matching = (amount: number) =>
    chips?.reduce((a, b) => a + b, 0) === amount ? chips : undefined;
  if (seat.hands.length === 0) {
    return seat.bet === null
      ? []
      : [{ amount: seat.bet, chips: matching(seat.bet) }];
  }
  // One stack per hand; a double piles the same chips again on top, labelled with the new total.
  return seat.hands.map((hand) => {
    const base = hand.doubled ? hand.bet / 2 : hand.bet;
    const chipsOfBase = matching(base) ?? breakdown(base);
    return {
      amount: hand.bet,
      chips: hand.doubled ? [...chipsOfBase, ...chipsOfBase] : chipsOfBase,
      dimmed: hand.outcome === "bust",
    };
  });
}

/** A seat's bet circle; for the viewer while betting, the chips they've picked so far. */
function SeatBet({
  seat,
  view,
  myChips,
}: {
  seat: BlackjackSeatView;
  view: BlackjackTableView;
  myChips?: { chips: number[]; picking: boolean; takeBack: () => void };
}) {
  const playing = view.phase !== "waiting" && view.phase !== "betting";
  const picking = myChips?.picking ?? false;
  const pickedTotal = myChips?.chips.reduce((a, b) => a + b, 0) ?? 0;
  const stacks =
    playing && !seat.inRound
      ? []
      : picking
        ? pickedTotal
          ? [{ amount: pickedTotal, chips: myChips!.chips }]
          : []
        : betStacks(seat, myChips?.chips);
  return (
    <BetSpot
      stacks={stacks}
      flyIn={picking}
      onClick={picking && pickedTotal ? myChips!.takeBack : undefined}
      locked={seat.bet !== null}
    />
  );
}

type BetProps = {
  chips: number[];
  setChips: (chips: number[] | ((c: number[]) => number[])) => void;
  canPlace: (amount: number) => boolean;
  cap: number;
};

function Dock({
  view,
  me,
  isMyTurn,
  join,
  act,
  ...bet
}: {
  view: BlackjackTableView;
  me: BlackjackSeatView | null;
  isMyTurn: boolean;
  join: () => void;
  act: Act;
} & BetProps) {
  // One thing at a time in the middle of the table: betting while your bet is open, otherwise the play keys.
  if (
    me &&
    view.phase === "betting" &&
    me.bet === null &&
    me.stack >= view.limits.minBet
  ) {
    return <BetBuilder act={act} {...bet} />;
  }
  // Only on your turn, so their arrival is the cue; nothing below the status otherwise.
  if (me) {
    return isMyTurn ? (
      <PlayLegend actions={view.turnActions} act={act} />
    ) : null;
  }
  const full = view.seats.every(Boolean);
  // Not seated: just Join table; the play keys come once you're in.
  return <JoinKey full={full} join={join} />;
}

/** Join table, printed like the other commands; Enter joins too. */
function JoinKey({ full, join }: { full: boolean; join: () => void }) {
  useEffect(() => {
    if (full) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || ignoreKey(e)) return;
      e.preventDefault();
      join();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [full, join]);
  return (
    <PrintedKey
      keyLabel="↵"
      label={full ? "Table is full" : "Join table"}
      on={!full}
      onClick={join}
    />
  );
}

function BetBuilder({
  chips,
  setChips,
  canPlace,
  cap,
  act,
}: BetProps & { act: Act }) {
  const total = chips.reduce((a, b) => a + b, 0);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 1–4 add a chip, Enter places the bet, Backspace takes the last chip back.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (ignoreKey(e)) return;
      const n = Number(e.key) - 1;
      const chip = CHIPS[n];
      if (chip && total + chip <= cap) {
        e.preventDefault();
        // Through the chip itself, so it slides in from there like a click.
        chipRefs.current[n]?.click();
      } else if (e.key === "Enter" && canPlace(total)) {
        e.preventDefault();
        act({ type: "bet", amount: total });
      } else if (e.key === "Backspace" && total > 0) {
        e.preventDefault();
        setChips((c) => c.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [total, cap, canPlace, setChips, act]);

  return (
    // Printed on the felt like the play keys: chips with their number keys, then the commands.
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-start gap-4">
        {CHIPS.map((value, n) => (
          <div key={value} className="flex flex-col items-center gap-3">
            <ChipButton
              ref={(el) => {
                chipRefs.current[n] = el;
              }}
              value={value}
              aria-label={`Add ${value}`}
              disabled={total + value > cap}
              onClick={(e) => {
                // A mouse pick drops focus, so Enter next places the bet instead of re-clicking the chip.
                if (e.detail > 0) e.currentTarget.blur();
                setChips((c) => [...c, value]);
              }}
            />
            {/* Its key, tappable too: clicks the chip so it flies the same way. */}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              disabled={total + value > cap}
              onClick={() => chipRefs.current[n]?.click()}
              // Lit like the other keys while you can add that chip.
              className="text-white/85 transition-[color,text-shadow] duration-300 [text-shadow:0_0_6px_rgba(255,255,255,0.2)] hover:text-white disabled:cursor-default disabled:text-white/20 disabled:[text-shadow:none]"
            >
              <kbd className="flex size-5 items-center justify-center rounded-[3px] border border-current font-sans text-[11px] font-bold shadow-[0_0_6px_rgba(255,255,255,0.12)] transition-shadow duration-300 [:disabled>&]:shadow-none">
                {n + 1}
              </kbd>
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-5">
        <PrintedKey
          keyLabel="↵"
          label="Place bet"
          on={canPlace(total)}
          onClick={() => act({ type: "bet", amount: total })}
        />
        <PrintedKey
          keyLabel="⌫"
          label="Clear"
          on={total > 0}
          onClick={() => setChips([])}
        />
      </div>
    </div>
  );
}

function PlayLegend({
  actions,
  act,
}: {
  actions: BlackjackPlayAction[];
  act: Act;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || ignoreKey(e)) return;
      const button = PLAY_BUTTONS.find((b) => b.key === e.key.toLowerCase());
      if (button && actions.includes(button.action)) {
        e.preventDefault();
        act({ type: button.action });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, act]);

  // Printed on the felt like the table's markings; moves you can't make this turn stay dim.
  // Each is still tappable, for phones without a keyboard.
  return (
    <div className="flex items-center gap-5 whitespace-nowrap duration-300 animate-in fade-in">
      {PLAY_BUTTONS.map((b) => (
        <PrintedKey
          key={b.action}
          keyLabel={b.key.toUpperCase()}
          label={b.label}
          on={actions.includes(b.action)}
          onClick={() => act({ type: b.action })}
        />
      ))}
    </div>
  );
}

/** A command printed on the felt with its key: dim until it's usable, then lit. Tappable when lit. */
function PrintedKey({
  keyLabel,
  label,
  on,
  onClick,
}: {
  keyLabel: string;
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!on}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.18em] transition-[color,text-shadow] duration-300",
        on
          ? "text-white/85 [text-shadow:0_0_6px_rgba(255,255,255,0.2)] hover:text-white"
          : "cursor-default text-white/20",
      )}
    >
      <kbd
        className={cn(
          "flex h-6 min-w-6 items-center justify-center rounded-[3px] border border-current px-1 font-sans text-[13px] font-bold tracking-normal transition-shadow duration-300",
          on && "shadow-[0_0_6px_rgba(255,255,255,0.12)]",
        )}
      >
        {keyLabel}
      </kbd>
      {label}
    </button>
  );
}
