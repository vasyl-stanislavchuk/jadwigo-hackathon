import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { itemsPath, serverEnv } from "./config.ts";

describe("the conformance runner's settings", () => {
  it("reads the items file as jw does", () => {
    expect(itemsPath({ JW_KHAN_CONVERTED: "/data/converted-pl.json" })).toBe(
      "/data/converted-pl.json",
    );
    expect(itemsPath({ JW_KHAN_CONVERTED: "~/x.json" })).toBe(join(homedir(), "x.json"));
    expect(itemsPath({ JADWIGO_KHAN_DIR: "/khan" })).toBe("/khan/converted-pl.json");
    expect(itemsPath({})).toBe(
      join(homedir(), ".cache", "jadwigo-bank", "khan", "converted-pl.json"),
    );
  });

  it("starts the dev server on the port it picked", () => {
    expect(serverEnv(4321, { A: "1" })).toEqual({ A: "1", WEB_PORT: "4321" });
  });
});
