import { EventId, ID_PREFIXES, idOf, Uuid } from "@jadwigo/contracts";
import { ConversationId } from "@jadwigo/contracts/run";
import {
  acceptMessage,
  createVerbs,
  type EngineDeps,
  fixtureBank,
  InMemoryRunQueue,
  ScriptedMuse,
} from "@jadwigo/jadwigo-ai";
import { InMemoryStore } from "@jadwigo/store";
import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { createHost, type HostDeps, type Meter, STUCK_AFTER_S, type Stuck } from "./host.ts";
import { PROBE_SCRIPT, ProbeMuse, turnOf } from "./probe.ts";

/** A meter that moves only when the test says, so wall and CPU are exact. */
function fakeMeter(): Meter & { spend(wall: number, cpu: number): void } {
  let wall = 0;
  let cpu = 0;
  return {
    wall: () => wall,
    cpu: () => cpu,
    spend: (w, c) => {
      wall += w;
      cpu += c;
    },
  };
}

async function setup(muse: EngineDeps["muse"] = new ProbeMuse()) {
  const now = () => FIXED_NOW;
  const store = new InMemoryStore({ now });
  const queue = new InMemoryRunQueue(now);
  const engine: EngineDeps = {
    store,
    muse,
    verbs: createVerbs({ bank: fixtureBank() }),
    queue,
    now,
  };
  const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const say = async (text: string) => {
    const conversation = await store.createConversation(member.pod, {
      id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
      created_by: member.account,
      title: null,
    });
    const { run } = await acceptMessage(engine, {
      pod: member.pod,
      created_by: member.account,
      conversation_id: conversation.id,
      entry: { event_id: EventId.parse(crypto.randomUUID()), kind: "message", payload: { text } },
    });
    return run.id;
  };
  const warnings: string[] = [];
  const deps = (more: Partial<HostDeps> = {}): HostDeps => ({
    engine,
    max_steps: 20,
    warn: (line) => warnings.push(line),
    ...more,
  });
  return { store, queue, member, say, deps, warnings };
}

describe("the step host", () => {
  it("drains a turn's steps through runStep with the scripted model, and logs it ended clean", async () => {
    const t = await setup();
    const run = await t.say("A made-up lesson: adding within 20, grade 1.");
    const host = createHost(() => Promise.resolve(t.deps()), fakeMeter());

    const report = await host();

    expect(report.outcomes).toEqual(["continue", "turn_complete"]);
    expect(report.steps).toBe(2);
    const events = await t.store.listRunEvents(t.member.pod, run, 0);
    expect(report.events).toBe(events.length); // the parent's message too: the step logs the inbox
    expect(turnOf(events).ok).toBe(true);
    expect(events.map((e) => e.type)).toContain("lesson_revision");
    expect(await t.queue.read(60, 10)).toEqual([]);
  });

  it("is cold once per process: the open runs once, and a warm invoke reuses it", async () => {
    const t = await setup();
    let opened = 0;
    const host = createHost(() => {
      opened += 1;
      return Promise.resolve(t.deps());
    }, fakeMeter());

    await t.say("first");
    const cold = await host();
    await t.say("second");
    const warm = await host();

    expect([cold.cold, warm.cold]).toEqual([true, false]);
    expect(opened).toBe(1);
    expect(warm.outcomes).toEqual(["continue", "turn_complete"]);
  });

  it("answers wall clock and CPU from its meter, the open included", async () => {
    const t = await setup();
    const meter = fakeMeter();
    const host = createHost(async () => {
      meter.spend(40, 10);
      return t.deps();
    }, meter);

    const report = await host();

    expect(report.wall_ms).toBe(40);
    expect(report.cpu_ms).toBe(10);
  });

  it("answers null CPU where the runtime has none", async () => {
    const t = await setup();
    const host = createHost(() => Promise.resolve(t.deps()), { wall: () => 0, cpu: () => null });

    expect((await host()).cpu_ms).toBeNull();
  });

  it("tries a failed open again on the next invoke", async () => {
    const t = await setup();
    let tries = 0;
    const host = createHost(() => {
      tries += 1;
      return tries === 1 ? Promise.reject(new Error("no database")) : Promise.resolve(t.deps());
    }, fakeMeter());

    await expect(host()).rejects.toThrow("no database");
    await expect(host()).resolves.toMatchObject({ steps: 0 });
    expect(tries).toBe(2);
  });

  it("stops at max_steps and leaves the rest queued for the next invoke", async () => {
    const t = await setup();
    await t.say("one");
    const host = createHost(() => Promise.resolve(t.deps({ max_steps: 1 })), fakeMeter());

    expect((await host()).outcomes).toEqual(["continue"]);
    expect((await host()).outcomes).toEqual(["turn_complete"]);
  });

  it("logs a step that threw by its ids, keeps it queued, and reports the dead letters", async () => {
    const t = await setup({
      respond: () => Promise.reject(new Error("the model is down\nand a second line")),
    });
    const run = await t.say("a turn the model never answers");
    const report = await createHost(
      () => Promise.resolve(t.deps({ dead_letters: () => Promise.resolve(2) })),
      fakeMeter(),
    )();

    expect(report.steps).toBe(0);
    expect(report.failed).toMatchObject([{ run_id: run, attempt: 1, read_ct: 1 }]);
    expect(report.dead_letters).toBe(2);
    expect(t.warnings).toEqual([
      `agent_step: step for ${run} attempt 1 (msg ${report.failed[0]?.msg_id}, read 1) threw Error`,
      "agent_step_dlq: 2 steps dead-lettered",
    ]);
  });

  it("logs a stuck queue by ids only, and stays quiet when it is not", async () => {
    const t = await setup();
    const quiet: Stuck = { oldest_ready_step_age_s: STUCK_AFTER_S - 1, runs_past_deadline: [] };
    const stuck: Stuck = {
      oldest_ready_step_age_s: STUCK_AFTER_S + 30,
      runs_past_deadline: [{ pod: "pod_x", run_id: "run_y" }],
    };
    let answer = quiet;
    const host = createHost(
      () => Promise.resolve(t.deps({ stuck: () => Promise.resolve(answer) })),
      fakeMeter(),
    );

    expect((await host()).stuck).toEqual(quiet);
    expect(t.warnings).toEqual([]);
    answer = stuck;
    await host();
    expect(t.warnings).toEqual([
      "agent_step: the oldest ready step has waited 90 s",
      "agent_step: 1 runs past their deadline: run_y",
    ]);
  });

  it("runs the probe's script by call number, so any process answers the same", async () => {
    const t = await setup(new ScriptedMuse(PROBE_SCRIPT));
    const run = await t.say("scripted in order");
    const report = await createHost(() => Promise.resolve(t.deps()), fakeMeter())();
    const probed = await setup();
    const again = await probed.say("scripted by call_no");
    await createHost(() => Promise.resolve(probed.deps()), fakeMeter())();

    const types = async (s: InMemoryStore, pod: typeof t.member.pod, id: typeof run) =>
      (await s.listRunEvents(pod, id, 0)).map((e) => e.type);
    expect(report.steps).toBe(2);
    expect(await types(probed.store, probed.member.pod, again)).toEqual(
      await types(t.store, t.member.pod, run),
    );
  });
});
