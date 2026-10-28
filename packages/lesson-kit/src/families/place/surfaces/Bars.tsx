/**
 * Place on a graph (draw_graph, dl-w3.51.3): one bar per category, set by a tap or a drag on its
 * column or by the arrow keys on the focused bar; the data to draw sits in the stem. A bar rung 2
 * gave away is drawn settled and locked, and goes into every commit. After a miss each bar is
 * marked (the marks rule). Moved out of PlaceView.tsx (dl-w3.61.1).
 */

import { copy } from "@jadwigo/copy";
import { useState } from "react";
import { BarGraph } from "../../../parts/BarGraph.tsx";
import { type GraphCategory, tickOf } from "../../../parts/graph.ts";
import { partTone, praised, type Tone } from "../../../parts/tone.ts";
import type { Language } from "../../../stage/types.ts";
import { missingBars } from "../../complete.ts";
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

type BarsData = DataOf<typeof Surface.Bars>;

/** The words a graph's part needs: its aria label, each bar's label and value text, the legend. */
function graphWords(data: BarsData, language: Language) {
  const unit = data.unit_label ?? "";
  // A category label may be TeX; what is read aloud or announced keeps its words only.
  const plain = (label: string) =>
    label
      .replaceAll("$", "")
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .trim();
  return {
    label: copy(language, "graph_label", { max: data.max }),
    barLabel: (c: GraphCategory) =>
      copy(language, data.kind === "line" ? "point_label" : "bar_label", { label: plain(c.label) }),
    valueText: (c: GraphCategory, h: number) =>
      copy(language, "bar_height", { label: plain(c.label), value: h, unit }).trim(),
    legend:
      data.kind === "picture"
        ? copy(language, "picture_stands_for", { n: tickOf(data), unit }).trim()
        : undefined,
  };
}

/** Every category's height: what help gave, else what was drawn, else the starting height, else 0. */
function allHeights(
  data: BarsData,
  drawn: Record<string, number> | null,
  given: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of data.categories)
    out[c.id] = given[c.id] ?? drawn?.[c.id] ?? data.starting?.[c.id] ?? 0;
  return out;
}

export function BarsStill({
  data,
  language,
  shown,
  right,
}: SurfaceStillProps<typeof Surface.Bars>): JSX.Element {
  const words = graphWords(data, language);
  const mine = shown !== null && "heights" in shown ? allHeights(data, shown.heights, {}) : null;
  const good = right !== null && "heights" in right ? allHeights(data, right.heights, {}) : null;
  const same =
    mine !== null && good !== null && data.categories.every((c) => mine[c.id] === good[c.id]);
  const tonesOf = (
    heights: Record<string, number>,
    against: Record<string, number> | null,
  ): Record<string, Tone> =>
    Object.fromEntries(
      data.categories.map((c) => [
        c.id,
        against === null ? "idle" : heights[c.id] === against[c.id] ? "green" : "amber",
      ]),
    );
  return (
    <div className="flex flex-col gap-4">
      {mine !== null && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours />
          <BarGraph data={data} heights={mine} tones={tonesOf(mine, good)} tone="idle" {...words} />
        </div>
      )}
      {good !== null && !same && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours={false} />
          <BarGraph data={data} heights={good} tones={tonesOf(good, good)} tone="idle" {...words} />
        </div>
      )}
      {mine === null && good === null && (
        <BarGraph
          data={data}
          heights={allHeights(data, null, {})}
          tones={{}}
          tone="idle"
          {...words}
        />
      )}
    </div>
  );
}

export function BarsPlay(props: SurfacePlayProps<typeof Surface.Bars>): JSX.Element {
  const { data, language, clock, live, feedback } = props;
  const seed = props.initialValue ?? undefined;
  const [drawn, setDrawn] = useState<Record<string, number> | null>(() =>
    seed !== undefined && "heights" in seed ? { ...seed.heights } : null,
  );
  const step = usePlaceStep(props, missingBars);
  const givenHeights =
    (step.help.given as { heights?: Record<string, number> } | null)?.heights ?? {};
  const heights = allHeights(data, drawn, givenHeights);
  const value = drawn === null ? null : { heights };
  if (showingSolution(props))
    return (
      <PlaceSolution
        props={props}
        stem={data.stem}
        still={<BarsStill data={data} language={language} shown={value} right={props.solution} />}
      />
    );

  const tones: Record<string, Tone> = Object.fromEntries(
    data.categories.map((c) => [
      c.id,
      praised(feedback) ? "green" : partTone(c.id, feedback, step.changed),
    ]),
  );
  return (
    <PlaceShell
      props={props}
      step={step}
      value={value}
      stem={data.stem}
      answer={
        <BarGraph
          data={data}
          heights={heights}
          tones={tones}
          tone={feedback?.parts === undefined ? step.whole : "idle"}
          {...graphWords(data, language)}
          given={new Set(Object.keys(givenHeights))}
          focus={step.help.focus}
          interactive={{
            onChange: (id, height, modality) => {
              if (!live) return;
              step.moved(clock.now(), modality, id);
              setDrawn((d) => ({ ...(d ?? {}), [id]: height }));
            },
          }}
        />
      }
    />
  );
}
