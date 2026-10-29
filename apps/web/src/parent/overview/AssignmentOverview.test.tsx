/**
 * The lesson overview against a double of the API (no network): the header's counts, a cell per
 * outcome with its icon and its line in its accessible name, the legend, a column's sheet, one
 * attempt as one row, and the links into each attempt's page. Happy-dom does no layout, so the
 * sideways scroll is e2e/parent-overview.spec.ts's.
 */

import { ApiError, type ParentClient } from "@jadwigo/api-client";
import type { AssignmentAttempts, AssignmentId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentOverview } from "./AssignmentOverview.tsx";
import { ASSIGNMENT, attemptId, LEARNER, overview, played, result, twin } from "./fixtures.ts";

const refused = (): never => {
  throw new Error("not called in this test");
};

function client(reply: AssignmentAttempts): ParentClient {
  return {
    getMe: refused,
    createAccount: refused,
    createLearner: refused,
    claimAttempt: refused,
    getLearnerAttempts: refused,
    getParentReview: refused,
    getAssignmentAttempts: vi.fn(async () => reply),
  };
}

const missed = { ended: "missed", correct: false, first_try_correct: false } as const;
const skipped = { ended: "skipped", correct: false, first_try_correct: false } as const;

/** 2 attempts over 6 questions: every outcome once, a twin folded into question 3. */
const POD_OF_2 = overview([
  played(
    1,
    [
      result(1, 1, 1),
      result(1, 2, 2, { tries: 2, first_try_correct: false, help_used: 1, time_ms: 41_000 }),
      result(1, 3, 3, skipped),
      twin(1, 4, 7, 3, { say: "Ile to 4 + 4?" }),
      result(1, 5, 4, missed),
      result(1, 6, 5, { ...skipped, skip_reason: "dont_know" }),
    ],
    { name: "Ola" },
  ),
  played(
    2,
    [result(2, 1, 1), result(2, 7, 6, { ended: null, correct: false, first_try_correct: false })],
    {
      finished: false,
      learner: false,
    },
  ),
]);

async function draw(reply: AssignmentAttempts, assignment: AssignmentId | null = ASSIGNMENT) {
  const api = client(reply);
  await act(async () => {
    render(<AssignmentOverview api={api} assignment={assignment} language="pl" />);
  });
  return api;
}

const row = (n: number): HTMLElement => {
  const found = document.querySelector<HTMLElement>(`tr[data-row="${attemptId(n)}"]`);
  if (found === null) throw new Error(`no row ${n}`);
  return found;
};
const cells = (n: number): HTMLElement[] => [
  ...row(n).querySelectorAll<HTMLElement>("[data-cell]"),
];

beforeEach(() => {
  window.history.replaceState(null, "", `/parent/assignments/${ASSIGNMENT}`);
});
afterEach(cleanup);

