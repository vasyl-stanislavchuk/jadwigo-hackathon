import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RunId } from "@jadwigo/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpPost, localPoke, pokeAll } from "./poke.ts";

const STEP = { run_id: RunId.parse("run_7qre3atahx8cpak6xbjtz73var"), attempt: 1 };

let server: Server | undefined;
let dir: string | undefined;
afterEach(async () => {
  await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
  if (dir) rmSync(dir, { recursive: true, force: true });
});

/**
 * A step host stand-in on a unix socket, answering `status` and keeping what it was posted; with
 * "never" it takes the request and never answers, as a paused runner would.
 */
async function host(
  status: number | "never",
): Promise<{ url: string; got: { path: string; body: string }[] }> {
  dir = mkdtempSync(join(tmpdir(), "jw-poke-"));
  const socket = join(dir, "runner.sock");
  const got: { path: string; body: string }[] = [];
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    got.push({ path: req.url ?? "", body: Buffer.concat(chunks).toString("utf8") });
    if (status !== "never") res.writeHead(status).end();
  });
  await new Promise<void>((done) => server?.listen(socket, done));
  return { url: `unix:${socket}`, got };
}

describe("localPoke over a real socket (dl-uukj.47.14.1)", () => {
  it("POSTs the step to /poke on the step host's socket", async () => {
    const { url, got } = await host(202);
    await localPoke(url)?.(STEP);
    expect(got).toEqual([{ path: "/poke", body: JSON.stringify(STEP) }]);
  });

  it("rejects on an answer that is not 2xx, which pokeAll logs and swallows", async () => {
    const { url } = await host(500);
    await expect(localPoke(url)?.(STEP)).rejects.toThrow(/answered 500/);
  });

  it("gives up on a step host that takes the poke and never answers, so the route replies", async () => {
    const { url, got } = await host("never");
    const started = performance.now();
    await expect(localPoke(url, httpPost(200))?.(STEP)).rejects.toThrow(/did not answer in 200 ms/);
    // pokeAll, as the route awaits it after the commit: it logs the failure and returns.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await pokeAll(localPoke(url, httpPost(200)), [STEP]);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(error).toHaveBeenCalledTimes(1);
    expect(got).toHaveLength(2);
    error.mockRestore();
  });
});
