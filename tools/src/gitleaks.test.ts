import { describe, expect, it } from "vitest";
import { familyNameConfig, parseTerms } from "./gitleaks";

describe("parseTerms", () => {
  it("keeps one term a line and skips blanks and comments", () => {
    expect(parseTerms("# names\nzqvor\n\n  łapik  \n")).toEqual(["zqvor", "łapik"]);
  });
});

describe("familyNameConfig", () => {
  it("extends the base, escapes each term and allowlists apps/site", () => {
    const config = familyNameConfig("/repo/.gitleaks.toml", ["zq.vor", "Łapik"]);
    expect(config).toContain('path = "/repo/.gitleaks.toml"');
    expect(config).toContain("(?:zq\\.vor|Łapik)");
    expect(config).toContain('keywords = ["zq.vor", "łapik"]');
    expect(config).toContain("apps/site/");
  });
});
