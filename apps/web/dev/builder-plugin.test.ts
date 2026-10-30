import { describe, expect, it } from "vitest";
import { BUILDER_PLUGIN, builderPlugin } from "./builder-plugin.ts";

describe("builderPlugin", () => {
  it("serves only, under its name", () => {
    const plugin = builderPlugin();
    expect(plugin.name).toBe(BUILDER_PLUGIN);
    expect(plugin.apply).toBe("serve");
  });

  it("wires its two hooks without a real server", () => {
    const plugin = builderPlugin();
    const configure = plugin.configureServer;
    if (typeof configure !== "function") throw new Error("configureServer is a function");
    // The step-0 hooks touch nothing on the server, so a bare object stands in for one, and
    // nothing in them reads the plugin context Vite would bind.
    const run = configure as unknown as (server: object) => void;
    expect(() => run({})).not.toThrow();
  });
});
