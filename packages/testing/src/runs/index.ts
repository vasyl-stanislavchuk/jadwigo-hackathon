import budgetSteerThenStop from "./budget-steer-then-stop.json" with { type: "json" };
import cancelDuringAVerb from "./cancel-during-a-verb.json" with { type: "json" };
import followUpMidTurn from "./follow-up-mid-turn.json" with { type: "json" };
import happyTurn from "./happy-turn.json" with { type: "json" };
import idleVsMaxDeadline from "./idle-vs-max-deadline.json" with { type: "json" };
import lateEventAfterTurnComplete from "./late-event-after-turn-complete.json" with {
  type: "json",
};
import planAndCite from "./plan-and-cite.json" with { type: "json" };
import redeliveredStep from "./redelivered-step.json" with { type: "json" };
import reloadWithDuplicates from "./reload-with-duplicates.json" with { type: "json" };
import staleAttempt from "./stale-attempt.json" with { type: "json" };
import steerKept from "./steer-kept.json" with { type: "json" };

/**
 * The engine's golden run logs (dl-z5ja.12, wave plan `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`
 * Lead decision 13): one per PostHog production failure, and `plan-and-cite` for the UX seams
 * (dl-z5ja.50), `steer-kept` for the logged steer (dl-z5ja.51), each the log a run leaves and the view
 * `foldRun` must draw from it. Frozen for the wave's lanes: a disagreement is a message to the
 * lead. JSON, so the `dom` project's component tests import them too. Plain data: a consumer
 * parses `events` with `RunEvent` from `@jadwigo/contracts/run`. Every id is made up and no text
 * names a person.
 */
export interface RunLog {
  name: string;
  about: string;
  /** As delivered: `reload-with-duplicates` holds duplicates, out of `seq` order. */
  events: readonly unknown[];
  /** The `RunView` `foldRun(events)` returns. */
  expected: unknown;
  /** `idle-vs-max-deadline` only: `deadlineDue(run, new Date(now))` must be `due`. */
  deadlines?: readonly {
    about: string;
    run: { status: string; idle_deadline_at: string | null; max_deadline_at: string };
    now: string;
    due: "idle" | "max" | null;
  }[];
}

export const RUN_LOGS: readonly RunLog[] = [
  happyTurn,
  followUpMidTurn,
  reloadWithDuplicates,
  cancelDuringAVerb,
  budgetSteerThenStop,
  redeliveredStep,
  staleAttempt,
  lateEventAfterTurnComplete,
  idleVsMaxDeadline,
  planAndCite,
  steerKept,
] as readonly RunLog[];
