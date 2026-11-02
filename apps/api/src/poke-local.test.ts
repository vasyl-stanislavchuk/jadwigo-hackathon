import { RunId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { localPoke, type PokeTarget, pokeAll, pokeTarget } from "./poke.ts";

const STEP = { run_id: RunId.parse("run_7qre3atahx8cpak6xbjtz73var"), attempt: 2 };

describe("localPoke (dl-uukj.47.14.1)", () => {
  it("posts the step, its wire id and attempt only, to the step host's socket", async () => {
    const sent: { target: PokeTarget; body: string }[] = [];
    const poke = localPoke("unix:/tmp/jadwigo/runner.sock", async (target, body) => {
      sent.push({ target, body });
    });
    await poke?.(STEP);
    expect(sent).toEqual([
      {
        target: { socketPath: "/tmp/jadwigo/runner.sock", path: "/poke" },
        body: JSON.stringify(STEP),
      },
    ]);
    expect(JSON.parse(sent[0]?.body ?? "")).toEqual(STEP);
  });

  it("takes an http:// URL too", () => {
    expect(pokeTarget("http://127.0.0.1:4999")).toEqual({
      host: "127.0.0.1",
      port: 4999,
      path: "/poke",
    });
  });

  it("refuses a relative socket path and any other scheme, naming the form", () => {
    expect(() => pokeTarget("unix:runner.sock")).toThrow(/absolute path/);
    expect(() => pokeTarget("https://runner.example")).toThrow(/unix:<path>/);
    expect(() => pokeTarget("runner")).toThrow(/unix:<path>/);
  });

  it("pokes nothing when LOCAL_RUNNER_URL names no host", () => {
    expect(localPoke(undefined, async () => undefined)).toBeUndefined();
  });

  it("never fails the route when the step host is down: the step waits in the queue", async () => {
    const poke = localPoke("unix:/tmp/jadwigo/runner.sock", async () => {
      throw new Error("connect ENOENT /tmp/jadwigo/runner.sock");
    });
    await expect(pokeAll(poke, [STEP])).resolves.toBeUndefined();
  });
});
