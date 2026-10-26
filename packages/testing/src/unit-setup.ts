// The setup every unit test runs under (vitest.config.ts, project "unit"). A unit test that
// reaches the network, real AWS or the wall clock fails here, so it cannot pass by luck.
// Tests that need any of these are integration tests: name them *.int.test.ts.
import net from "node:net";
import { afterEach, beforeEach, vi } from "vitest";
import { FIXED_NOW } from "./index.ts";

const refuse = (what: string) => () => {
  throw new Error(
    `unit tests may not use the network (${what}). Use a double, or move the test to *.int.test.ts.`,
  );
};

globalThis.fetch = refuse("fetch") as typeof fetch;
net.Socket.prototype.connect = refuse("a socket connect") as typeof net.Socket.prototype.connect;

// No real AWS: drop any credentials the shell carries and point every SDK client at a host that
// cannot resolve. The network refusal above stops the call before it leaves the process.
for (const key of [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "AWS_PROFILE",
]) {
  delete process.env[key];
}
process.env["AWS_ENDPOINT_URL"] = "http://aws.invalid";
process.env["AWS_REGION"] = "eu-central-1";

beforeEach(() => {
  vi.useFakeTimers({ now: FIXED_NOW, toFake: ["Date"] });
});

afterEach(() => {
  const pinned = vi.isFakeTimers();
  vi.useRealTimers();
  if (!pinned) {
    throw new Error(
      "this unit test unpinned the clock (vi.useRealTimers). Unit tests run on FIXED_NOW.",
    );
  }
});
