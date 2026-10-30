import { beforeEach, describe, expect, it, vi } from "vitest";

// The hooks are each lane's (draft-watch.ts, ask.ts); this test checks only the wiring, so both
// are mocked and never see a real dev server.
vi.mock("./draft-watch.ts", () => ({ draftWatch: vi.fn() }));
vi.mock("./ask.ts", () => ({ ask: vi.fn() }));

import { ask } from "./ask.ts";
import { BUILDER_PLUGIN, builderPlugin } from "./builder-plugin.ts";
import { draftWatch } from "./draft-watch.ts";

describe("builderPlugin", () => {
  beforeEach(() => {
    vi.mocked(draftWatch).mockClear();
    vi.mocked(ask).mockClear();
  });

  it("serves only, under its name", () => {
    const plugin = builderPlugin();
    expect(plugin.name).toBe(BUILDER_PLUGIN);
    expect(plugin.apply).toBe("serve");
  });

  it("hands the dev server to both hooks, once each", () => {
    const plugin = builderPlugin();
    const configure = plugin.configureServer;
    if (typeof configure !== "function") throw new Error("configureServer is a function");
    const server = { name: "a dev server" };
    const run = configure as unknown as (server: object) => void;
    run(server);
    expect(draftWatch).toHaveBeenCalledTimes(1);
    expect(draftWatch).toHaveBeenCalledWith(server);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledWith(server);
  });
});