describe("AssignmentOverview", () => {
  it("asks for the assignment's attempts and heads the page with counts", async () => {
    const api = await draw(POD_OF_2);
    expect(api.getAssignmentAttempts).toHaveBeenCalledWith(ASSIGNMENT);
    expect(screen.getByRole("heading", { level: 1, name: "Równe grupy" })).toBeTruthy();
    expect(screen.getByText("Podejścia: 2")).toBeTruthy();
    // The union of both attempts' planned questions: 1 to 5, and 6 only the second asked.
    expect(screen.getByText("Zadane pytania: 6")).toBeTruthy();
    expect(document.body.textContent).not.toContain("%");
  });

  it("gives every cell its icon and its outcome's line in its accessible name", async () => {
    await draw(POD_OF_2);
    expect(cells(1).map((c) => c.getAttribute("data-cell"))).toEqual([
      "first_try",
      "got_there",
      "got_there",
      "not_yet",
      "skipped",
      "not_asked",
    ]);
    expect(cells(2).map((c) => c.getAttribute("data-cell"))).toEqual([
      "first_try",
      "not_asked",
      "not_asked",
      "not_asked",
      "not_asked",
      "open",
    ]);
    for (const cell of [...cells(1), ...cells(2)])
      expect(cell.querySelector(`[data-icon="${cell.getAttribute("data-cell")}"]`)).not.toBeNull();
    const names = cells(1).map((c) => c.getAttribute("aria-label"));
    expect(names).toEqual([
      "Pytanie 1: Od razu",
      "Pytanie 2: Po próbach lub z pomocą",
      "Pytanie 3: Po próbach lub z pomocą, Było też podobne pytanie",
      "Pytanie 4: Jeszcze nie",
      "Pytanie 5: Pominięte",
      "Pytanie 6: Nie zadane",
    ]);
    expect(cells(2)[5]?.getAttribute("aria-label")).toBe("Pytanie 6: W trakcie");
    expect(cells(1)[2]?.querySelector("[data-twin-mark]")).not.toBeNull();
    expect(cells(1)[0]?.querySelector("[data-twin-mark]")).toBeNull();
  });

  it("counts first tries per row and per column, never a percentage", async () => {
    await draw(POD_OF_2);
    expect(row(1).querySelector("[data-row-count]")?.textContent).toBe("1/5");
    expect(row(2).querySelector("[data-row-count]")?.textContent).toBe("1/2");
    const footer = [...document.querySelectorAll("[data-column-count]")].map((c) => c.textContent);
    expect(footer).toEqual(["2/2", "0/1", "0/1", "0/1", "0/1", "0/1"]);
  });

  it("names a row, or numbers it", async () => {
    await draw(POD_OF_2);
    expect(within(row(1)).getByRole("rowheader").textContent).toBe("Ola");
    expect(within(row(2)).getByRole("rowheader").textContent).toBe("Uczestnik 2");
  });

  it("shows the legend: the 6 outcomes, each with its icon, and the twin mark", async () => {
    await draw(POD_OF_2);
    const legend = document.querySelector<HTMLElement>("[data-legend]");
    if (legend === null) throw new Error("no legend");
    expect(within(legend).getByRole("heading", { name: "Legenda" })).toBeTruthy();
    const items = [...legend.querySelectorAll<HTMLElement>("[data-legend-outcome]")];
    expect(items.map((i) => [i.getAttribute("data-legend-outcome"), i.textContent])).toEqual([
      ["first_try", "Od razu"],
      ["got_there", "Po próbach lub z pomocą"],
      ["not_yet", "Jeszcze nie"],
      ["skipped", "Pominięte"],
      ["open", "W trakcie"],
      ["not_asked", "Nie zadane"],
    ]);
    for (const item of items)
      expect(
        item.querySelector(`[data-icon="${item.getAttribute("data-legend-outcome")}"]`),
      ).not.toBeNull();
    expect(legend.querySelector("[data-legend-twin] [data-twin-mark]")).not.toBeNull();
  });

  it("opens a column's sheet: the question, then each attempt with its numbers and its twin nested", async () => {
    await draw(POD_OF_2);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Pytanie 3" })));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "Pytanie 3" })).toBeTruthy();
    expect(within(sheet).getByText("Ile to 3 + 3?")).toBeTruthy();
    const lines = [...sheet.querySelectorAll<HTMLElement>("[data-sheet-line]")];
    expect(lines).toHaveLength(2);
    const [first, second] = lines;
    expect(first?.querySelector("[data-sheet-outcome]")?.textContent).toBe(
      "Po próbach lub z pomocą",
    );
    const nested = first?.querySelector<HTMLElement>("[data-sheet-twins] [data-sheet-twin]");
    expect(nested?.getAttribute("data-sheet-twin")).toBe("4");
    expect(nested?.textContent).toContain("Ile to 4 + 4?");
    expect(nested?.querySelector("[data-sheet-outcome]")?.textContent).toBe("Od razu");
    expect(second?.querySelector("[data-sheet-outcome]")?.textContent).toBe("Nie zadane");
    expect(second?.querySelector("[data-sheet-numbers]")).toBeNull();

    await act(async () => fireEvent.click(within(sheet).getByRole("button", { name: "Zamknij" })));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("gives a sheet line the tries, the help and the time", async () => {
    await draw(POD_OF_2);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Pytanie 2" })));
    const sheet = await screen.findByRole("dialog");
    const numbers = sheet.querySelector(`[data-sheet-line="${attemptId(1)}"] [data-sheet-numbers]`);
    expect(numbers?.textContent).toBe("Próby: 2 · Pomoc: 1 · Czas: 41 s");
  });

  it("draws one attempt as one row", async () => {
    await draw(overview([played(1, [result(1, 1, 1), result(1, 2, 2, missed)])]));
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(screen.getByText("Podejścia: 1")).toBeTruthy();
    expect(screen.getByText("Zadane pytania: 2")).toBeTruthy();
    expect(cells(1).map((c) => c.getAttribute("data-cell"))).toEqual(["first_try", "not_yet"]);
  });

  it("links a finished attempt's name and cells to its page, and follows a cell there", async () => {
    await draw(POD_OF_2);
    const page = `/parent/attempts/${attemptId(1)}?learner=${LEARNER}`;
    expect(within(row(1)).getByRole("link", { name: "Ola" }).getAttribute("href")).toBe(page);
    const links = [...row(1).querySelectorAll<HTMLAnchorElement>("a[data-cell-link]")];
    // Every asked cell; a question this attempt never asked has nothing to show there.
    expect(links).toHaveLength(5);
    for (const link of links) expect(link.getAttribute("href")).toBe(page);

    const cell = screen.getByRole("link", { name: "Pytanie 4: Jeszcze nie" });
    await act(async () => fireEvent.click(cell));
    expect(`${window.location.pathname}${window.location.search}`).toBe(page);
  });

  it("links nothing of an attempt still being played: it has no page yet", async () => {
    await draw(POD_OF_2);
    expect(row(2).querySelectorAll("a")).toHaveLength(0);
  });

  it("carries the page's language onto its links", async () => {
    window.history.replaceState(null, "", `/parent/assignments/${ASSIGNMENT}?lang=en`);
    await draw(POD_OF_2);
    expect(within(row(1)).getByRole("link", { name: "Ola" }).getAttribute("href")).toContain(
      "lang=en",
    );
    expect(document.querySelector("[data-parent-home]")?.getAttribute("href")).toBe(
      "/parent?lang=en",
    );
  });

  it("says it could not load, with the way home, for an id that does not parse or a refusal", async () => {
    await draw(POD_OF_2, null);
    expect(document.querySelector("[data-failed]")).not.toBeNull();
    cleanup();
    const api = client(POD_OF_2);
    api.getAssignmentAttempts = async () => {
      throw new ApiError("not found", 404, "NotFound");
    };
    await act(async () => {
      render(<AssignmentOverview api={api} assignment={ASSIGNMENT} language="pl" />);
    });
    expect(document.querySelector("[data-failed]")).not.toBeNull();
    expect(document.querySelector("[data-parent-home]")).not.toBeNull();
  });
});
