import { describe, expect, it } from "vitest";
import { featuredLessons, featuredUrl, playUrl } from "./featured.ts";

const lesson = (assignment_id: string, title: string) => ({
  assignment_id,
  lesson_id: "les_2gj7s52rxqa5a9nkemj9dxbmpz",
  title,
  language: "pl",
});
const answer =
  (body: unknown, status = 200) =>
  async () =>
    new Response(JSON.stringify(body), { status });

describe("featuredLessons", () => {
  it("reads the app's public route", () => {
    expect(featuredUrl).toBe("https://app.jadwigo.pl/api/v1/featured-lessons");
  });

  it("keeps the API's lessons and leaves out the mocks", async () => {
    const body = {
      lessons: [
        lesson("asg_0ectzj2evqb95a3v1v6wewjzy3", "Równe grupy"),
        lesson("asg_7kb53jh5mhaf4a6enwj43wqt9r", "Jak piszę słowa (mock)"),
      ],
    };
    const got = await featuredLessons(answer(body));
    expect(got.from).toBe("api");
    expect(got.lessons.map((l) => l.title)).toEqual(["Równe grupy"]);
  });

  it("falls back to the snapshot when the fetch fails or answers badly", async () => {
    const offline = await featuredLessons(async () => {
      throw new Error("offline");
    });
    const broken = await featuredLessons(answer({ nope: true }, 500));
    for (const got of [offline, broken]) {
      expect(got.from).toBe("snapshot");
      expect(got.lessons.length).toBeGreaterThan(0);
      expect(got.lessons.every((l) => !l.title.endsWith("(mock)"))).toBe(true);
    }
  });
});

describe("playUrl", () => {
  it("opens the lesson in the app's player", async () => {
    const { lessons } = await featuredLessons(async () => {
      throw new Error("offline");
    });
    const first = lessons[0];
    if (!first) throw new Error("the snapshot is empty");
    expect(playUrl(first)).toBe(`https://app.jadwigo.pl/play/${first.assignment_id}`);
  });
});
