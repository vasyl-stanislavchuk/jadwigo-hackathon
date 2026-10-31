/**
 * A match or bucket card with inline TeX stays one sentence (dl-a38n.32.35, as dl-a38n.27 for
 * Choose): a card's face stacks its picture and its words in a column, so the words' runs (a `$7$`
 * formula, then " tenths") must reach it as one element, never as flex items of their own, each of
 * which would draw on its own line. happy-dom does no layout, so the test holds the structure the
 * render rule `render-split-inline` reads: no flex or grid host with both words and a formula as
 * its own children.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Clock, Instant } from "../../stage/clock.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import { GroupView } from "./GroupView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-31T00:00:00.000Z" }) };

const bucket: SpecOf<typeof Family.Group> = {
  id: "s1",
  say: "Sort the numbers",
  question_type: QuestionType.Bucket,
  family: Family.Group,
  data: {
    groups: [
      { id: "c1", label: "$3$ tenths" },
      { id: "c2", label: "$3$ hundredths" },
    ],
    items: [
      { id: "i1", label: "$0.3$" },
      { id: "i2", label: "$0.03$" },
    ],
    each_item: "one",
  },
  key: { items: { i1: ["c1"], i2: ["c2"] } },
};

const match: SpecOf<typeof Family.Group> = {
  id: "s2",
  say: "Match each number to what it tells",
  question_type: QuestionType.Match,
  family: Family.Group,
  data: {
    groups: [
      { id: "r1", label: "The ribbon, in $\\text{m}$, before it was cut", capacity: 1 },
      { id: "r2", label: "The ribbon, in $\\text{m}$, for each child", capacity: 1 },
    ],
    items: [
      { id: "l1", label: "$a=48$" },
      { id: "l2", label: "$b=48\\div 6$" },
    ],
    each_item: "one",
    layout: "columns",
  },
  key: { items: { l1: ["r1"], l2: ["r2"] } },
};

const RUN = "[data-formula], [role='math'], strong, em, code";

/** The hosts `render-split-inline` would report: a flex or grid box holding words and a run side by side. */
function splitHosts(): string[] {
  return [...document.querySelectorAll(".flex, .inline-flex, .grid, .inline-grid")]
    .filter((host) => {
      const kids = [...host.childNodes];
      const words = kids.some((n) => n.nodeType === 3 && (n.textContent ?? "").trim() !== "");
      const run = kids.some((n) => n.nodeType === 1 && (n as Element).matches(RUN));
      return words && run;
    })
    .map((host) => host.textContent ?? "");
}

function play(spec: SpecOf<typeof Family.Group>): void {
  render(
    <GroupView
      language="en"
      category="child"
      clock={clock}
      mode={ViewMode.Play}
      spec={pageSpec(spec) as PageSpecOf<typeof Family.Group>}
      live
      attemptNo={1}
      feedback={null}
      onCommit={() => {}}
    />,
  );
}

/** The solution still: the learner's answer beside the right one, each card drawn twice. */
function still(spec: SpecOf<typeof Family.Group>): void {
  render(
    <GroupView
      language="en"
      category="child"
      clock={clock}
      mode={ViewMode.Solution}
      spec={pageSpec(spec) as PageSpecOf<typeof Family.Group>}
      value={null}
      solution={spec.key}
    />,
  );
}

describe("a group card with inline TeX", () => {
  it.each([
    ["bucket", bucket, play],
    ["match", match, play],
    ["bucket solution", bucket, still],
    ["match solution", match, still],
  ])("draws a %s card's words as one sentence", (_name, spec, draw) => {
    draw(spec);
    expect(document.querySelectorAll(RUN).length).toBeGreaterThan(0);
    expect(splitHosts()).toEqual([]);
  });
});
