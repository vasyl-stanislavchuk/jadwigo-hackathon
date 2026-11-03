/**
 * The Historia list against a double of each child's attempts (dl-uukj.47.67.7): every child's
 * attempts in one table, newest first, each row opening the attempt page and carrying its result;
 * no Status; the Dziecko facet from the URL; one child hiding it and the Dla column; the empty and
 * error states.
 */

import type { ParentClient } from "@jadwigo/api-client";
import { type Learner, type LearnerAttempt, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

beforeEach(() => window.history.replaceState(null, "", "/parent/history"));
afterEach(cleanup);

async function shown(
  learners: Learner[],
  using: Pick<ParentClient, "getLearnerAttempts"> = api,
): Promise<void> {
  render(<HistoryTable api={using} language="pl" learners={learners} />);
  await screen.findByRole("table", { name: "Historia" });
}

const rows = (): HTMLElement[] => {
  const table = screen.queryByRole("table", { name: "Historia" });
  return table === null ? [] : within(table).getAllByRole("row").slice(1);
};
const titles = (): string[] =>
  [...document.querySelectorAll<HTMLElement>("[data-attempt-row]")].map((a) => a.textContent ?? "");

describe("HistoryTable", () => {
  it("lists every child's attempts newest first, with a result and no Status", async () => {
    await shown([OLA, TYMEK]);
    expect(titles()).toEqual(["Żółw liczy kroki", "Odejmowanie przez 10", "Tabliczka mnożenia"]);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Lekcja", "Dla", "Wynik", "Kiedy", ""]);
    const row = rows()[1] as HTMLElement;
    expect(within(row).getByText("Ola")).toBeTruthy();
    expect(within(row).getByText("1 z 2")).toBeTruthy();
    expect(within(row).getByText("28 paź")).toBeTruthy();
    expect(within(row).queryByRole("checkbox")).toBeNull();
  });

  it("opens the attempt page from anywhere on the row", async () => {
    await shown([OLA, TYMEK]);
    await act(async () => fireEvent.click(within(rows()[1] as HTMLElement).getByText("Ola")));
    expect(window.location.pathname + window.location.search).toBe(
      `/parent/attempts/${attemptId(1)}?learner=${OLA.id}`,
    );
  });

  it("narrows the rows to the child the URL names", async () => {
    window.history.replaceState(null, "", `/parent/history?dziecko=${TYMEK.id}`);
    await shown([OLA, TYMEK]);
    expect(titles()).toEqual(["Żółw liczy kroki", "Tabliczka mnożenia"]);
    fireEvent.click(screen.getByRole("button", { name: "Wyczyść" }));
    expect(window.location.search).toBe("");
    expect(titles()).toHaveLength(3);
  });

  it("hides the Dziecko facet and the Dla column with one child", async () => {
    await shown([OLA]);
    expect(screen.queryByRole("button", { name: /Dziecko/ })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Dla" })).toBeNull();
  });

  it("says where history will be with nothing played", async () => {
    render(<HistoryTable api={api} language="pl" learners={[]} />);
    expect(await screen.findByText("Tu będzie historia")).toBeTruthy();
    expect(
      screen.getByText("Tu pojawi się każda zrobiona lekcja, z wynikiem pytanie po pytaniu."),
    ).toBeTruthy();
  });

  it("says the read failed, and reads again on Spróbuj ponownie", async () => {
    let fail = true;
    const flaky: Pick<ParentClient, "getLearnerAttempts"> = {
      getLearnerAttempts: async (id) => {
        if (fail) throw new Error("503");
        return api.getLearnerAttempts(id);
      },
    };
    render(<HistoryTable api={flaky} language="pl" learners={[OLA]} />);
    expect(await screen.findByText("Nie udało się wczytać historii")).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    await screen.findByRole("table", { name: "Historia" });
    expect(titles()).toEqual(["Odejmowanie przez 10"]);
  });
});
