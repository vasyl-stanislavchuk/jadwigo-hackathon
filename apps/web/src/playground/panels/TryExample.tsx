/**
 * One example as a learner meets it: a one-step lesson (tryState.ts) drawn by the family view in
 * play mode. Try it plays it, and the review tab's live cells are the same cell. A commit is looked
 * up in the authored data (question.ts lookUp), never judged; the twin has no scenarios, so its
 * answers are looked up in its key only. A scenario played from its button starts the cell on that
 * scenario's state, its value filled into the view.
 */

import type { Category, Language } from "@jadwigo/copy";
import {
  browserClock,
  type FamilySpec,
  FamilyView,
  pageSpec,
  press,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { type ReactElement, useEffect, useReducer } from "react";
import type { WrittenExample } from "../examples/index.ts";
import { type Found, lookUp } from "./question.ts";
import {
  askHelp,
  canAskHelp,
  commitTry,
  currentOf,
  initialTry,
  moveOn,
  nextVisible,
  playScenario,
  type TryState,
} from "./tryState.ts";

type Action = { type: "commit"; value: unknown } | { type: "help" } | { type: "move_on" };

export function TryExample({
  example,
  spec,
  language,
  category,
  seed,
  played,
  onState,
  onFinished,
}: {
  example: WrittenExample;
  /** The example's question as this page plays it (question.ts specOf). */
  spec: FamilySpec;
  language: Language;
  category: Category;
  /** An answer to start from, as if the child had made it, not yet checked. */
  seed?: unknown;
  /** A scenario played from its button: its value filled in and its state shown at once. */
  played?: { value: unknown; found: Found } | undefined;
  /** Every change of the one-step lesson, for the owner's readout beside it. */
  onState?(state: TryState): void;
  /** Dalej ended the one-step lesson: the holder starts it again or moves on. */
  onFinished?(): void;
}): ReactElement {
  const [state, dispatch] = useReducer(
    (s: TryState, a: Action): TryState => {
      switch (a.type) {
        case "commit": {
          // The twin has no scenarios of its own: only its key is read.
          const found = lookUp(s.onTwin ? null : example, currentOf(spec, s), a.value, language);
          return commitTry(spec, s, a.value, found);
        }
        case "help":
          return askHelp(spec, s);
        case "move_on":
          return moveOn(spec, s);
      }
    },
    played === undefined ? initialTry : playScenario(spec, played.value, played.found),
  );
  useEffect(() => onState?.(state), [state, onState]);

  const current = currentOf(spec, state);
  const shown = played === undefined ? seed : played.value;
  const live = state.phase === "live";
  const clock = browserClock;
  return (
    <FamilyView
      // The twin is a new item: the view starts fresh, with nothing typed or placed.
      key={current.id}
      mode={ViewMode.Play}
      spec={pageSpec(current) as never}
      language={language}
      category={category}
      clock={clock}
      live={live}
      attemptNo={state.attemptNo}
      feedback={state.feedback}
      workedSolution={state.workedSolution}
      solution={(state.phase === "solution" ? state.solution : null) as never}
      solutionLines={state.phase === "solution" ? state.solutionLines : null}
      {...(shown !== undefined && !state.onTwin ? { initialValue: shown as never } : {})}
      onCommit={(c) => dispatch({ type: "commit", value: c.value })}
      around={{
        checking: false,
        moveOn: {
          enabled: live,
          press: press(clock, () => {
            if (live) dispatch({ type: "move_on" });
          }),
        },
        ladder:
          spec.help === undefined
            ? null
            : {
                help: state.help,
                ask:
                  canAskHelp(spec, state) && live
                    ? { enabled: true, press: press(clock, () => dispatch({ type: "help" })) }
                    : null,
                refused: state.helpRefused,
              },
        next: nextVisible(state) ? { press: press(clock, () => onFinished?.()) } : null,
      }}
    />
  );
}
