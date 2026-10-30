import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { devMediaUrl, itemsPath, serverEnv } from "./config.ts";

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

  it("takes the dev server's media URL: the environment, then the env files, then the example", () => {
    const example = "# where pictures are\nVITE_MEDIA_URL=https://example.invalid\n";
    expect(devMediaUrl({}, [], example)).toBe("https://example.invalid");
    expect(devMediaUrl({}, ["VITE_MEDIA_URL=https://a.invalid", "X=1"], example)).toBe(
      "https://a.invalid",
    );
    expect(
      devMediaUrl({}, ["VITE_MEDIA_URL=https://a.invalid", 'VITE_MEDIA_URL=""'], example),
    ).toBe("");
    expect(devMediaUrl({ VITE_MEDIA_URL: " " }, [], example)).toBe("");
    expect(devMediaUrl({ VITE_MEDIA_URL: "https://env.invalid" }, [], example)).toBe(
      "https://env.invalid",
    );
    expect(devMediaUrl({}, [], "# none\n")).toBe("");
  });
});
