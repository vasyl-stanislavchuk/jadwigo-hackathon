import type { RunId } from "@jadwigo/contracts/run";
import {
  createVerbs,
  fixtureBank,
  InMemoryRunQueue,
  type MuseClient,
  runStep,
  sweep,
} from "@jadwigo/jadwigo-ai";
import { InMemoryStore } from "@jadwigo/store";
import { expect, it } from "vitest";
import { lessonSuite } from "../testing/mcp-lesson.suite.ts";

const DRAFT = { request: "a short lesson", grade: "1", names: [], topic: "addition" };

lessonSuite(
  "InMemoryStore",
  () => new InMemoryStore(),
  (s) => {
    it("never wakes the runner: a step on the draft's run calls no model, the sweep skips it", async () => {
      const store = s.store();
      const { tool, learner_id, pod } = await s.parent();
      const draft_id = (await tool("lesson_draft", { ...DRAFT, learner_id }))["draft_id"] as RunId;
      const muse: MuseClient = {
        respond: () => Promise.reject(new Error("the runner called a model on an MCP draft")),
      };
      const deps = {
        store,
        muse,
        verbs: createVerbs({ bank: fixtureBank() }),
        queue: new InMemoryRunQueue(() => new Date()),
        now: () => new Date(),
      };
      const run = await store.getRun(pod as never, draft_id);
      expect(await runStep({ run_id: draft_id, attempt: run.attempt }, deps)).toEqual({
        outcome: "turn_complete",
        events: 0,
      });
      expect(await sweep(deps, new Date(Date.now() + 24 * 3600_000))).toEqual({
        idle: [],
        max: [],
      });
      expect(await store.listRunEvents(pod as never, draft_id, 0)).toHaveLength(4);
    });
  },
);
