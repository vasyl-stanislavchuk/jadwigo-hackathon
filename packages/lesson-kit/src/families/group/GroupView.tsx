/**
 * The Group view (dl-w3.37.13): cards the learner puts into groups. Two layouts draw the same value
 * (model.ts `layout`):
 *
 * - `zones`: the DropZones part (drag, tap-tap, or tap-tap from a keyboard). A group that takes one
 *   card sends the card already there back to the tray when another is put in. With `each_item:
 *   'many'` a card may sit in several groups. Check commits once every card is placed.
 * - `columns` (dl-w3.51.7, match's default, after Khan's matcher): the items stand in a fixed left
 *   column and the groups in a right column the learner reorders with the SortableList part (drag,
 *   tap-tap, the up and down buttons, or a keyboard). Row i pairs item i with the group beside it,
 *   so the committed value is still items to groups. The right column starts in the order the step
 *   lists its groups, which an author lists shuffled (validate.ts warns otherwise).
 *
 * Cards take markdown and TeX (RichText) and a picture (Picture). Play: after a miss the cards stay
 * where the learner put them. With three or more groups each card (each pair) is marked; with two
 * the whole step is, because a marked card could only belong in the other group (the marks rule).
 *
 * Help (families/help.ts): rung 1 outlines the cards or groups it names, and rung 2 puts the cards
 * it gives in a right group, where they stay. In zones they cannot be picked up, and a full group
 * keeps them. In columns the given item's group is pinned at the item's row and cannot be moved.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { useEffect, useRef, useState } from "react";
import { DropZones, TRAY } from "../../parts/DropZones.tsx";
import { Picture } from "../../parts/Picture.tsx";
import { RichText } from "../../parts/RichText.tsx";
import { SortableList } from "../../parts/SortableList.tsx";
import { StepShell } from "../../parts/StepShell.tsx";
import { orMissing, useMissing } from "../../parts/status.ts";
import {
  partTone,
  praised,
  TONE_CLASS,
  type Tone,
  useChanged,
  wholeTone,
} from "../../parts/tone.ts";
import type { Instant } from "../../stage/clock.ts";
import { type PressModality, press } from "../../stage/press.ts";
import type { Language } from "../../stage/types.ts";
import { missingGroup } from "../complete.ts";
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
import { cardWords, type GroupCard, type GroupData, type GroupValue, layoutOf } from "./model.ts";

type F = typeof Family.Group;
type Placement = Record<string, string[]>;

/** The cards rung 2 placed, read from the ladder's Given. */
function itemsOf(given: unknown): Placement {
  const items = (given as { items?: Placement } | null)?.items;
  return items && typeof items === "object" ? items : {};
}

/** Where a card goes when it is put somewhere: one group, several, or back to the tray. A card in
 * `fixed` (given by the help ladder) never moves, and is never sent out of a full group. */
export function placeCard(
  data: GroupData,
  placement: Placement,
  card: string,
  to: string,
  from: string,
  fixed: ReadonlySet<string> = new Set(),
): Placement {
  if (fixed.has(card)) return placement;
  const capacity0 = data.groups.find((g) => g.id === to)?.capacity;
  if (
    to !== TRAY &&
    capacity0 !== undefined &&
    Object.keys(placement).filter((id) => fixed.has(id) && placement[id]?.includes(to)).length >=
      capacity0
  )
    return placement;
  const next: Placement = { ...placement };
  const now = placement[card] ?? [];
  if (to === TRAY) {
    next[card] = data.each_item === "many" && from !== TRAY ? now.filter((g) => g !== from) : [];
    return next;
  }
  if (data.each_item === "many") {
    const kept = from !== TRAY ? now.filter((g) => g !== from) : now;
    next[card] = kept.includes(to) ? kept : [...kept, to];
  } else {
    next[card] = [to];
  }
  const capacity = data.groups.find((g) => g.id === to)?.capacity;
  if (capacity !== undefined) {
    const inside = Object.keys(next).filter(
      (id) => id !== card && !fixed.has(id) && next[id]?.includes(to),
    );
    const kept = Object.keys(next).filter((id) => fixed.has(id) && next[id]?.includes(to)).length;
    for (const id of inside.slice(0, Math.max(0, inside.length + kept - capacity + 1)))
      next[id] = (next[id] ?? []).filter((g) => g !== to);
  }
  return next;
}

/** The right column with each pinned group at its row (rung 2's given pairs) and the others in
 * their order around them. */
