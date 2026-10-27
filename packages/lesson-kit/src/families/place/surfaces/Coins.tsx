/**
 * Pay an amount (money_pay, dl-w3.61.6): a bank of Polish coins and notes, each an endless pile,
 * and a tray of `slots` places, all drawn before the child starts so nothing moves. Tap a bank
 * coin to put one in the first empty place; tap a coin in the tray to take it back, which leaves
 * its place empty. Every coin is a button, so the keyboard works the same (Tab, then Enter or
 * Space). With `total: 'shown'` a line under the tray says what lies in it; the line is there
 * from the start either way, so the page never shifts. After a miss the tray is amber as a whole
 * until the next move: a marked coin would say which one to change.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { useState } from "react";
import { CoinFace } from "../../../parts/Coins.tsx";
import { TONE_CLASS, type Tone } from "../../../parts/tone.ts";
import type { Clock, Instant } from "../../../stage/clock.ts";
import { type PressModality, press } from "../../../stage/press.ts";
import type { Language } from "../../../stage/types.ts";
import type { Missing } from "../../complete.ts";
import { type Denom, formatAmount, isDenom, tokenOf, totalGr } from "../../money.ts";
import type { Surface } from "../../names.ts";
import { showingSolution } from "../../view.ts";
import {
  type DataOf,
  PlaceShell,
  PlaceSolution,
  StillLabel,
  type SurfacePlayProps,
  type SurfaceStillProps,
  usePlaceStep,
} from "../surface.tsx";

type CoinsData = DataOf<typeof Surface.Coins>;

/** A tray is missing until a coin lies in it. */
function missingCoins(value: unknown | null): Missing | null {
  const items =
    value !== null && typeof value === "object" && "items" in value
      ? (value as { items: unknown }).items
      : null;
  return Array.isArray(items) && items.length > 0
    ? null
    : { reason: "incomplete_coins", parts: [] };
}

const PLACE = "flex h-16 w-28 items-center justify-center rounded-lg border-2";
const TAP = "min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)]";

function itemsOf(value: SurfaceStillProps<typeof Surface.Coins>["shown"]): Denom[] | null {
  return value !== null && "items" in value && Array.isArray(value.items)
    ? value.items.filter(isDenom)
    : null;
}

/** The amount to pay, big under the stem: it is the task. */
function Amount({ data }: { data: CoinsData }): JSX.Element {
  return <p className="text-[2.5rem] leading-none font-bold tabular-nums">{data.amount_label}</p>;
}

/** The running total's line, reserved whether it shows or not. */
function TotalLine({
  data,
  items,
  language,
}: {
  data: CoinsData;
  items: readonly Denom[];
  language: Language;
}): JSX.Element {
  return (
    <p
      data-coins-total={data.total === "shown" ? totalGr(items) : undefined}
      aria-live="polite"
      className="min-h-[var(--kid-tap-min)] text-2xl tabular-nums"
    >
      {data.total === "shown"
        ? copy(language, "coins_total", { amount: formatAmount(totalGr(items)) })
        : ""}
    </p>
  );
}

/** The tray: every place drawn, filled or empty. A filled place is a button when `onTake` is given. */
function Tray({
  data,
  places,
  tone,
  language,
  clock,
  onTake,
}: {
  data: CoinsData;
  places: readonly (Denom | null)[];
  tone: Tone;
  language: Language;
  clock?: Clock | undefined;
  onTake?(i: number, at: Instant, modality: PressModality): void;
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label={copy(language, "coins_tray")}
      data-tone={tone}
      data-tray={data.slots}
      className={cn(
        "flex flex-wrap gap-2 rounded-xl border-2 p-3",
        tone === "idle" ? "border-border" : TONE_CLASS[tone],
      )}
    >
      {places.map((d, i) => {
        if (d === null)
          return (
            <span
              key={i}
              role="img"
              aria-label={copy(language, "coins_slot_empty")}
              data-place="empty"
              className={cn(PLACE, "border-dashed border-border")}
            />
          );
        const token = tokenOf(d);
        if (!onTake || !clock)
          return (
            <span
              key={i}
              data-place={d}
              className={cn(PLACE, "border-transparent")}
              role="img"
              aria-label={token.face}
            >
              <CoinFace token={token} />
            </span>
          );
        const h = press(clock, (at, modality) => onTake(i, at, modality));
        return (
          <button
            key={i}
            type="button"
            data-place={d}
            aria-label={copy(language, "coins_take_back", { value: token.face })}
            className={cn(PLACE, TAP, "border-transparent bg-transparent")}
            onPointerDown={h.onPointerDown}
            onClick={h.onClick}
          >
            <CoinFace token={token} />
          </button>
        );
      })}
    </div>
  );
}

