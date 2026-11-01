// The conversation routes on InMemoryStore, with a queue that keeps what was sent.
import type { RunStepInput } from "@jadwigo/contracts";
import { InMemoryRunQueue } from "@jadwigo/jadwigo-ai";
import { InMemoryStore } from "@jadwigo/store";
import { conversationSuite } from "./testing/conversations.suite.ts";

conversationSuite(
  "InMemoryStore",
  () => new InMemoryStore(),
  () => {
    const queue = new InMemoryRunQueue(() => new Date());
    const sent: RunStepInput[] = [];
    return {
      queue: {
        send: (message, delay_s) => {
          sent.push(message);
          return queue.send(message, delay_s);
        },
        read: (vt_s, qty) => queue.read(vt_s, qty),
        archive: (msg_id) => queue.archive(msg_id),
        deadLetters: () => queue.deadLetters(),
      },
      stepsFor: async (run) => sent.filter((m) => m.run_id === run).length,
    };
  },
);
