import { describe, expect, it } from "vitest";
import {
  PROFILE_ROLES,
  parseProfileRoles,
  profileProblems,
  readProfile,
} from "./diagram-profile.ts";

const profile = readProfile();

describe("the Jadwigo diagram-design profile", () => {
  it("carries every semantic role, each naming its token", () => {
    const rows = parseProfileRoles(profile);
    expect(rows.map((row) => row.role)).toEqual([...PROFILE_ROLES]);
    for (const row of rows) expect(row.token, row.role).toMatch(/^jw-(?!p-)/);
  });

  it("sets every role to its token's colour, by day and by night", () => {
    expect(profileProblems(profile)).toEqual([]);
  });

  it("is a profile the skill can select: its header, Andika, and the system font source", () => {
    expect(profile.startsWith("<!-- diagram-design-profile\nname: Jadwigo\nslug: jadwigo\n")).toBe(
      true,
    );
    expect(profile).toContain("Font source: `system`");
    expect(profile).toContain("| `node-name` | Andika, system-ui, sans-serif |");
    expect(profile).not.toContain("fonts.googleapis.com/css2?family=Instrument");
  });
});

describe("profileProblems", () => {
  it("names a colour that drifted from its token", () => {
    const planted = profile.replace("`#3a5fa8`", "`#000000`");
    expect(profileProblems(planted)).toEqual(["accent is #000000 by day, --jw-focus is #3a5fa8"]);
  });

  it("names a missing role and a token nobody sets", () => {
    const missing = profile
      .split("\n")
      .filter((line) => !line.startsWith("| `link` |"))
      .join("\n");
    expect(profileProblems(missing)).toEqual(["the profile has no link row"]);
    expect(profileProblems(profile.replace("(`--jw-focus`)", "(`--jw-gone`)"))).toEqual([
      "accent names --jw-gone, which foundation.css does not set",
    ]);
  });
});