function placesOf(data: CoinsData, items: readonly Denom[]): (Denom | null)[] {
  return Array.from({ length: data.slots }, (_, i) => items[i] ?? null);
}

export function CoinsStill({
  data,
  language,
  shown,
  right,
}: SurfaceStillProps<typeof Surface.Coins>): JSX.Element {
  const mine = itemsOf(shown);
  const good = itemsOf(right);
  // Right when the totals match and it is no longer than the fewest (the still has no key to ask).
  const same =
    mine !== null && good !== null && totalGr(mine) === totalGr(good) && mine.length <= good.length;
  const tone: Tone =
    good === null || mine === null
      ? "idle"
      : same
        ? "green"
        : totalGr(mine) === totalGr(good)
          ? "idle"
          : "amber";
  return (
    <div className="flex flex-col gap-4">
      <Amount data={data} />
      {mine !== null && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours />
          <Tray data={data} places={placesOf(data, mine)} tone={tone} language={language} />
        </div>
      )}
      {good !== null && !same && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours={false} />
          <Tray data={data} places={placesOf(data, good)} tone="green" language={language} />
        </div>
      )}
      {mine === null && good === null && (
        <Tray data={data} places={placesOf(data, [])} tone="idle" language={language} />
      )}
    </div>
  );
}

export function CoinsPlay(props: SurfacePlayProps<typeof Surface.Coins>): JSX.Element {
  const { data, language, clock, live } = props;
  const seed = props.initialValue ?? undefined;
  const [places, setPlaces] = useState<(Denom | null)[]>(() =>
    placesOf(data, seed !== undefined && "items" in seed ? seed.items.filter(isDenom) : []),
  );
  const step = usePlaceStep(props, missingCoins);
  const items = places.filter((d): d is Denom => d !== null);
  const value = items.length > 0 ? { items } : null;
  if (showingSolution(props))
    return (
      <PlaceSolution
        props={props}
        stem={data.stem}
        still={<CoinsStill data={data} language={language} shown={value} right={props.solution} />}
      />
    );

  const full = places.every((d) => d !== null);
  return (
    <PlaceShell
      props={props}
      step={step}
      value={value}
      stem={data.stem}
      under={<Amount data={data} />}
      answer={
        <div className="flex flex-col gap-3">
          <Tray
            data={data}
            places={places}
            tone={step.whole}
            language={language}
            clock={clock}
            onTake={(i, when, modality) => {
              if (!live) return;
              step.moved(when, modality);
              setPlaces((p) => p.map((d, j) => (j === i ? null : d)));
            }}
          />
          <TotalLine data={data} items={items} language={language} />
          <div
            role="group"
            aria-label={copy(language, "coins_bank")}
            data-bank={data.bank.length}
            className="flex flex-wrap items-center gap-2"
          >
            {data.bank.filter(isDenom).map((d) => {
              const token = tokenOf(d);
              const h = press(clock, (when, modality) => {
                if (!live) return;
                step.moved(when, modality);
                setPlaces((p) => {
                  const at = p.indexOf(null);
                  return at < 0 ? p : p.map((x, j) => (j === at ? d : x));
                });
              });
              return (
                <button
                  key={d}
                  type="button"
                  data-denom={d}
                  disabled={!live || full}
                  aria-label={copy(language, "coins_add", { value: token.face })}
                  className={cn(
                    TAP,
                    "flex items-center justify-center rounded-lg border-2 border-transparent bg-transparent p-1 disabled:opacity-50",
                  )}
                  onPointerDown={h.onPointerDown}
                  onClick={h.onClick}
                >
                  <CoinFace token={token} />
                </button>
              );
            })}
          </div>
        </div>
      }
    />
  );
}
