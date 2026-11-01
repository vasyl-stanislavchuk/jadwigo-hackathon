// acceptMessage on PostgresStore (dl-z5ja.85): 2 first messages racing on a new conversation, each
// in a unit of its own, open one run, because a turn's run id is named by the conversation and the
// turn's number and the store writes a run once.
import { EventId, ID_PREFIXES, idOf, Uuid } from "@jadwigo/contracts";
import { ConversationId } from "@jadwigo/contracts/run";
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, expect, it } from "vitest";
import { databaseUrl } from "../config.ts";
import { ScriptedMuse } from "../muse/scripted.ts";
import { InMemoryRunQueue } from "../queue/memory.ts";
import { STEP_VISIBILITY_S } from "../queue/types.ts";
import { createVerbs, fixtureBank } from "../verbs/index.ts";
import { acceptMessage, type EngineDeps } from "./run-step.ts";

const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

it("2 first messages racing on a new conversation open 1 run with 2 inbox rows", async () => {
  const now = () => new Date();
  const queue = new InMemoryRunQueue(now);
  const deps: EngineDeps = {
    store,
    muse: new ScriptedMuse([]),
    verbs: createVerbs({ bank: fixtureBank() }),
    queue,
    now,
  };
  const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const conversation = await store.createConversation(member.pod, {
    id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
    created_by: member.account,
    title: null,
  });
  const say = (text: string) =>
    acceptMessage(deps, {
      pod: member.pod,
      created_by: member.account,
      conversation_id: conversation.id,
      entry: { event_id: EventId.parse(crypto.randomUUID()), kind: "message", payload: { text } },
    });

  const [a, b] = await Promise.all([say("Halves."), say("And quarters.")]);

  const runs = await store.listRuns(member.pod, conversation.id);
  expect(runs.map((r) => r.id)).toEqual([a.run.id]);
  expect(b.run.id).toBe(a.run.id);
  const inbox = await store.takeRunInbox(member.pod, a.run.id);
  expect(inbox.map((r) => r.kind)).toEqual(["message", "message"]);
  expect(
    (await queue.read(STEP_VISIBILITY_S, 10)).every((s) => s.message.run_id === a.run.id),
  ).toBe(true);
});
