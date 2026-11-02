/**
 * The Historia table against a double of each child's attempts: every child's attempts in one
 * table, newest first, each row opening the attempt page with a tile per question and the legend;
 * the filter and the search narrow the rows.
 */

import type { ParentClient } from "@jadwigo/api-client";
import { type Learner, type LearnerAttempt, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { attemptId, result } from "../overview/fixtures.ts";
import { HistoryTable } from "./HistoryTable.tsx";

const POD = "pod_6et2fhbnwvb45aw9atcfzs33za";
const learner = (id: string, firstName: string): Learner =>
  ({
    id: LearnerId.parse(id),
    pod_id: POD,
    handle: firstName.toLowerCase(),
    first_name: firstName,
    school_grade: null,
    created_at: "2026-10-01T08:00:00.000Z",
  }) as unknown as Learner;
const OLA = learner("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq", "Ola");
const TYMEK = learner("lrn_7qre3atahx8cpak6xbjtz73var", "Tymek");

const played = (n: number, title: string, startedAt: string): LearnerAttempt =>
  ({
    attempt: { id: attemptId(n), started_at: startedAt },
    title,
    language: "pl",
    results: [
      result(n, 1, 1),
      result(n, 2, 2, { ended: "missed", correct: false, first_try_correct: false }),
    ],
  }) as unknown as LearnerAttempt;

const ATTEMPTS = new Map<string, LearnerAttempt[]>([
  [OLA.id, [played(1, "Odejmowanie przez 10", "2026-10-28T14:00:00.000Z")]],
  [
    TYMEK.id,
    [
      played(3, "Żółw liczy kroki", "2026-10-30T09:00:00.000Z"),
      played(2, "Tabliczka mnożenia", "2026-10-20T09:00:00.000Z"),
    ],
  ],
]);

const api: Pick<ParentClient, "getLearnerAttempts"> = {
  getLearnerAttempts: async (id) => ({
    learner: id === OLA.id ? OLA : TYMEK,
    attempts: ATTEMPTS.get(id) ?? [],
  }),
};

afterEach(cleanup);

async function shown(learners: Learner[]): Promise<void> {
  render(<HistoryTable api={api} language="pl" learners={learners} />);
  await screen.findByRole("table");
}

const titles = (): string[] =>
  [...document.querySelectorAll<HTMLElement>("[data-attempt-link]")].map(
    (a) => a.textContent ?? "",
  );

describe("HistoryTable", () => {
  it("lists every child's attempts newest first, each opening its attempt page", async () => {
    await shown([OLA, TYMEK]);
    expect(titles()).toEqual(["Żółw liczy kroki", "Odejmowanie przez 10", "Tabliczka mnożenia"]);
    const link = screen.getByRole("link", { name: "Odejmowanie przez 10" });
    expect(link.getAttribute("href")).toBe(`/parent/attempts/${attemptId(1)}?learner=${OLA.id}`);
    const row = link.closest("tr") as HTMLElement;
    expect(within(row).getByText("Ola")).toBeTruthy();
    expect(row.querySelectorAll("[data-lesson-tiles] li")).toHaveLength(2);
    expect(document.querySelector("[data-legend]")).not.toBeNull();
  });

  it("narrows the rows to one child's", async () => {
    await shown([OLA, TYMEK]);
    const filter = screen.getByRole("radiogroup", { name: "Pokaż" });
    expect(
      within(filter)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(["Wszystkie", "Ola", "Tymek", "Bez dziecka"]);
    await act(async () => fireEvent.click(within(filter).getByRole("radio", { name: "Tymek" })));
    expect(titles()).toEqual(["Żółw liczy kroki", "Tabliczka mnożenia"]);
    await act(async () =>
      fireEvent.click(within(filter).getByRole("radio", { name: "Bez dziecka" })),
    );
    expect(titles()).toEqual([]);
    expect(screen.getByText("Nic tu nie pasuje do wyboru.")).toBeTruthy();
  });

  it("searches the titles and the children's names", async () => {
    await shown([OLA, TYMEK]);
    const search = screen.getByRole("searchbox", { name: "Szukaj" });
    fireEvent.change(search, { target: { value: "ola" } });
    expect(titles()).toEqual(["Odejmowanie przez 10"]);
    fireEvent.change(search, { target: { value: "MNOZENIA" } });
    expect(titles()).toEqual(["Tabliczka mnożenia"]);
  });

  it("shows the structure and one muted line with nothing played", async () => {
    await shown([]);
    expect(titles()).toEqual([]);
    expect(
      screen.getByText("Tu pojawi się każda zrobiona lekcja, z wynikiem pytanie po pytaniu."),
    ).toBeTruthy();
    expect(document.querySelector("[data-legend]")).toBeNull();
  });
});
