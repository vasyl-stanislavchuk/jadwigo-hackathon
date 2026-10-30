/**
 * The Sequence view (dl-w3.37.13): cards the learner puts in order between two labelled ends, on
 * the SortableList part (drag, tap-tap, or tap-tap from a keyboard). Check commits the order.
 *
 * Tile mode (dl-w3.51.9): a bank of tiles above a row of numbered places, on the TileBank part.
 * The bank keeps its tiles, so `8`, `+`, `8` is built from two tiles; a place is emptied by
 * tapping it. Check before every place is filled marks the empty places and commits nothing.
 *
 * Play: the cards start in the order the step lists them, which an author writes unsolved
 * (validate.ts warns otherwise). After a miss the order stays as the learner left it and the whole
 * list is red until the next move: a position is never marked, because that would say where a
 * card belongs (the marks rule).
 *
 * Help (families/help.ts): rung 1 outlines the cards, tiles or places it names, and rung 2 fixes
 * the cards it gives at their right place, or fills the places it gives with their tile. The other
 * cards keep their order around them, and a fixed card or place cannot be moved again.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { useEffect, useRef, useState } from "react";
import { RichText } from "../../parts/RichText.tsx";
import { SortableList } from "../../parts/SortableList.tsx";
import { StepShell } from "../../parts/StepShell.tsx";
import { orMissing, useMissing } from "../../parts/status.ts";
import { TileBank } from "../../parts/TileBank.tsx";
import { praised, TONE_CLASS, type Tone, useChanged, wholeTone } from "../../parts/tone.ts";
import type { Instant } from "../../stage/clock.ts";
import { type PressModality, press } from "../../stage/press.ts";
import type { Language } from "../../stage/types.ts";
import { missingSequence } from "../complete.ts";
import type { Family } from "../names.ts";
import { Stem } from "../Stem.tsx";
import {
  answers,
  helpIn,
  type PlayProps,
  shellOf,
  showingSolution,
  ViewMode,
  type ViewProps,
} from "../view.ts";
import {
  type SequenceData,
  type SequenceItem,
  type SequenceValue,
  slotCount,
  slotId,
  tileMode,
} from "./model.ts";

type F = typeof Family.Sequence;

/** The cards rung 2 fixed, and where (0 is first), read from the ladder's Given. */
function placedOf(given: unknown): Record<string, number> {
  const placed = (given as { placed?: Record<string, number> } | null)?.placed;
  return placed && typeof placed === "object" ? placed : {};
}

/** The places rung 2 filled, by place id, read from the ladder's Given. */
function slotsOf(given: unknown): Record<string, string> {
  const slots = (given as { slots?: Record<string, string> } | null)?.slots;
  return slots && typeof slots === "object" ? slots : {};
}

/** `order` with each fixed card at its place and the others in their order around them. */
export function withPlaced(order: readonly string[], placed: Record<string, number>): string[] {
  const fixed = Object.keys(placed).filter((id) => order.includes(id));
  if (fixed.length === 0) return [...order];
  const out: (string | null)[] = order.map(() => null);
  for (const id of fixed) {
    const at = placed[id];
    if (at !== undefined && at >= 0 && at < out.length) out[at] = id;
  }
  const rest = order.filter((id) => !out.includes(id));
  let n = 0;
  return out.map((id) => id ?? rest[n++] ?? "");
}

