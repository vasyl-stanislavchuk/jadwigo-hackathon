/**
 * A Place step's stem shows on every surface that carries one (dl-w3.61): the clock, the coins,
 * the fraction, the graph, the number line (dl-w3.70.2), the grid (dl-w3.70.15) and the picture
 * (dl-w3.70.20) draw it above the surface in play and in every still, as Bars always did.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { solutionOf } from "../answer.ts";
import { Family, QuestionType, Surface } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import type { PlaceValue } from "./model.ts";
import { PlaceView } from "./PlaceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };
const TEXT = "Popatrz na obrazek nad zadaniem.";

/** One invented question per surface. */
const PLACES: Pick<SpecOf<typeof Family.Place>, "question_type" | "data" | "key">[] = [
  {
    question_type: QuestionType.ClockSet,
    data: { surface: Surface.Clock, target_label: "7:30", minute_step: 5, hands: "geared" },
    key: { surface: Surface.Clock, h: 7, m: 30 },
  },
  {
    question_type: QuestionType.MoneyPay,
    data: {
      surface: Surface.Coins,
      bank: ["zl2", "zl1", "gr50"],
      amount_label: "3 zł 50 gr",
      slots: 6,
    },
    key: { surface: Surface.Coins, amount_gr: 350 },
  },
  {
    question_type: QuestionType.FractionShade,
    data: { surface: Surface.Fraction, shape: "bar", parts: 4, label: "$\\frac{3}{4}$" },
    key: { surface: Surface.Fraction, count: 3 },
  },
  {
    question_type: QuestionType.DrawGraph,
    data: {
      surface: Surface.Bars,
      kind: "bar",
      categories: [
        { id: "a", label: "jabłka" },
        { id: "b", label: "gruszki" },
      ],
      max: 10,
      step: 1,
    },
    key: { surface: Surface.Bars, heights: { a: 6, b: 4 } },
  },
  {
    question_type: QuestionType.NumberLinePlace,
    data: { surface: Surface.NumberLine, min: 0, max: 10, step: 1, labelled: [0, 10] },
    key: { surface: Surface.NumberLine, value: 3, tolerance: 0 },
  },
  {
    question_type: QuestionType.SpatialBuild,
    data: { surface: Surface.Grid, size: 10, label: "3 × 4" },
    key: { surface: Surface.Grid, rows: 3, cols: 4, either_order: true },
  },
  {
    question_type: QuestionType.Hotspot,
    data: { surface: Surface.Image, image: "/media/shape.png", image_alt: "Kształt", taps: 1 },
    key: {
      surface: Surface.Image,
      targets: [
        {
          id: "t1",
          polygon: [
            { x: 0, y: 0 },
            { x: 0.5, y: 0 },
            { x: 0.5, y: 0.5 },
          ],
        },
      ],
      require_all: true,
    },
  },
];

describe("the stem of a Place step", () => {
  for (const place of PLACES) {
    it(`${place.question_type} draws it in play and in review`, () => {
      const spec = { id: "p1", say: "Zrób to.", family: Family.Place, ...place } as SpecOf<
        typeof Family.Place
      >;
      const withStem = { ...spec, data: { ...spec.data, stem: { text: TEXT } } } as SpecOf<
        typeof Family.Place
      >;
      const page = pageSpec(withStem) as PageSpecOf<typeof Family.Place>;
      const play = render(
        <StepFrame stepId={spec.id}>
          <PlaceView
            mode={ViewMode.Play}
            spec={page}
            language="pl"
            category="child"
            clock={clock}
            live
            attemptNo={1}
            feedback={null}
            solution={null}
            onCommit={() => {}}
          />
        </StepFrame>,
      );
      expect(play.container.textContent, "play").toContain(TEXT);
      play.unmount();
      const right = solutionOf(withStem) as PlaceValue;
      render(
        <PlaceView
          mode={ViewMode.Review}
          spec={page}
          language="pl"
          category="child"
          clock={clock}
          value={right}
          answerKey={withStem.key}
          verdict={{ correct: true, mistake_class: null, parts: [] }}
        />,
      );
      expect(document.body.textContent, "review").toContain(TEXT);
    });
  }
});
