/**
 * The Jadwigo AI engine (epic dl-z5ja): a parent's chat on the left becomes a lesson on the right.
 * Wave plan: `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`.
 */
export { museSettings } from "./config.ts";
export {
  type MuseClient,
  MuseFailed,
  type MuseInput,
  type MuseRequest,
  type MuseResponse,
  type MuseTool,
} from "./muse/client.ts";
export {
  GuardedMuse,
  InMemoryMuseLedger,
  type LedgerRow,
  laneBudget,
  type MuseLedger,
  MuseRefused,
} from "./muse/guarded.ts";
export { CONTRIBUTOR_MODEL, HttpMuse, type HttpMuseOptions, type LiveText } from "./muse/http.ts";
export { ScriptedMuse, type ScriptedReply } from "./muse/scripted.ts";
export { InMemoryRunQueue } from "./queue/memory.ts";
export { type PgmqClient, type PgmqPool, PgmqRunQueue } from "./queue/pgmq.ts";
export { MAX_READS, type QueuedStep, type RunQueue, STEP_VISIBILITY_S } from "./queue/types.ts";
export {
  type AcceptMessage,
  acceptMessage,
  authorizeRun,
  drain,
  type EngineDeps,
  type EngineWarning,
  type FailedStep,
  type InboxEntry,
  runStep,
  sweep,
} from "./run/run-step.ts";
export {
  type BankPort,
  type CheckFindings,
  createVerbs,
  fixtureBank,
  type VerbDeps,
} from "./verbs/index.ts";
export {
  type Verb,
  type VerbContext,
  type VerbEffect,
  VerbError,
  type Verbs,
} from "./verbs/types.ts";
