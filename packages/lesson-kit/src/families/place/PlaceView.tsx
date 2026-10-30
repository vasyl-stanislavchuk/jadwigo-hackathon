/**
 * The Place view (dl-w3.37.14): one dispatcher over the surfaces in place/surfaces/ (dl-w3.61.1),
 * each a play view and a still view in a file of its own.
 * - Line.tsx, a number line: tap or drag to place the marker, arrow keys to step it; it snaps to
 *   the line's finest position (a tick, or a finer `snap`), which may be a fraction (dl-w3.55).
 * - Image.tsx, a picture: each tap sets a marker, as fractions of the picture (up to the step's
 *   taps); tapping a marker lifts it.
 * - Grid.tsx, a grid of dots: tap a dot to build the rectangle from the corner to it.
 * - Bars.tsx, a graph (dl-w3.51.3): one bar per category, set by a tap or a drag on its column or
 *   by the arrow keys on the focused bar; the data to draw sits in the stem. A bar rung 2 gave
 *   away is drawn settled and locked, and goes into every commit.
 * - Coins.tsx (dl-w3.61.6): a bank of coins and notes, tap one to put it in the tray, tap a tray
 *   coin to take it back.
 * - Fraction.tsx, a shape cut into equal parts (dl-w3.61.7): tap or Space shades a part.
 * Check commits. After a miss the marker, the taps, the rectangle or the bars stay where they were:
 * the line and the grid are red as a whole until the next move, each tap on a picture and each
 * bar on a graph is marked (the marks rule). Keyboard: the line and every bar take arrow keys and
 * the grid is buttons; a picture by keyboard is on the family's roadmap (docs/18).
 *
 * A new surface is a new file in surfaces/ and one line in each switch below, in its lane's slot.
 */

import type { Language } from "../../stage/types.ts";
import { type Family, Surface } from "../names.ts";
import { Stem } from "../Stem.tsx";
import { answers, type PlayProps, ViewMode, type ViewProps } from "../view.ts";
import type { PlaceData, PlaceValue, Point } from "./model.ts";
import { BarsPlay, BarsStill } from "./surfaces/Bars.tsx";
import { ClockPlay, ClockStill } from "./surfaces/Clock.tsx";
import { CoinsPlay, CoinsStill } from "./surfaces/Coins.tsx";
import { FractionPlay, FractionStill } from "./surfaces/Fraction.tsx";
import { GridLabel, GridPlay, GridStill } from "./surfaces/Grid.tsx";
import { ImagePlay, ImageStill } from "./surfaces/Image.tsx";
import { LinePlay, LineStill } from "./surfaces/Line.tsx";

type F = typeof Family.Place;

function PlacePlay(props: PlayProps<F>): JSX.Element {
  const data = props.spec.data;
  switch (data.surface) {
    case Surface.NumberLine:
      return <LinePlay {...props} data={data} />;
    case Surface.Image:
      return <ImagePlay {...props} data={data} />;
    case Surface.Grid:
      return <GridPlay {...props} data={data} />;
    case Surface.Bars:
      return <BarsPlay {...props} data={data} />;
    // lane D (dl-w3.61.5): ClockPlay from ./surfaces/Clock
    case Surface.Clock:
      return <ClockPlay {...props} data={data} />;
    // lane E (dl-w3.61.6)
    case Surface.Coins:
      return <CoinsPlay {...props} data={data} />;
    case Surface.Fraction:
      return <FractionPlay {...props} data={data} />;
  }
}

function Still({
  data,
  language,
  shown,
  right,
  rightKeyRegions,
}: {
  data: PlaceData;
  language: Language;
  shown: PlaceValue | null;
  right: PlaceValue | null;
  rightKeyRegions: Point[][];
}): JSX.Element | null {
  switch (data.surface) {
    case Surface.NumberLine:
      return <LineStill data={data} language={language} shown={shown} right={right} />;
    case Surface.Image:
      return (
        <ImageStill
          data={data}
          language={language}
          shown={shown}
          right={right}
          rightKeyRegions={rightKeyRegions}
        />
      );
    case Surface.Grid:
      return <GridStill data={data} language={language} shown={shown} right={right} />;
    case Surface.Bars:
      return <BarsStill data={data} language={language} shown={shown} right={right} />;
    // lane D (dl-w3.61.5): ClockStill from ./surfaces/Clock
    case Surface.Clock:
      return <ClockStill data={data} language={language} shown={shown} right={right} />;
    // lane E (dl-w3.61.6)
    case Surface.Coins:
      return <CoinsStill data={data} language={language} shown={shown} right={right} />;
    case Surface.Fraction:
      return <FractionStill data={data} language={language} shown={shown} right={right} />;
  }
}

export function PlaceView(props: ViewProps<F>): JSX.Element {
  if (props.mode === ViewMode.Play) return <PlacePlay {...props} />;
  const { shown, right } = answers(props);
  const regions =
    (props.mode === ViewMode.Review || (props.mode === ViewMode.Preview && props.showKey)) &&
    props.answerKey?.surface === Surface.Image
      ? props.answerKey.targets.map((r) => r.polygon)
      : [];
  const data = props.spec.data;
  return (
    <div className="kid-family-place flex flex-col gap-6">
      <Stem
        say={props.spec.say}
        stem={"stem" in data ? data.stem : undefined}
        language={props.language}
        paper={props.mode === ViewMode.Print}
      />
      {data.surface === Surface.Grid && <GridLabel data={data} />}
      <Still
        data={data}
        language={props.language}
        shown={shown}
        right={right}
        rightKeyRegions={regions}
      />
    </div>
  );
}
