// A message's page context through the message route on InMemoryStore (dl-z5ja.114).
import { InMemoryRunQueue } from "@jadwigo/jadwigo-ai";
import { InMemoryStore } from "@jadwigo/store";
import { contextSuite } from "./testing/context.suite.ts";

contextSuite(
  "InMemoryStore",
  () => new InMemoryStore(),
  () => {
    const queue = new InMemoryRunQueue(() => new Date());
    return { queue, stepsFor: async () => 0 };
  },
);
