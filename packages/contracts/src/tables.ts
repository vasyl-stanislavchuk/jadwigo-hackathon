import { z } from "zod";
import { PodId } from "./ids.ts";
import { LESSON_RECORDS } from "./records.ts";
import {
  Conversation,
  MessageEvent,
  Run,
  RunEvent,
  type RunEventType,
  RunInbox,
  RunInboxKind,
  RunRating,
} from "./run.ts";

/** A row's JSON column: the event's or the inbox row's payload, shaped by its `type` or `kind`. */
const Payload = z.record(z.string(), z.unknown());

const RUN_EVENT_TYPES = RunEvent.options.map((o) => o.shape.type.value) as [
  RunEventType,
  ...RunEventType[],
];

/**
 * Every record, by its table name, for the naming test and the store's generated types. A run
 * event and a run inbox row are unions on the wire; their tables hold one row shape, the payload
 * as JSON, and a run event's row also carries its pod (RULES.md rule 12), which the wire leaves out.
 */
export const RECORDS = {
  ...LESSON_RECORDS,
  conversation: Conversation,
  run: Run,
  run_event: MessageEvent.extend({
    pod_id: PodId,
    type: z.enum(RUN_EVENT_TYPES),
    payload: Payload,
  }),
  run_inbox: RunInbox.options[0].extend({ kind: RunInboxKind, payload: Payload }),
  run_rating: RunRating,
} as const;
