import { RunId } from "@jadwigo/contracts/run";
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

  it("logs a tier downgrade with its ids only (dl-z5ja.103)", async () => {
    const lines: string[] = [];
    const host = postgresEngineHost(URL, new ProbeMuse(), (line) => lines.push(line), "private");
    host.engine.onWarning?.({
      kind: "tier_downgraded",
      run_id: RunId.parse("run_0000000000000000000000000a"),
      call_no: 2,
      requested: "private",
      answered: "contributor",
    });
    expect(lines).toEqual([
      "tier_downgraded: run run_0000000000000000000000000a call 2 asked for private, went to contributor",
    ]);
    await host.close();
  });

  it("names the tier JADWIGO_MUSE_TIER gave it on every request", async () => {
    const host = postgresEngineHost(URL, new ProbeMuse(), () => undefined, "private");
    expect(host.engine).toMatchObject({ tier: "private" });
    await host.close();
  });
});
