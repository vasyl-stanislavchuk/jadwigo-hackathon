/**
 * The home page against a double of the API (no network): it lists the featured lessons as links to
 * their players, carrying the page's query, says so when there are none, and says the lessons did
 * not load when the call fails.
 */

import type { AttemptClient } from "@jadwigo/api-client";
import { AssignmentId, type FeaturedLesson, LessonId } from "@jadwigo/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeScreen } from "./HomeScreen.tsx";

const LESSONS: FeaturedLesson[] = [
  {
    assignment_id: AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3"),
    lesson_id: LessonId.parse("les_2h4m8gyw0fb1cvz2nkqw0px8fq"),
    title: "Równe grupy",
    language: "pl",
  },
  {
    assignment_id: AssignmentId.parse("asg_43007b83dp9w2tnfjxhha74cyq"),
    lesson_id: LessonId.parse("les_7qre3atahx8cpak6xbjtz73var"),
    title: "Dodawanie do 20",
    language: "pl",
  },
];

const refused = (): never => {
  throw new Error("not called in this test");
};

function client(featuredLessons: AttemptClient["featuredLessons"]): AttemptClient {
  return {
    featuredLessons,
    startAttempt: refused,
    getAttempt: refused,
    answer: refused,
    help: refused,
    patchAttempt: refused,
    getResults: refused,
  };
}

afterEach(cleanup);

describe("HomeScreen", () => {
  it("lists the featured lessons, oldest first, each a link to its player", async () => {
    const featuredLessons = vi.fn(async () => ({ lessons: LESSONS }));
    render(
      <HomeScreen
        language="pl"
        query={new URLSearchParams("lang=pl")}
        client={client(featuredLessons)}
      />,
    );
    expect(await screen.findByText("Wybierz lekcję")).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Równe grupy", "Dodawanie do 20"]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/play/asg_0ectzj2evqb95a3v1v6wewjzy3?lang=pl",
      "/play/asg_43007b83dp9w2tnfjxhha74cyq?lang=pl",
    ]);
    expect(featuredLessons).toHaveBeenCalledTimes(1);
  });

  it("says there are no lessons yet when the list is empty", async () => {
    render(
      <HomeScreen
        language="pl"
        query={new URLSearchParams()}
        client={client(async () => ({ lessons: [] }))}
      />,
    );
    expect(await screen.findByText("Na razie nie ma tu lekcji.")).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("says the lessons did not load when the call fails", async () => {
    render(
      <HomeScreen
        language="pl"
        query={new URLSearchParams()}
        client={client(async () => {
          throw new Error("offline");
        })}
      />,
    );
    expect(await screen.findByText(/./, { selector: "[data-failed]" })).toBeTruthy();
  });
});