export function pinOrder(order: readonly string[], pins: Record<string, number>): string[] {
  const out: (string | null)[] = order.map(() => null);
  for (const [id, at] of Object.entries(pins))
    if (order.includes(id) && at >= 0 && at < order.length) out[at] = id;
  if (out.every((id) => id === null)) return [...order];
  const rest = order.filter((id) => !out.includes(id));
  let n = 0;
  return out.map((id) => id ?? rest[n++] ?? "");
}

/** The rows rung 2 gave away, as pins on the right column: `{group_id: row}`. */
export function pinsOf(data: GroupData, given: Placement): Record<string, number> {
  const pins: Record<string, number> = {};
  data.items.forEach((item, i) => {
    const group = given[item.id]?.[0];
    if (group !== undefined) pins[group] = i;
  });
  return pins;
}

/** The value two columns stand for: row i pairs item i with the group beside it. */
export function pairsOf(data: GroupData, order: readonly string[]): GroupValue {
  return {
    items: Object.fromEntries(
      data.items.map((item, i) => [item.id, order[i] === undefined ? [] : [order[i]]]),
    ),
  };
}

/** A card's face: its picture, when it has one, and its words. */
function CardFace({ card }: { card: GroupCard }): JSX.Element {
  return (
    <span className="flex min-w-0 flex-col items-start gap-2">
      {card.picture && (
        <span className="block max-w-40">
          <Picture
            src={card.picture.src}
            alt={card.picture.alt}
            width={card.picture.width}
            height={card.picture.height}
            labels={card.picture.labels}
          />
        </span>
      )}
      {card.label.trim() !== "" && <RichText inline text={card.label} />}
    </span>
  );
}

const STILL_CARD =
  "flex min-h-[var(--kid-tap-min)] items-center rounded-xl border-2 px-4 text-[length:var(--kid-answer-size)] font-semibold";

