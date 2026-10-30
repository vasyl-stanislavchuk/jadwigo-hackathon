/**
 * Two System page sections (dl-uukj.32.12). "Tiles and still answers": the readout a task shows
 * (TaskTarget) at a laptop's 44 and a phone's 36 side by side, the outcome tile an app page draws
 * (OutcomeTile) in its 5 tones and 3 sizes with the parent's icon set (dl-uukj.32.19), and the
 * kit's parts still to come. "Gaps for the owner": what the Zeszyt-everywhere refactor left for the
 * owner (dl-uukj.32.7), now the one answer deferred, with the values it is about, read live.
 */

import { copy } from "@jadwigo/copy";
import { TaskTarget } from "@jadwigo/lesson-kit";
import { OutcomeTile } from "@jadwigo/ui";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { OWNER_GAPS, PARENT_OUTCOMES } from "./data.ts";
import { Sub } from "./Foundations.tsx";
import { useSystemLanguage } from "./lang.ts";
import { declaredAt, isColour, useLiveValues } from "./live.ts";

const CARD = "flex min-w-0 flex-col gap-3 rounded-2xl border-2 border-border bg-card p-5";

/** The readout's pair (decision 2026-10-30-a-task-s-readout-is-44-px-on-a-laptop-and-36-px-on-a-
 * phone): each drawn at the size the stylesheet declares for its frame, whatever the window. */
const READOUTS = [
  { frame: "laptop", word: "On a laptop", phone: false },
  { frame: "phone", word: "On a phone", phone: true },
] as const;

/** The tile's smaller sizes, after the legend's 40: a lesson card's, a question sheet's row. */
const ROWS = [
  { size: "sm", px: 32 },
  { size: "xs", px: 28 },
] as const;

function Readouts(): JSX.Element {
  const [sizes, setSizes] = useState<Record<string, string>>({});
  // The sheets are the page's own and fixed once it has loaded.
  useLayoutEffect(() => {
    setSizes(
      Object.fromEntries(READOUTS.map((r) => [r.frame, declaredAt("--jw-size-target", r.phone)])),
    );
  }, []);
  return (
    <div className="flex flex-wrap items-end gap-8">
      {READOUTS.map((r) => {
        const size = sizes[r.frame] ?? "";
        return (
          <figure key={r.frame} className="flex flex-col gap-2" data-readout={r.frame}>
            <div
              // The frame's own value, read from the stylesheet, so a phone's 36 shows in a laptop's
              // window; TaskTarget reads the token as it always does.
              style={size === "" ? undefined : ({ "--jw-size-target": size } as CSSProperties)}
            >
              <TaskTarget>6 · 8 = ?</TaskTarget>
            </div>
            <figcaption className="text-sm text-muted-foreground">
              {r.word} · <code>--jw-size-target</code> <span className="tabular-nums">{size}</span>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
/** A part the kit has not exported yet: named, never drawn by hand. */
const WAITING = [
  {
    name: "The kid tile",
    what: "The tile helper every tile shares (the kit's step 5, dl-uukj.32.4). Today's tiles are drawn under Components, Tiles.",
  },
  {
    name: "StillAnswer",
    what: "An answer held still once its step ends, beside the solution (the kit's step 6, dl-uukj.32.4).",
  },
] as const;

/** Every outcome at the legend's size with its word and tone, then the row at each size. */
function OutcomeLegend(): JSX.Element {
  const language = useSystemLanguage();
  return (
    <>
      <ul className="flex flex-col gap-2">
        {PARENT_OUTCOMES.map((o) => {
          const Icon = o.icon;
          const word = copy(language, o.word, {}, "adult");
          return (
            <li key={o.outcome} className="flex items-center gap-3" data-tone={o.tone}>
              <OutcomeTile
                tone={o.tone}
                outcome={o.outcome}
                icon={<Icon aria-hidden />}
                label={`${word}, 40 px`}
              />
              <span className="flex min-w-0 flex-col">
                <span>{word}</span>
                <code className="text-sm text-muted-foreground">{o.tone}</code>
              </span>
            </li>
          );
        })}
      </ul>
      {ROWS.map(({ size, px }) => (
        <div key={size} className="flex flex-wrap items-center gap-2" data-tile-size={size}>
          {PARENT_OUTCOMES.map((o) => {
            const Icon = o.icon;
            return (
              <OutcomeTile
                key={o.outcome}
                tone={o.tone}
                outcome={o.outcome}
                size={size}
                icon={<Icon aria-hidden />}
                label={`${copy(language, o.word, {}, "adult")}, ${px} px`}
              />
            );
          })}
          <span className="text-sm text-muted-foreground tabular-nums">{px} px</span>
        </div>
      ))}
    </>
  );
}

export function TilesAndStillAnswers(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Sub
          title="The readout"
          lead="TaskTarget: the big number a task shows beside its figure, at --jw-size-target, bold, in tabular figures. 44 on a laptop and 36 on a phone: the same step above the prompt in both frames."
        >
          <div className={CARD} data-system-part="task-target">
            <Readouts />
          </div>
        </Sub>
        <Sub
          title="The outcome tile"
          lead="OutcomeTile: how a question ended, on an app page. The parent's six outcomes on five tones, each with its icon from one set, so it reads without colour too: paper on the green edge for one got there after tries or help, a dashed edge for one not asked. 40 px in the heatmap, 32 in a legend or a lesson card, 28 in a question sheet's row."
        >
          <div className={CARD} data-system-part="outcome-tile">
            <OutcomeLegend />
          </div>
        </Sub>
      </div>
      <Sub title="Waiting on the kit" lead="Named here until @jadwigo/lesson-kit exports them.">
        <ul className="grid gap-4 md:grid-cols-2">
          {WAITING.map((w) => (
            <li key={w.name} className={CARD} data-system-waiting={w.name}>
              <span className="text-lg">{w.name}</span>
              <span className="text-muted-foreground">{w.what}</span>
            </li>
          ))}
        </ul>
      </Sub>
    </div>
  );
}

export function OwnerGaps({ mode }: { mode: string }): JSX.Element {
  const root = useRef<HTMLOListElement>(null);
  const values = useLiveValues(
    root,
    OWNER_GAPS.flatMap((g) => g.tokens),
    mode,
  );
  return (
    <ol ref={root} className="grid gap-4 md:grid-cols-2">
      {OWNER_GAPS.map((g, i) => (
        <li key={g.id} className={CARD} data-owner-gap={g.id}>
          <span className="text-sm text-muted-foreground tabular-nums">
            {i + 1} · {g.cite}
          </span>
          <span className="text-xl">{g.title}</span>
          <span className="text-muted-foreground">{g.body}</span>
          <ul className="flex flex-col gap-1 text-sm">
            {g.tokens.map((t) => {
              const value = values[t] ?? "";
              return (
                <li key={t} className="flex items-center gap-2" data-live-value={t}>
                  {isColour(value) && (
                    <span
                      aria-hidden
                      className="size-4 shrink-0 rounded-full border-2 border-border"
                      // The swatch shows the value it names, read live: no utility per token.
                      style={{ background: `var(${t})` }}
                    />
                  )}
                  <code>{t}</code>
                  <span className="tabular-nums">{value}</span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
