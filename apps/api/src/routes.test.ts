import { InMemoryStore } from "@jadwigo/store";
import { peopleSuite } from "./testing/people.suite.ts";
import { routeSuite } from "./testing/routes.suite.ts";

routeSuite("InMemoryStore", () => new InMemoryStore());
peopleSuite("InMemoryStore", () => new InMemoryStore());
