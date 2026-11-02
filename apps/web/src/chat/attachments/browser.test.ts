import { describe, expect, it } from "vitest";
import { browserDeps } from "./browser.ts";
import { FakeApi } from "./fakes.test-helpers.ts";

describe("browserDeps", () => {
  it("passes the api through and makes a fresh event id each time", () => {
    const api = new FakeApi();
    const deps = browserDeps(api);
    expect(deps.api).toBe(api);
    const a = deps.eventId();
    const b = deps.eventId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(a).not.toBe(b);
  });

  it("answers null where the runtime has no createImageBitmap, so the photo is refused", async () => {
    const deps = browserDeps(new FakeApi());
    expect(await deps.decode(new Blob([new Uint8Array(4)]))).toBeNull();
  });
});
