/**
 * Two System page sections (dl-uukj.32.12). "Tiles and still answers": the readout a task shows
 * (TaskTarget), the outcome tile an app page draws (OutcomeTile) in its 3 tones and 2 sizes, and
 * the kit's parts still to come. "Gaps for the owner": what the Zeszyt-everywhere refactor leaves
 * for the owner to answer (dl-uukj.32.7), each with the values it is about, read live.
 */

import { TaskTarget } from "@jadwigo/lesson-kit";
import { OutcomeTile } from "@jadwigo/ui";
import { Check, Sprout, Star } from "lucide-react";
import { useRef } from "react";
import { OWNER_GAPS } from "./data.ts";
import { Sub } from "./Foundations.tsx";
import { isColour, useLiveValues } from "./live.ts";

const CARD = "flex min-w-0 flex-col gap-3 rounded-2xl border-2 border-border bg-card p-5";

const TONES = [
  { tone: "right", icon: Star, word: "Right" },
  { tone: "miss", icon: Sprout, word: "A miss" },
  { tone: "plain", icon: Check, word: "Plain" },
] as const;

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

export function TilesAndStillAnswers(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Sub
          title="The readout"
          lead="TaskTarget: the big number a task shows beside its figure, at --jw-size-target, bold, in tabular figures."
        >
          <div className={CARD} data-system-part="task-target">
            <TaskTarget>6 · 8 = ?</TaskTarget>
            <TaskTarget className="text-center leading-tight">12:45</TaskTarget>
          </div>
        </Sub>
        <Sub
          title="The outcome tile"
          lead="OutcomeTile: how a question ended, on an app page. An icon and a tone, so it reads without colour too. 40 px, 32 in a legend."
        >
          <div className={CARD} data-system-part="outcome-tile">
            {(["md", "sm"] as const).map((size) => (
              <div key={size} className="flex flex-wrap items-center gap-4">
                {TONES.map(({ tone, icon: Icon, word }) => (
                  <span key={tone} className="flex items-center gap-2">
                    <OutcomeTile
                      tone={tone}
                      size={size}
                      icon={<Icon aria-hidden />}
                      label={`${word}, ${size === "md" ? "40" : "32"} px`}
                    />
                    <span className="text-sm text-muted-foreground">{word}</span>
                  </span>
                ))}
              </div>
            ))}
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
          <span className="text-sm text-muted-foreground tabular-nums">{i + 1} · dl-uukj.32.7</span>
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