function Zones({
  data,
  placement,
  tone,
  label,
}: {
  data: GroupData;
  placement: Placement;
  tone: (item: string, group: string) => Tone;
  label: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-jw-small">{label}</span>
      <div
        className={cn(
          "grid gap-[var(--kid-choice-gap)]",
          data.groups.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3",
        )}
      >
        {data.groups.map((g) => (
          <div
            key={g.id}
            className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-border p-3"
          >
            <span className="text-xl font-semibold">
              <CardFace card={g} />
            </span>
            <ul className="flex flex-wrap gap-2">
              {data.items
                .filter((i) => placement[i.id]?.includes(g.id))
                .map((i) => {
                  const t = tone(i.id, g.id);
                  return (
                    <li
                      key={i.id}
                      data-tone={t}
                      className={cn(
                        STILL_CARD,
                        t === "idle" ? "border-border bg-card" : TONE_CLASS[t],
                      )}
                    >
                      <CardFace card={i} />
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The two columns at rest: each item with the group beside it. */
function Pairs({
  data,
  placement,
  tone,
  label,
}: {
  data: GroupData;
  placement: Placement;
  tone: (item: string) => Tone;
  label: string;
}): JSX.Element {
  const groupOf = (id: string) => data.groups.find((g) => g.id === id);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-jw-small">{label}</span>
      <ol className="flex flex-col gap-[var(--kid-choice-gap)]">
        {data.items.map((item) => {
          const t = tone(item.id);
          const group = groupOf(placement[item.id]?.[0] ?? "");
          return (
            <li key={item.id} data-tone={t} className="flex items-stretch gap-2">
              <span
                className={cn(
                  STILL_CARD,
                  "min-w-0 flex-1 basis-0 bg-background",
                  t === "idle" ? "border-border" : TONE_CLASS[t],
                )}
              >
                <CardFace card={item} />
              </span>
              <span
                className={cn(
                  STILL_CARD,
                  "min-w-0 flex-1 basis-0",
                  t === "idle" ? "border-border bg-card" : TONE_CLASS[t],
                )}
              >
                {group && <CardFace card={group} />}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GroupStill({
  data,
  question_type,
  say,
  language,
  shown,
  right,
  paper,
  bare = false,
}: {
  data: GroupData;
  question_type: string;
  say: string;
  language: Language;
  shown: GroupValue | null;
  right: GroupValue | null;
  paper: boolean;
  bare?: boolean | undefined;
}): JSX.Element {
  const rightFor = (item: string, group: string) => right?.items[item]?.includes(group) ?? false;
  const itemRight = (item: string) =>
    right !== null &&
    (shown?.items[item] ?? []).length === (right.items[item] ?? []).length &&
    (shown?.items[item] ?? []).every((g) => rightFor(item, g));
  const allRight = shown !== null && right !== null && data.items.every((i) => itemRight(i.id));
  const columns = layoutOf(data, question_type) === "columns";
  return (
    <div className="kid-family-group flex flex-col gap-6">
      {!bare && <Stem say={say} stem={data.stem} language={language} paper={paper} />}
      {columns ? (
        <>
          {shown !== null && (
            <Pairs
              data={data}
              placement={shown.items}
              label={copy(language, "answer_yours")}
              tone={(item) => (right === null ? "idle" : itemRight(item) ? "green" : "try_again")}
            />
          )}
          {right !== null && !allRight && (
            <Pairs
              data={data}
              placement={right.items}
              label={copy(language, "answer_right")}
              tone={() => "green"}
            />
          )}
          {shown === null && right === null && (
            <Pairs
              data={data}
              placement={
                pairsOf(
                  data,
                  data.groups.map((g) => g.id),
                ).items
              }
              label={copy(language, "answer_field")}
              tone={() => "idle"}
            />
          )}
        </>
      ) : (
        <>
          {shown !== null && (
            <Zones
              data={data}
              placement={shown.items}
              label={copy(language, "answer_yours")}
              tone={(item, group) =>
                right === null ? "idle" : rightFor(item, group) ? "green" : "try_again"
              }
            />
          )}
          {right !== null && !allRight && (
            <Zones
              data={data}
              placement={right.items}
              label={copy(language, "answer_right")}
              tone={() => "green"}
            />
          )}
          {shown === null && right === null && (
            <Zones
              data={data}
              placement={{}}
              label={copy(language, "drag_tray")}
              tone={() => "idle"}
            />
          )}
        </>
      )}
    </div>
  );
}

function ZonesPlay(props: PlayProps<F>): JSX.Element {
  const { spec, language, clock, live, attemptNo, feedback, onCommit } = props;
  const data = spec.data;
  const [placement, setPlacement] = useState<Placement>(() => ({
    ...(props.initialValue?.items ?? {}),
  }));
  const onset = useRef<{ at: Instant; modality: PressModality } | null>(null);
  const { changed, change } = useChanged(attemptNo);
  const { missing, flag, clear } = useMissing(attemptNo);
  const incompleteOnMount = props.initialIncomplete === true;
  useEffect(() => {
    if (!incompleteOnMount) return;
    const gap = missingGroup(data, { items: props.initialValue?.items ?? {} });
    if (gap !== null) flag(gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { focus, given } = helpIn(
    props,
    data.groups.map((g) => g.id),
    data.items.map((i) => i.id),
  );
  const givenItems = itemsOf(given);
  const givenKey = JSON.stringify(givenItems);
  const fixed = new Set(Object.keys(givenItems));
  useEffect(() => {
    onset.current = null;
  }, [attemptNo]);
  useEffect(() => {
    const items = JSON.parse(givenKey) as Placement;
    if (Object.keys(items).length > 0) setPlacement((p) => ({ ...p, ...items }));
  }, [givenKey]);

  // The solution stays in the step layout, its status saying the step was moved on (docs/17 §2f rule 2).
  if (showingSolution(props))
    return (
      <StepShell
        {...shellOf(props)}
        moveOn={null}
        stem={<Stem say={spec.say} stem={spec.data.stem} language={language} />}
        answer={
          <GroupStill
            data={data}
            question_type={spec.question_type}
            say={spec.say}
            language={language}
            shown={{ items: placement }}
            right={props.solution}
            paper={false}
            bare
          />
        }
        action={null}
      />
    );

  const allPlaced = data.items.every((i) => (placement[i.id] ?? []).length > 0);
  const check = press(clock, (at, modality) => {
    if (!live) return;
    const gap = missingGroup(data, { items: placement });
    if (gap !== null) return flag(gap);
    onCommit({
      value: { items: placement },
      t1: onset.current?.at ?? at,
      modality: onset.current?.modality ?? modality,
    });
  });
  const cardTone = (id: string): Tone =>
    orMissing(praised(feedback) ? "green" : partTone(id, feedback, changed), id, missing);

  return (
    <StepShell
      {...shellOf(props)}
      className="kid-family-group"
      incomplete={missing?.reason ?? null}
      stem={<Stem say={spec.say} stem={spec.data.stem} language={language} />}
      action={{ ready: live && allPlaced, press: check }}
      answer={
        <DropZones
          language={language}
          label={spec.say}
          cards={data.items.map((i) => ({
            id: i.id,
            text: cardWords(i),
            content: <CardFace card={i} />,
            tone: cardTone(i.id),
            given: fixed.has(i.id),
            focus: focus.has(i.id),
          }))}
          zones={data.groups.map((g) => ({
            id: g.id,
            label: cardWords(g),
            content: <CardFace card={g} />,
            focus: focus.has(g.id),
          }))}
          placement={placement}
          tone={praised(feedback) ? "idle" : wholeTone(feedback, changed)}
          locked={!live}
          clock={clock}
          onPlace={(card, to, from, at, modality) => {
            onset.current ??= { at, modality };
            change(card);
            clear();
            setPlacement((p) => placeCard(data, p, card, to, from, fixed));
          }}
        />
      }
    />
  );
}

function ColumnsPlay(props: PlayProps<F>): JSX.Element {
  const { spec, language, clock, live, attemptNo, feedback, onCommit } = props;
  const data = spec.data;
  const [order, setOrder] = useState<string[]>(() => data.groups.map((g) => g.id));
  const onset = useRef<{ at: Instant; modality: PressModality } | null>(null);
  const { changed, change } = useChanged(attemptNo);
  const { focus, given } = helpIn(
    props,
    data.groups.map((g) => g.id),
    data.items.map((i) => i.id),
  );
  const pins = pinsOf(data, itemsOf(given));
  const pinsKey = JSON.stringify(pins);
  useEffect(() => {
    onset.current = null;
  }, [attemptNo]);
  useEffect(() => {
    setOrder((now) => pinOrder(now, JSON.parse(pinsKey) as Record<string, number>));
  }, [pinsKey]);

  // The solution stays in the step layout, its status saying the step was moved on (docs/17 §2f rule 2).
  if (showingSolution(props))
    return (
      <StepShell
        {...shellOf(props)}
        moveOn={null}
        stem={<Stem say={spec.say} stem={spec.data.stem} language={language} />}
        answer={
          <GroupStill
            data={data}
            question_type={spec.question_type}
            say={spec.say}
            language={language}
            shown={pairsOf(data, order)}
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
        value: pairsOf(data, order),
        t1: onset.current?.at ?? at,
        modality: onset.current?.modality ?? modality,
      });
  });
  // Each pair marked (three or more pairs), or the whole step (two pairs): the marks rule.
  const marked = feedback?.parts !== undefined;
  const listTone: Tone = praised(feedback) ? "green" : wholeTone(feedback, changed);
  const rowTone = (item: string): Tone | undefined =>
    marked && !praised(feedback) ? partTone(item, feedback, changed) : undefined;
  const groupOf = (id: string) => data.groups.find((g) => g.id === id) ?? { id, label: id };

  return (
    <StepShell
      {...shellOf(props)}
      className="kid-family-group"
      stem={<Stem say={spec.say} stem={spec.data.stem} language={language} />}
      action={{ ready: live, press: check }}
      answer={
        <SortableList
          language={language}
          label={spec.say}
          items={order.map((id, i) => {
            const g = groupOf(id);
            return {
              id,
              text: cardWords(g),
              content: <CardFace card={g} />,
              tone: rowTone(data.items[i]?.id ?? ""),
              given: id in pins,
              focus: focus.has(id),
            };
          })}
          beside={data.items.map((item) => ({
            content: <CardFace card={item} />,
            text: cardWords(item),
            focus: focus.has(item.id),
          }))}
          tone={listTone}
          locked={!live}
          clock={clock}
          onReorder={(next, at, modality) => {
            onset.current ??= { at, modality };
            next.forEach((id, i) => {
              if (id !== order[i] && data.items[i]) change(data.items[i].id);
            });
            setOrder(next);
          }}
        />
      }
    />
  );
}

export function GroupView(props: ViewProps<F>): JSX.Element {
  if (props.mode === ViewMode.Play)
    return layoutOf(props.spec.data, props.spec.question_type) === "columns" ? (
      <ColumnsPlay {...props} />
    ) : (
      <ZonesPlay {...props} />
    );
  const { shown, right } = answers(props);
  return (
    <GroupStill
      data={props.spec.data}
      question_type={props.spec.question_type}
      say={props.spec.say}
      language={props.language}
      shown={shown}
      right={right}
      paper={props.mode === ViewMode.Print}
    />
  );
}
