import type { AccountId, PodId } from "@jadwigo/contracts";
import type { RunId, ToolView, VerbName } from "@jadwigo/contracts/run";
import type { MuseTool } from "../muse/client.ts";

/**
 * The lesson verbs as function tools (Lead decisions 7 and 11). The runner (dl-z5ja.16) calls them
 * only through these types; the verbs lane (dl-z5ja.15) writes them, with a parity test against
 * `apps/cli/mcp-tools.json` so `jw mcp serve` and the hosted engine expose one tool set.
 */

/**
 * Who a verb acts for, built by the runner from the run row (`authorizeRun`). No verb takes a pod,
 * a learner or an owner from the model's arguments.
 */
export interface VerbContext {
  pod: PodId;
  created_by: AccountId;
  run_id: RunId;
  /** Muse's id for this call: a verb is idempotent by it, so a rerun writes nothing new. */
  call_id: string;
  /**
   * The run's lesson so far, the highest `lesson_revision` in its log, or null before the first.
   * The log is the draft: a verb reads the lesson from here and never keeps its own copy, and a
   * `draft_id` the model passes is the run's id.
   */
  lesson: { revision: number; lesson_file: Record<string, unknown> } | null;
}

/** What a verb did. A verb that changed the lesson answers the whole file, never a patch (Lead decision 4). */
export interface VerbEffect {
  output: Record<string, unknown>;
  lesson_file?: Record<string, unknown>;
  /**
   * The result typed for its widget, for the tool result's `view`. lesson_check sets
   * `{ kind: "lesson_check", data: { publishable, findings } }`: check()'s findings and the
   * harsh-word ones (`dl-z5ja.31`). The other verbs' views are `dl-z5ja.69`.
   */
  view?: ToolView;
}

export interface Verb {
  name: VerbName;
  tool: MuseTool;
  /** Throws a `VerbError` for input it refuses; the runner writes it as the tool's error. */
  run(context: VerbContext, input: Record<string, unknown>): Promise<VerbEffect>;
}

export type Verbs = Readonly<Record<VerbName, Verb>>;

/** A verb's refusal, which the model reads and may correct: bad input, a step that isn't there. */
export class VerbError extends Error {
  constructor(
    readonly type: string,
    message: string,
  ) {
    super(message);
    this.name = "VerbError";
  }
}
