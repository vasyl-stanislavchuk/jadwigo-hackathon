// The lesson verbs (packages/jadwigo-ai) run for the remote MCP (dl-1u6fn.10): the parent's own
// AI writes, the verbs check, and the log is the draft. A draft is one conversation and one run
// that no step is ever sent for: the run is created ended, so the runner never picks it up and no
// model is called. Each verb's changed lesson goes into that run's log as a `lesson_revision`,
// through the conversation's compare-and-set, so the app's workspace at /parent/lessons/<cnv_>
// opens the same lesson, and a parent's message there opens the conversation's next turn on it.
import { randomUUID } from "node:crypto";
import {
  ConversationId,
  ErrorType,
  EventId,
  ID_PREFIXES,
  idOf,
  type PodId,
  RunId,
} from "@jadwigo/contracts";
import { RUN_MAX_MS, type Run, type VerbName } from "@jadwigo/contracts/run";
import {
  type BankPort,
  createVerbs,
  fixtureBank,
  type VerbContext,
  type VerbEffect,
  VerbError,
} from "@jadwigo/jadwigo-ai";
import type { Store } from "@jadwigo/store";
import { fromJsonSchema, type StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { ApiError } from "../../errors.ts";
import type { ToolContext } from "../tool.ts";

type LessonVerb = Extract<
  VerbName,
  "lesson_draft" | "lesson_show" | "lesson_edit" | "lesson_check"
>;
type Json = Record<string, unknown>;

/** The verbs' own descriptions and inputs, the same `jw mcp serve` and the hosted engine show. */
const TOOLS = createVerbs({ bank: fixtureBank() });

/** A verb's description, as tools/list shows it. */
export function verbDescription(name: LessonVerb): string {
  return TOOLS[name].tool.description;
}

/** A verb's input schema, with `extra` properties the MCP tool takes besides the verb's. */
export function verbSchema(
  name: LessonVerb,
  extra: { properties: Json; required: readonly string[] } = { properties: {}, required: [] },
): StandardSchemaWithJSON {
  const own = TOOLS[name].tool.parameters as Json & { properties: Json; required: string[] };
  return fromJsonSchema({
    ...own,
    properties: { ...extra.properties, ...own.properties },
    required: [...extra.required, ...own.required],
  });
}

/** The verb's effect; its refusal reaches the parent's AI as its message, to correct and retry. */
async function callVerb(
  name: LessonVerb,
  bank: BankPort,
  context: VerbContext,
  input: Json,
): Promise<VerbEffect> {
  try {
    return await createVerbs({ bank })[name].run(context, input);
  } catch (error) {
    if (error instanceof VerbError)
      throw new ApiError(ErrorType.enum.BadRequest, `${error.type}: ${error.message}`);
    throw error;
  }
}

/** Logs a verb's lesson as the conversation's next revision, unless another writer moved it. */
async function revise(
  store: Store,
  pod: PodId,
  run: Run,
  expected: number,
  call_id: string,
  lesson_file: Json,
): Promise<number> {
  const written = await store.appendLessonRevision(pod, run.id, run.attempt, expected, {
    type: "lesson_revision",
    run_id: run.id,
    event_id: EventId.parse(randomUUID()),
    payload: { revision: expected + 1, call_id, lesson_file },
  });
  if (!written.ok)
    throw new ApiError(
      ErrorType.enum.AnswerConflict,
      "the lesson changed after you read it (the parent edited it in the app): read it again with lesson_show, then make your change on it",
    );
  return written.revision;
}

/**
 * `lesson_draft`: a new conversation and its one run, created ended with the verb's lesson as
 * revision 1. The verb runs first, so a refusal (no question for the topic) leaves nothing behind.
 */
export async function draftLesson(raw: unknown, context: ToolContext): Promise<Json> {
  const { store, member, bank } = context;
  const { learner_id, ...input } = raw as Json;
  const me = await store.getMe(member.pod, member.account);
  if (!me.learners.some((l) => l.learner.id === learner_id))
    throw new ApiError(ErrorType.enum.NotFound, "no such learner in your family: call me");

  const conversation_id = ConversationId.parse(idOf(ID_PREFIXES.conversation, randomUUID()));
  const run_id = RunId.parse(idOf(ID_PREFIXES.run, randomUUID()));
  const call_id = randomUUID();
  const verbContext = {
    pod: member.pod,
    created_by: member.account,
    run_id,
    call_id,
    lesson: null,
  };
  const effect = await callVerb("lesson_draft", bank, verbContext, input);
  if (effect.lesson_file === undefined) throw new Error("lesson_draft answered no lesson");

  const title = typeof input["topic"] === "string" ? input["topic"] : null;
  await store.createConversation(member.pod, {
    id: conversation_id,
    created_by: member.account,
    title,
  });
  const now = Date.now();
  const run = await store.createRun(member.pod, {
    id: run_id,
    created_by: member.account,
    conversation_id,
    workflow: "jadwigo-lesson-compose",
    resumes: null,
    // No model is called on this run, so it may spend nothing.
    cap_usd: 0,
    idle_deadline_at: null,
    max_deadline_at: new Date(now + RUN_MAX_MS).toISOString(),
  });
  await revise(store, member.pod, run, 0, call_id, effect.lesson_file);
  // Ended as a finished turn ends (status, then turn_complete): no step is sent, the sweep skips an
  // ended run, and the app's next message opens turn 2, which reads this lesson.
  const ended = await store.appendRunEvents(member.pod, run.id, run.attempt, [
    {
      type: "status",
      run_id,
      event_id: EventId.parse(randomUUID()),
      payload: { status: "completed" },
    },
    { type: "turn_complete", run_id, event_id: EventId.parse(randomUUID()), payload: {} },
  ]);
  if (ended.stale) throw new Error("the draft's run moved while it was being made");
  await store.updateRun(member.pod, run.id, run.attempt, {
    status: "completed",
    completed_at: new Date(now).toISOString(),
  });
  return { ...effect.output, open_url: context.appUrl(`/parent/lessons/${conversation_id}`) };
}

/** `lesson_show`, `lesson_edit`, `lesson_check`: the verb on the draft's lesson as it stands now. */
export async function onDraft(name: LessonVerb, raw: unknown, context: ToolContext): Promise<Json> {
  const { store, member, bank } = context;
  const input = raw as Json;
  const run = await draftRun(store, member.pod, input["draft_id"]);
  const lesson = await latestLesson(store, member.pod, run);
  const call_id = randomUUID();
  const effect = await callVerb(
    name,
    bank,
    { pod: member.pod, created_by: run.created_by, run_id: run.id, call_id, lesson },
    input,
  );
  if (effect.lesson_file !== undefined)
    await revise(store, member.pod, run, lesson?.revision ?? 0, call_id, effect.lesson_file);
  return effect.output;
}

/** The run a draft_id names, in the caller's pod: another pod's, or a malformed id, is NotFound. */
async function draftRun(store: Store, pod: PodId, draft_id: unknown): Promise<Run> {
  const id = RunId.safeParse(draft_id);
  if (!id.success) throw new ApiError(ErrorType.enum.NotFound, "no such draft");
  const run = await store.getRun(pod, id.data);
  if (run.conversation_id === null) throw new ApiError(ErrorType.enum.NotFound, "no such draft");
  return run;
}

/** The conversation's latest lesson, whichever turn wrote it: the MCP's or the app's. */
async function latestLesson(store: Store, pod: PodId, run: Run): Promise<VerbContext["lesson"]> {
  if (run.conversation_id === null) return null;
  let latest: VerbContext["lesson"] = null;
  for (const turn of await store.listRuns(pod, run.conversation_id)) {
    for (const event of await store.listRunEvents(pod, turn.id, 0)) {
      if (event.type !== "lesson_revision") continue;
      if (latest === null || event.payload.revision > latest.revision)
        latest = {
          revision: event.payload.revision,
          lesson_file: event.payload.lesson_file as Json,
        };
    }
  }
  return latest;
}
