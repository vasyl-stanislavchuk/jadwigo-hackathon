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
import { acceptMessage, drain, type EngineDeps } from "./run-step.ts";

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

it("20 races of 3 first messages each open 1 run apiece, never a key conflict", async () => {
  // dl-z5ja.98: run has 2 unique keys, id and (pod_id, id), and a racing insert could trip the one
  // createRun's conflict target did not name. 3 racers per conversation make it show within 20.
  const now = () => new Date();
  const deps: EngineDeps = {
    store,
    muse: new ScriptedMuse([]),
    verbs: createVerbs({ bank: fixtureBank() }),
    queue: new InMemoryRunQueue(now),
    now,
  };
  for (let race = 0; race < 20; race++) {
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
    const accepted = await Promise.all([say("Halves."), say("Quarters."), say("Thirds.")]);
    const runs = await store.listRuns(member.pod, conversation.id);
    expect(runs).toHaveLength(1);
    expect(new Set(accepted.map((a) => a.run.id))).toEqual(new Set([runs[0]?.id]));
    expect(await store.takeRunInbox(member.pod, accepted[0].run.id)).toHaveLength(3);
  }
});

it("a draft and a parent's patch land through the conversation's compare-and-set (dl-z5ja.76)", async () => {
  // Lead decision 48 on Postgres: both revisions go through appendLessonRevision, numbered 1 and 2
  // across the conversation, and a patch on a revision that is no longer the latest is refused.
  const now = () => new Date();
  const deps: EngineDeps = {
    store,
    muse: new ScriptedMuse([
      {
        tool_calls: [
          {
            verb: "lesson_draft",
            input: { request: "a short lesson", grade: "1", names: [], topic: "addition" },
          },
        ],
      },
      { text: "Gotowe." },
    ]),
    verbs: createVerbs({ bank: fixtureBank() }),
    queue: new InMemoryRunQueue(now),
    now,
  };
  const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const conversation = await store.createConversation(member.pod, {
    id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
    created_by: member.account,
    title: null,
  });
  const send = (entry: Parameters<typeof acceptMessage>[1]["entry"]) =>
    acceptMessage(deps, {
      pod: member.pod,
      created_by: member.account,
      conversation_id: conversation.id,
      entry,
    });
  const patch = (title: string, base_revision: number) =>
    send({
      event_id: EventId.parse(crypto.randomUUID()),
      kind: "steer",
      payload: { text: "Mój tytuł.", source: "lesson_edit", patch: { title }, base_revision },
    });

  const { run } = await send({
    event_id: EventId.parse(crypto.randomUUID()),
    kind: "message",
    payload: { text: "Dodawanie do 20." },
  });
  await drain(deps);
  await patch("Moja lekcja", 1);
  await patch("Za późno", 1);
  await drain(deps);

  const revisions = (await store.listRunEvents(member.pod, run.id, 0)).filter(
    (e) => e.type === "lesson_revision",
  );
  expect(revisions.map((e) => e.payload.revision)).toEqual([1, 2]);
  expect(revisions[1]?.payload.lesson_file).toMatchObject({ title: "Moja lekcja" });
});
