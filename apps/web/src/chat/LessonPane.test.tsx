/**
 * The lesson column (dl-z5ja.108.1; handoff §3 "Collapsed list" and "Ghost rows", §5.4–5.5): rows
 * collapsed by default, each a button with aria-expanded; "Rozwiń wszystkie"; ghost rows while
 * building; this revision's rows tagged; the opened step's 2 columns.
 */

import { RunEvent } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LessonPane } from "./LessonPane.tsx";

afterEach(cleanup);

const lesson = () =>
  foldRun(
    (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) => RunEvent.parse(e)),
  ).lesson;

const rows = () => [...document.querySelectorAll<HTMLElement>("[data-step]")];
const toggles = () => rows().map((r) => r.querySelector("[aria-expanded]") as HTMLButtonElement);
const expanded = () => toggles().map((b) => b.getAttribute("aria-expanded"));

describe("the lesson column (dl-z5ja.108.1)", () => {
  it("draws one collapsed row per step: number, title, kind; no step body until one opens", () => {
    render(<LessonPane language="pl" lesson={lesson()} />);
    expect(rows().map((r) => r.getAttribute("data-step"))).toEqual(["s02", "s05", "s06", "s07"]);
    expect(expanded()).toEqual(["false", "false", "false", "false"]);
    expect(document.querySelector("[data-step-body]")).toBeNull();
    const first = toggles()[0] as HTMLButtonElement;
    expect(first.querySelector("[data-step-title]")?.textContent).toBe(
      "Ile to jest dwa razy pięć? Napisz albo powiedz.",
    );
    expect(first.textContent).toMatch(/^1/);
    expect(rows().map((r) => r.querySelector("[data-step-kind]")?.textContent)).toEqual([
      "Wpisz",
      "Wpisz",
      "Ułóż",
      "Wybierz",
    ]);
  });

  it("a row opens and closes on its button, which says so in aria-expanded", () => {
    render(<LessonPane language="pl" lesson={lesson()} />);
    const second = toggles()[1] as HTMLButtonElement;
    fireEvent.click(second);
    expect(expanded()).toEqual(["false", "true", "false", "false"]);
    const body = document.getElementById(second.getAttribute("aria-controls") ?? "");
    expect(body?.hasAttribute("data-step-body")).toBe(true);
    // Left the child's view, right the answer and the facts.
    expect(body?.querySelector("[data-child-view]")).not.toBeNull();
    expect(body?.querySelector("[data-step-facts] [data-answer]")).not.toBeNull();
    expect(body?.querySelector("[data-help]")?.textContent).toMatch(/^Pomoc: \d$/);
    fireEvent.click(second);
    expect(expanded()).toEqual(["false", "false", "false", "false"]);
    expect(document.querySelector("[data-step-body]")).toBeNull();
  });

  it("'Rozwiń wszystkie' opens every row, then 'Zwiń wszystkie' closes them", () => {
    render(<LessonPane language="pl" lesson={lesson()} />);
    fireEvent.click(screen.getByRole("button", { name: "Rozwiń wszystkie" }));
    expect(expanded()).toEqual(["true", "true", "true", "true"]);
    expect(document.querySelectorAll("[data-step-body]")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Zwiń wszystkie" }));
    expect(expanded()).toEqual(["false", "false", "false", "false"]);
    // One row closed by hand after all were open: the toggle offers to open all again.
    fireEvent.click(screen.getByRole("button", { name: "Rozwiń wszystkie" }));
    fireEvent.click(toggles()[0] as HTMLButtonElement);
    expect(screen.getByRole("button", { name: "Rozwiń wszystkie" })).toBeTruthy();
  });

  it("while building: as many dashed ghost rows as steps are coming, numbered after the rows", () => {
    const { rerender } = render(<LessonPane language="pl" lesson={null} ghosts={6} />);
    const ghosts = () => [...document.querySelectorAll("[data-ghost]")];
    expect(ghosts()).toHaveLength(6);
    expect(ghosts()[0]?.textContent).toBe("1Kolejne zadanie w drodze");
    expect(screen.queryByText("Tu pojawi się lekcja.")).toBeNull();
    rerender(<LessonPane language="pl" lesson={lesson()} ghosts={2} />);
    expect(rows()).toHaveLength(4);
    expect(ghosts()).toHaveLength(2);
    expect(ghosts()[0]?.textContent).toMatch(/^5/);
    rerender(<LessonPane language="pl" lesson={lesson()} />);
    expect(ghosts()).toHaveLength(0);
  });

  it("tags the rows this revision added or changed, nowe or zmienione, until opened (S20)", () => {
    render(
      <LessonPane
        language="pl"
        lesson={lesson()}
        changed={new Set(["s02", "s05"])}
        added={new Set(["s05"])}
      />,
    );
    const marks = () =>
      rows().flatMap((r) => {
        const mark = r.querySelector("[data-changed-mark]");
        return mark === null ? [] : [[r.getAttribute("data-step"), mark.textContent]];
      });
    expect(marks()).toEqual([
      ["s02", "zmienione"],
      ["s05", "nowe"],
    ]);
    expect(
      rows()
        .find((r) => r.getAttribute("data-step") === "s05")
        ?.hasAttribute("data-changed"),
    ).toBe(true);
    // Opened once, its tag has been read: closing it again brings no tag back.
    const s02 = rows().find((r) => r.getAttribute("data-step") === "s02");
    const button = s02?.querySelector("button[aria-expanded]") as HTMLButtonElement;
    fireEvent.click(button);
    fireEvent.click(button);
    expect(marks()).toEqual([["s05", "nowe"]]);
  });

  it("an opened step shows its skill only with a child, and where it came from", () => {
    const { rerender } = render(<LessonPane language="pl" lesson={lesson()} />);
    fireEvent.click(toggles()[0] as HTMLButtonElement);
    expect(document.querySelector("[data-skill]")).toBeNull();
    expect(document.querySelector("[data-source]")?.textContent).toBe("Napisane przez Jadwigo AI");
    rerender(<LessonPane language="pl" lesson={lesson()} withChild />);
    expect(document.querySelector("[data-skill]")?.textContent).toBe("maths.mul.2x5");
  });

  it("without an edit handler an opened step offers no actions", () => {
    render(<LessonPane language="pl" lesson={lesson()} />);
    fireEvent.click(toggles()[0] as HTMLButtonElement);
    expect(document.querySelector("[data-step-actions]")).toBeNull();
  });
});

describe("one edit path per question: Zmień ten krok (dl-uukj.47.71.17)", () => {
  it("an opened step offers only Zmień ten krok: no move, no Usuń, no Cofnij, no words editor", () => {
    render(
      <LessonPane
        language="pl"
        lesson={lesson()}
        changed={new Set(["s02"])}
        onEdit={() => undefined}
      />,
    );
    for (const toggle of toggles()) fireEvent.click(toggle);
    expect(document.querySelector("[data-move]")).toBeNull();
    expect(document.querySelector("[data-drop]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Usuń" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cofnij" })).toBeNull();
    fireEvent.click(document.querySelector("[data-edit-step]") as HTMLElement);
    expect(screen.queryByRole("textbox", { name: "Co ten krok mówi dziecku" })).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("sends a steer naming the step with the parent's words, and no patch", () => {
    const sent: unknown[][] = [];
    render(<LessonPane language="pl" lesson={lesson()} onEdit={(...args) => sent.push(args)} />);
    fireEvent.click(document.querySelector("[data-step='s02'] [aria-expanded]") as HTMLElement);
    fireEvent.click(document.querySelector("[data-edit-step='s02']") as HTMLElement);
    fireEvent.change(screen.getByRole("textbox", { name: "Co zmienić w tym kroku i dlaczego?" }), {
      target: { value: "mniejsze liczby" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zmianę" }));
    // Exactly the words and the step: no third argument, so no patch goes (dl-uukj.47.71.18).
    expect(sent).toEqual([["Rodzic prosi o zmianę w kroku s02: mniejsze liczby", ["s02"]]]);
    expect(screen.getByText("Twoja zmiana trafiła do Jadwigo AI.")).toBeTruthy();
  });
});
