import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { devMediaUrl, itemsInLanguage, itemsPath, serverEnv } from "./config.ts";

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

  it("checks one language: the items' own, or --lang's", () => {
    const pl = { id: "a", language: "pl" };
    const en = { id: "b", language: "en" };
    const none = { id: "c" };
    expect(itemsInLanguage([pl], undefined)).toEqual({ lang: "pl", items: [pl], left_out: 0 });
    expect(itemsInLanguage([pl, en], undefined)).toEqual({
      error: "the items mix languages (en, pl): pass --lang to check one",
    });
    expect(itemsInLanguage([pl, none], undefined)).toEqual({
      error: "some items name no language: pass --lang pl or --lang en",
    });
    expect(itemsInLanguage([pl, en, none], "en")).toEqual({
      lang: "en",
      items: [en, { id: "c", language: "en" }],
      left_out: 1,
    });
    expect(itemsInLanguage([pl], "uk")).toEqual({ error: "--lang takes pl or en, not uk" });
    expect(itemsInLanguage([{ id: "d", language: "uk" }], undefined)).toEqual({
      error: "the items are in uk, which the app does not speak",
    });
  });
});
