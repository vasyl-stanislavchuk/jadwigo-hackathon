import { describe, expect, it } from "vitest";
import { postgresEngineHost } from "./engine.ts";
import { ProbeMuse } from "./probe.ts";

// The pools open no connection until a query, so building the host reaches no network.
const URL = "postgresql://runner@db.invalid:6543/postgres";

describe("the host's engine", () => {
  it("names the contributor tier unless the host is set otherwise", async () => {
    const host = postgresEngineHost(URL, new ProbeMuse(), () => undefined);
    expect(host.engine).toMatchObject({ tier: "contributor" });
    await host.close();
  });

  it("names the tier JADWIGO_MUSE_TIER gave it on every request", async () => {
    const host = postgresEngineHost(URL, new ProbeMuse(), () => undefined, "private");
    expect(host.engine).toMatchObject({ tier: "private" });
    await host.close();
  });
});
