import type { FeaturedLesson } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { assertLanguage, lessonsIn, pageLessons } from "./featured.ts";

const lesson = (assignment_id: string, title: string, language: "pl" | "en") =>
  ({
    assignment_id,
    lesson_id: "les_2gj7s52rxqa5a9nkemj9dxbmpz",
    title,
    language,
    subject: "math",
    grade: null,
    question_count: 4,
    first_say: "Ile to jest 2 razy 5?",
  }) as FeaturedLesson;
const pl = lesson("asg_0ectzj2evqb95a3v1v6wewjzy3", "Równe grupy", "pl");
const en = lesson("asg_7kb53jh5mhaf4a6enwj43wqt9r", "Equal groups", "en");
const answer = (lessons: FeaturedLesson[]) => async () =>
  new Response(JSON.stringify({ lessons }), { status: 200 });
const quiet = () => {};

describe("featured lessons per language", () => {
  it("gives each page only the lessons in its own language", () => {
    expect(lessonsIn([pl, en], "pl")).toEqual([pl]);
    expect(lessonsIn([pl, en], "en")).toEqual([en]);
  });

  it("stops the build when a Polish lesson is planted on the English list", () => {
    expect(() => assertLanguage([en, pl], "en")).toThrow(
      "A en page lists lessons in another language: Równe grupy (pl)",
    );
    expect(() => assertLanguage([en], "en")).not.toThrow();
  });

  it("builds /en/lessons with no English lessons yet: an empty list, not an error", async () => {
    const warn = console.warn;
    console.warn = quiet;
    try {
      expect(await pageLessons("en", answer([pl]))).toEqual([]);
      expect(await pageLessons("pl", answer([pl, en]))).toEqual([pl]);
    } finally {
      console.warn = warn;
    }
  });
});