function OrderList({
  data,
  order,
  tone,
  label,
}: {
  data: SequenceData;
  order: readonly string[];
  tone: Tone;
  label: string;
}): JSX.Element {
  const text = (id: string) => data.items.find((i) => i.id === id)?.text ?? id;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-jw-small">{label}</span>
      <ol
        data-tone={tone}
        className={cn(
          "flex flex-col gap-2 rounded-2xl border-2 p-2",
          tone === "idle" ? "border-border" : TONE_CLASS[tone],
        )}
      >
        {order.map((id, i) => (
          <li
            key={id}
            className="flex min-h-[var(--kid-tap-min)] items-center gap-4 rounded-xl bg-card px-4 text-[length:var(--kid-answer-size)] font-semibold"
          >
            <span aria-hidden="true" className="tabular-nums">
              {i + 1}.
            </span>
            <RichText inline text={text(id)} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Tile mode's places in a row, each with its tile's words, or empty. */
function TileRow({
  tiles,
  order,
  slots,
  tone,
  label,
}: {
  tiles: SequenceItem[];
  order: readonly (string | null)[] | null;
  slots: number;
  tone: Tone;
  label: string;
}): JSX.Element {
  const text = (id: string | null) => (!id ? null : (tiles.find((t) => t.id === id)?.text ?? id));
  return (
    <div className="flex flex-col gap-2">
      <span className="text-jw-small">{label}</span>
      <ol
        data-tone={tone}
        className={cn(
          "flex flex-wrap items-center gap-[var(--kid-choice-gap)] rounded-2xl border-2 p-2",
          tone === "idle" ? "border-border" : TONE_CLASS[tone],
        )}
      >
        {Array.from({ length: slots }, (_, i) => {
          const t = text(order?.[i] ?? null);
          return (
            <li
              key={slotId(i + 1)}
              className={cn(
                "flex min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] items-center justify-center gap-2 rounded-xl border-2 bg-card px-3 text-[length:var(--kid-answer-size)] font-semibold",
                t === null ? "border-dashed border-border" : "border-border",
              )}
            >
              <span
                aria-hidden="true"
                className="text-jw-small font-bold text-muted-foreground tabular-nums"
              >
                {i + 1}
              </span>
              {t !== null && <RichText inline text={t} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TilesStill({
  data,
  say,
  language,
  shown,
  right,
  paper,
  bare,
}: {
  data: SequenceData & { tiles: SequenceItem[] };
  say: string;
  language: Language;
  shown: SequenceValue | null;
  right: SequenceValue | null;
  paper: boolean;
  bare: boolean;
}): JSX.Element {
  const slots = slotCount(data, right ? { orders: [right] } : undefined);
  const same = shown !== null && right !== null && shown.join() === right.join();
  return (
    <div className="kid-family-sequence flex flex-col gap-6">
      {!bare && <Stem say={say} stem={data.stem} language={language} paper={paper} />}
      <ul
        className="flex flex-wrap gap-[var(--kid-choice-gap)]"
        aria-label={copy(language, "drag_tray")}
      >
        {data.tiles.map((t) => (
          <li
            key={t.id}
            className="flex min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] items-center justify-center rounded-xl border-2 border-border bg-card px-4 text-[length:var(--kid-answer-size)] font-semibold"
          >
            <RichText inline text={t.text} />
          </li>
        ))}
      </ul>
      {shown !== null && (
        <TileRow
          tiles={data.tiles}
          order={shown}
          slots={slots}
          tone={right === null ? "idle" : same ? "green" : "try_again"}
          label={copy(language, "answer_yours")}
        />
      )}
      {right !== null && !same && (
        <TileRow
          tiles={data.tiles}
          order={right}
          slots={slots}
          tone="green"
          label={copy(language, "answer_right")}
        />
      )}
      {shown === null && right === null && (
        <TileRow
          tiles={data.tiles}
          order={null}
          slots={slots}
          tone="idle"
          label={copy(language, "answer_field")}
        />
      )}
    </div>
  );
}

function SequenceStill({
  data,
  say,
  language,
  shown,
  right,
  paper,
  bare = false,
}: {
  data: SequenceData;
  say: string;
  language: Language;
  shown: SequenceValue | null;
  right: SequenceValue | null;
  paper: boolean;
  bare?: boolean | undefined;
}): JSX.Element {
  if (tileMode(data))
    return (
      <TilesStill
        data={data}
        say={say}
        language={language}
        shown={shown}
        right={right}
        paper={paper}
        bare={bare}
      />
    );
  const same = shown !== null && right !== null && shown.join() === right.join();
  return (
    <div className="kid-family-sequence flex flex-col gap-6">
      {!bare && <Stem say={say} stem={data.stem} language={language} paper={paper} />}
      <p className="text-lg">
        ↑ {data.first_label} · ↓ {data.last_label}
      </p>
      {shown !== null && (
        <OrderList
          data={data}
          order={shown}
          tone={right === null ? "idle" : same ? "green" : "try_again"}
          label={copy(language, "answer_yours")}
        />
      )}
      {right !== null && !same && (
        <OrderList data={data} order={right} tone="green" label={copy(language, "answer_right")} />
      )}
      {shown === null && right === null && (
        <OrderList
          data={data}
          order={data.items.map((i) => i.id)}
          tone="idle"
          label={copy(language, "answer_field")}
        />
      )}
    </div>
  );
}

function TilesPlay(
  props: PlayProps<F> & { data: SequenceData & { tiles: SequenceItem[] } },
): JSX.Element {
  const { spec, data, language, clock, live, attemptNo, feedback, onCommit } = props;
  const slots = slotCount(data);
  const known = new Set(data.tiles.map((t) => t.id));
  // The review tab seeds an answer: each place takes its tile when the bank has it, else stays empty.
  const seeded = (): (string | null)[] =>
    Array.from({ length: slots }, (_, i) =>
      props.initialValue?.[i] !== undefined && known.has(props.initialValue[i])
        ? props.initialValue[i]
        : null,
    );
  const [placed, setPlaced] = useState<(string | null)[]>(seeded);
  const onset = useRef<{ at: Instant; modality: PressModality } | null>(null);
  const { changed, change } = useChanged(attemptNo);
  const { missing, flag, clear } = useMissing(attemptNo);
  const incompleteOnMount = props.initialIncomplete === true;
  useEffect(() => {
    if (!incompleteOnMount) return;
    const gap = missingSequence(data, seeded());
    if (gap !== null) flag(gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { focus, given } = helpIn(
    props,
    data.items.map((i) => i.id),
  );
  const fixed = slotsOf(given);
  const fixedKey = JSON.stringify(fixed);
  useEffect(() => {
    onset.current = null;
  }, [attemptNo]);
  useEffect(() => {
    const filled = JSON.parse(fixedKey) as Record<string, string>;
    if (Object.keys(filled).length > 0)
      setPlaced((now) => now.map((tile, i) => filled[slotId(i + 1)] ?? tile));
  }, [fixedKey]);

  if (showingSolution(props))
    return (
      <StepShell
        {...shellOf(props)}
        moveOn={null}
        stem={<Stem say={spec.say} stem={data.stem} language={language} />}
        answer={
          <TilesStill
            data={data}
            say={spec.say}
            language={language}
            shown={placed.map((t) => t ?? "")}
            right={props.solution}
            paper={false}
            bare
          />
        }
        action={null}
      />
    );

  const full = placed.every((t) => t !== null);
  const check = press(clock, (at, modality) => {
    if (!live) return;
    const gap = missingSequence(data, placed);
    if (gap !== null) return flag(gap);
    onCommit({
      value: placed.map((t) => t as string),
      t1: onset.current?.at ?? at,
      modality: onset.current?.modality ?? modality,
    });
  });
  const tone: Tone = praised(feedback) ? "green" : wholeTone(feedback, changed);

  return (
    <StepShell
      {...shellOf(props)}
      className="kid-family-sequence"
      incomplete={missing?.reason ?? null}
      stem={<Stem say={spec.say} stem={data.stem} language={language} />}
      action={{ ready: live && full, press: check }}
      answer={
        <TileBank
          language={language}
          label={spec.say}
          tiles={data.tiles.map((t) => ({
            id: t.id,
            text: t.text,
            content: <RichText inline text={t.text} />,
            focus: focus.has(t.id),
          }))}
          places={placed.map((tile, i) => {
            const id = slotId(i + 1);
            return {
              id,
              tile,
              given: id in fixed,
              focus: focus.has(id),
              missing: orMissing("idle", id, missing) === "missing",
            };
          })}
          firstLabel={data.first_label}
          lastLabel={data.last_label}
          tone={tone}
          locked={!live}
          clock={clock}
          onPlace={(i, tile, at, modality) => {
            onset.current ??= { at, modality };
            change(slotId(i + 1));
            clear();
            setPlaced((now) => now.map((t, j) => (j === i ? tile : t)));
          }}
        />
      }
    />
  );
}

function SequencePlay(props: PlayProps<F>): JSX.Element {
  const { spec, language, clock, live, attemptNo, feedback, onCommit } = props;
  const data = spec.data;
  const [order, setOrder] = useState<string[]>(() => {
    const seed = props.initialValue;
    // A seeded order must hold every card once; anything else starts as written.
    return seed !== undefined &&
      seed.length === data.items.length &&
      data.items.every((i) => seed.includes(i.id))
      ? [...seed]
      : data.items.map((i) => i.id);
  });
  const onset = useRef<{ at: Instant; modality: PressModality } | null>(null);
  const { changed, change } = useChanged(attemptNo);
  const { focus, given } = helpIn(
    props,
    data.items.map((i) => i.id),
  );
  const placed = placedOf(given);
  const placedKey = JSON.stringify(placed);
  useEffect(() => {
    onset.current = null;
  }, [attemptNo]);
  useEffect(() => {
    setOrder((now) => withPlaced(now, JSON.parse(placedKey) as Record<string, number>));
  }, [placedKey]);

  // The solution stays in the step layout, its status saying the step was moved on (docs/17 §2f rule 2).
  if (showingSolution(props))
    return (
      <StepShell
        {...shellOf(props)}
        moveOn={null}
        stem={<Stem say={spec.say} stem={spec.data.stem} language={language} />}
        answer={
          <SequenceStill
            data={data}
            say={spec.say}
            language={language}
            shown={order}
            right={props.solution}
            paper={false}
            bare
          />
        }
        action={null}
      />
    );

  const check = press(clock, (at, modality) => {
    if (live)
      onCommit({
        value: [...order],
        t1: onset.current?.at ?? at,
        modality: onset.current?.modality ?? modality,
      });
  });
  const tone: Tone = praised(feedback) ? "green" : wholeTone(feedback, changed);

  return (
    <StepShell
      {...shellOf(props)}
      className="kid-family-sequence"
      stem={<Stem say={spec.say} stem={spec.data.stem} language={language} />}
      action={{ ready: live, press: check }}
      answer={
        <SortableList
          language={language}
          label={spec.say}
          items={order.map((id) => {
            const text = data.items.find((i) => i.id === id)?.text ?? id;
            return {
              id,
              text,
              content: <RichText inline text={text} />,
              given: id in placed,
              focus: focus.has(id),
            };
          })}
          firstLabel={data.first_label}
          lastLabel={data.last_label}
          tone={tone}
          locked={!live}
          clock={clock}
          onReorder={(next, at, modality) => {
            onset.current ??= { at, modality };
            change("order");
            setOrder(next);
          }}
        />
      }
    />
  );
}

export function SequenceView(props: ViewProps<F>): JSX.Element {
  if (props.mode === ViewMode.Play) {
    const data = props.spec.data;
    return tileMode(data) ? <TilesPlay {...props} data={data} /> : <SequencePlay {...props} />;
  }
  const { shown, right } = answers(props);
  return (
    <SequenceStill
      data={props.spec.data}
      say={props.spec.say}
      language={props.language}
      shown={shown}
      right={right}
      paper={props.mode === ViewMode.Print}
    />
  );
}
