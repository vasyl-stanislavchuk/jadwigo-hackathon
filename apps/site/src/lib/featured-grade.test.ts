import type { FeaturedLesson } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { gradeGroups, gradePlayProblems, gradesOf, playBase, sortByGrade } from "./featured.ts";

const lesson = (title: string, grade: number | null) =>
  ({
    assignment_id: "asg_0ectzj2evqb95a3v1v6wewjzy3",
    lesson_id: "les_2gj7s52rxqa5a9nkemj9dxbmpz",
    title,
    language: "pl",
    subject: "math",
    grade,
    question_count: 4,
    first_say: "Ile to jest 2 razy 5?",
  }) as FeaturedLesson;

const loose = lesson("Bez klasy", null);
const zegar = lesson("Zegar", 2);
const dodawanie = lesson("Dodawanie", 1);
const ulamki = lesson("Ułamki", 3);
const liczby = lesson("Liczby do 20", 1);
const dzielenie = lesson("Dzielenie", 2);

describe("grade tabs", () => {
  it("sorts by grade, then by title, with the lessons that have no grade last", () => {
    const sorted = sortByGrade([loose, zegar, ulamki, liczby, dzielenie, dodawanie], "pl");
    expect(sorted.map((l) => l.title)).toEqual([
      "Dodawanie",
      "Liczby do 20",
      "Dzielenie",
      "Zegar",
      "Ułamki",
      "Bez klasy",
    ]);
  });

  it("makes a tab for each grade present, lowest first", () => {
    expect(gradesOf([ulamki, loose, dodawanie, zegar, liczby])).toEqual([1, 2, 3]);
    expect(gradesOf([zegar, dzielenie])).toEqual([2]);
  });

  it("makes no tab while no lesson has a grade", () => {
    expect(gradesOf([loose])).toEqual([]);
    expect(gradesOf([])).toEqual([]);
  });

  it("groups /lekcje by grade and keeps the lessons with no grade last", () => {
    const groups = gradeGroups(sortByGrade([loose, zegar, dodawanie, ulamki], "pl"));
    expect(groups.map((g) => [g.grade, g.lessons.map((l) => l.title)])).toEqual([
      [1, ["Dodawanie"]],
      [2, ["Zegar"]],
      [3, ["Ułamki"]],
      [null, ["Bez klasy"]],
    ]);
    expect(gradeGroups([loose])).toEqual([{ grade: null, lessons: [loose] }]);
  });
});

describe("gradePlayProblems", () => {
  const play = `${playBase}asg_`;
  const tab = (g: number) => `<input type="radio" name="grade" value="${g}" checked>`;
  const card = (g: number, href = `${play}abc`) =>
    `<li class="card" data-grade="${g}" data-subject="math" hidden><a href="${href}">`;

  it("passes when every grade offered has a card that plays", () => {
    const html = `${tab(1)}${tab(2)}<ul>${card(1)}${card(2)}</ul>`;
    expect(gradePlayProblems(html, play)).toEqual([]);
  });

  it("names a grade whose tab has no card that plays", () => {
    const html = `${tab(1)}${tab(2)}${tab(3)}<ul>${card(1)}${card(2, "/nowhere")}</ul>`;
    expect(gradePlayProblems(html, play)).toEqual([
      `grade 2 has no card that links to ${play}`,
      `grade 3 has no card that links to ${play}`,
    ]);
  });

  it("checks /lekcje's grade groups too", () => {
    const html = `<h2 id="grade-1">Klasa 1</h2><ul>${card(2)}</ul>`;
    expect(gradePlayProblems(html, play)).toEqual([`grade 1 has no card that links to ${play}`]);
  });

  it("checks nothing on a page with no grades", () => {
    expect(
      gradePlayProblems(`<ul><li class="card" data-grade=""><a href="${play}x"></ul>`, play),
    ).toEqual([]);
  });
});
