import { describe, expect, it } from "vitest";
import { draftsDir } from "./config.ts";

describe("draftsDir", () => {
  it("expands a leading ~/ to HOME, as jw does", () => {
    expect(draftsDir({ JADWIGO_DRAFTS_DIR: "~/drafts", HOME: "/home/someone" })).toBe(
      "/home/someone/drafts",
    );
    expect(draftsDir({ JADWIGO_DRAFTS_DIR: " ~ ", HOME: "/home/someone" })).toBe("/home/someone");
  });

  it("keeps an absolute path as written, trimmed", () => {
    expect(draftsDir({ JADWIGO_DRAFTS_DIR: " /var/drafts ", HOME: "/home/someone" })).toBe(
      "/var/drafts",
    );
  });

  it("defaults to jw's directory under HOME", () => {
    expect(draftsDir({ HOME: "/home/someone" })).toBe("/home/someone/.local/state/jadwigo/drafts");
    expect(draftsDir({ JADWIGO_DRAFTS_DIR: "  ", HOME: "/home/someone" })).toBe(
      "/home/someone/.local/state/jadwigo/drafts",
    );
  });
});
