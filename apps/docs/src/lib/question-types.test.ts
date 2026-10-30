import { QUESTION_TYPES } from "@jadwigo/lesson-kit/question-types";
import { describe, expect, it } from "vitest";
import { familyGroups, gallery, playgroundUrl } from "./question-types.ts";

describe("playgroundUrl", () => {
  it("is /playground/<family>/<question type> on the app's host", () => {
    expect(playgroundUrl({ family: "choose", name: "true_false" })).toBe(
      "https://app.jadwigo.pl/playground/choose/true_false",
    );
  });

  // The pattern apps/web's playground/route.ts matches for a question type's page.
  it("makes a path the playground's router reads as a family and a question type", () => {
    for (const type of QUESTION_TYPES) {
      const path = new URL(playgroundUrl(type)).pathname;
      const match = path.match(/^\/playground(?:\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?)?\/?$/);
      expect(match?.slice(1, 3), path).toEqual([type.family, type.name]);
    }
  });
});

describe("gallery", () => {
  it("is the System page", () => {
    expect(gallery).toBe("https://app.jadwigo.pl/playground/system");
  });
});

describe("familyGroups", () => {
  const groups = familyGroups();

  it("lists every question type once, under its own family", () => {
    const listed = groups.flatMap((g) => g.types.map((t) => [t.name, g.name]));
    expect(listed).toEqual(QUESTION_TYPES.map((t) => [t.name, t.family]));
  });

  it("names each family once, with what the learner does", () => {
    expect(new Set(groups.map((g) => g.name)).size).toBe(groups.length);
    for (const g of groups) expect(g.does.length, g.name).toBeGreaterThan(0);
    expect(groups[0]?.label).toBe("Choose");
  });
});
