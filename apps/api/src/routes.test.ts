import { InMemoryStore } from "@jadwigo/store";
import { routeSuite } from "./testing/routes.suite.ts";

routeSuite("InMemoryStore", () => new InMemoryStore());
