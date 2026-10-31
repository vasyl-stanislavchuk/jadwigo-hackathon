/**
 * The learner page's section against a double of the API (no network): the 3 lists from a
 * LearnerSkills fixture, the week strip's counts, the report's narrative and a decision posted,
 * the empty states, a part that failed, and none of it for a client without the knowledge calls.
 * No level name, score or percentage reaches the page. Happy-dom does no layout, so the phone
 * width is e2e/learner-report.spec.ts's.
 */

import type { LearnerKnowledgeClient, ParentClient } from "@jadwigo/api-client";
import type { LearnerReport, LearnerReports, LearnerSkills } from "@jadwigo/contracts";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADD_10,
  ADD_20,
  ATTEMPTS,
  EMPTY_NARRATIVE,
  LEARNER,
  NO_GOALS,
  REPORTS,
  SKILLS,
  TAKE_AWAY,
  UNWRITTEN,
} from "./fixtures.ts";
import { LearnerKnowledge } from "./LearnerKnowledge.tsx";

const refused = (): never => {
  throw new Error("not called in this test");
};

function client(
  changes: Partial<ParentClient & LearnerKnowledgeClient> = {},
): ParentClient & LearnerKnowledgeClient {
  return {
    getMe: refused,
    createAccount: refused,
    createLearner: refused,
    claimAttempt: refused,
    getParentReview: refused,
    getAssignmentAttempts: refused,
    getLearnerAttempts: vi.fn(async () => ATTEMPTS),
    listSkills: refused,
    getLearnerGoals: refused,
    createGoal: refused,
    patchGoal: refused,
    createReport: refused,
    getLearnerSkills: vi.fn(async (): Promise<LearnerSkills> => SKILLS),
    getLearnerReports: vi.fn(async (): Promise<LearnerReports> => REPORTS),
    patchReport: refused,
    ...changes,
  };
}

async function draw(api: ParentClient, language: "pl" | "en" = "pl"): Promise<HTMLElement> {
  render(<LearnerKnowledge api={api} learner={LEARNER} language={language} />);
  await screen.findByRole("heading", {
    name: language === "pl" ? "Ostatni raport" : "Latest report",
  });
  await screen.findByRole("heading", { name: language === "pl" ? "Cele" : "Goals" });
  await screen.findByRole("heading", {
    name: language === "pl" ? "Tydzień po tygodniu" : "Week by week",
  });
  const section = document.querySelector<HTMLElement>("[data-learner-knowledge]");
  if (section === null) throw new Error("no section");
  return section;
}

afterEach(cleanup);

describe("the goals", () => {
  it("show each goal's status word and its 3 lists in the parent's words", async () => {
    await draw(client());
    const goal = document.querySelector<HTMLElement>("[data-goal-status=on_its_way]");
    if (goal === null) throw new Error("no goal");
    const inGoal = within(goal);
    expect(inGoal.getByText("Dodawanie i odejmowanie")).toBeTruthy();
    expect(inGoal.getByText("W drodze")).toBeTruthy();
    const list = (name: string) => goal.querySelector(`[data-list=${name}]`)?.textContent;
    expect(list("can_do_now")).toBe("Umie jużDodaje w zakresie 10.");
    expect(list("needs_attention")).toBe("Nad czym pracujemyTake away to 10");
    expect(list("next")).toBe("Co dalejWithin 20");
    expect(goal.querySelector(`[data-skill="${ADD_10}"]`)).not.toBeNull();
    expect(goal.querySelector(`[data-skill="${TAKE_AWAY}"]`)).not.toBeNull();
    expect(goal.querySelector(`[data-skill="${ADD_20}"]`)).not.toBeNull();
  });

  it("say 'nothing recorded' for each empty list of a goal", async () => {
    await draw(client());
    const goal = document.querySelector<HTMLElement>("[data-goal-status=not_started]");
    expect(goal?.querySelectorAll("[data-nothing-recorded]")).toHaveLength(3);
    expect(within(goal as HTMLElement).getByText("Jeszcze nie zaczęty")).toBeTruthy();
    expect(within(goal as HTMLElement).getAllByText("Nic jeszcze nie zapisano.")).toHaveLength(3);
  });

  it("say there is no goal yet", async () => {
    await draw(client({ getLearnerSkills: vi.fn(async () => NO_GOALS) }));
    expect(screen.getByText("Nie ma jeszcze żadnego celu.")).toBeTruthy();
  });

  it("read in English too", async () => {
    await draw(client(), "en");
    const goal = document.querySelector<HTMLElement>("[data-goal-status=on_its_way]");
    expect(goal?.querySelector("[data-list=can_do_now]")?.textContent).toBe(
      "Can do nowAdds within 10.",
    );
    expect(within(goal as HTMLElement).getByText("On its way")).toBeTruthy();
  });
});

describe("the week strip", () => {
  it("counts lessons, skills forward and skills to watch, as digits, per week", async () => {
    await draw(client());
    const weeks = [...document.querySelectorAll<HTMLElement>("[data-week]")];
    expect(weeks.map((w) => w.dataset["week"])).toEqual([
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
    const last = weeks[3] as HTMLElement;
    expect(within(last).getByText("Tydzień od 31 sie")).toBeTruthy();
    expect(within(last).getByText("Lekcje: 1")).toBeTruthy();
    expect(within(last).getByText("Umiejętności do przodu: 0")).toBeTruthy();
    expect(within(last).getByText("Do uwagi: 1")).toBeTruthy();
    expect(within(weeks[0] as HTMLElement).getByText("Bez raportu w tym tygodniu")).toBeTruthy();
    expect(within(weeks[2] as HTMLElement).getByText("Umiejętności do przodu: 1")).toBeTruthy();
  });
});

describe("the report", () => {
  it("shows the newest report's narrative: headline, direction, answers, proposals, asks", async () => {
    await draw(client());
    const report = document.querySelector<HTMLElement>("[data-report]");
    const inReport = within(report as HTMLElement);
    expect(inReport.getByText("Ola dodaje w zakresie 10 coraz pewniej.")).toBeTruthy();
    expect(
      inReport.getByText("W tym tygodniu warto wrócić do odejmowania w zakresie 10."),
    ).toBeTruthy();
    expect(inReport.getByText("Gdzie jest z umiejętnościami")).toBeTruthy();
    expect(inReport.getByText("Na czym skupić się dalej")).toBeTruthy();
    expect(inReport.getByText("Od 25 sierpnia 2026 do 31 sierpnia 2026")).toBeTruthy();
    expect(inReport.getByText("Co Ola przerabia teraz w szkole?")).toBeTruthy();
    // p2 was accepted already: its decision stands in place of its buttons.
    const p2 = report?.querySelector<HTMLElement>("[data-proposal=p2]");
    expect(p2?.dataset["decision"]).toBe("accepted");
    expect(p2?.querySelector("button")).toBeNull();
    expect(within(p2 as HTMLElement).getByText("Przyjęte")).toBeTruthy();
  });

  it("posts a decision, then shows it with the buttons gone", async () => {
    const latest = REPORTS.reports[0] as LearnerReport;
    const patchReport = vi.fn(
      async (): Promise<LearnerReport> => ({
        ...latest,
        decisions: [
          ...latest.decisions,
          {
            proposal_id: "p1",
            decision: "dismissed",
            decided_at: "2026-09-01T08:00:00.000Z",
            decided_by: latest.decisions[0]
              ?.decided_by as LearnerReport["decisions"][0]["decided_by"],
          },
        ],
      }),
    );
    await draw(client({ patchReport }));
    const p1 = document.querySelector<HTMLElement>("[data-proposal=p1]") as HTMLElement;
    fireEvent.click(within(p1).getByRole("button", { name: "Odrzuć" }));
    expect(await within(p1).findByText("Odrzucone")).toBeTruthy();
    expect(patchReport).toHaveBeenCalledWith(LEARNER, latest.id, {
      decisions: [{ proposal_id: "p1", decision: "dismissed" }],
    });
    expect(p1.querySelector("button")).toBeNull();
  });

  it("keeps the buttons and says so when a decision did not save", async () => {
    const patchReport = vi.fn(async (): Promise<LearnerReport> => {
      throw new Error("500");
    });
    await draw(client({ patchReport }));
    const p1 = document.querySelector<HTMLElement>("[data-proposal=p1]") as HTMLElement;
    fireEvent.click(within(p1).getByRole("button", { name: "Przyjmij" }));
    expect(await screen.findByText("Nie udało się zapisać. Spróbuj ponownie.")).toBeTruthy();
    expect(within(p1).getByRole("button", { name: "Przyjmij" })).toHaveProperty("disabled", false);
  });

  it("says a counted report is not written up yet, and offers no decision", async () => {
    await draw(client({ getLearnerReports: vi.fn(async () => ({ reports: [UNWRITTEN] })) }));
    expect(screen.getByText("Raport jest policzony, ale jeszcze nie opisany.")).toBeTruthy();
    expect(document.querySelector("[data-proposal]")).toBeNull();
  });

  it("says 'nothing recorded' for empty answers, proposals and asks", async () => {
    await draw(client({ getLearnerReports: vi.fn(async () => ({ reports: [EMPTY_NARRATIVE] })) }));
    const empty = [
      ...document.querySelectorAll<HTMLElement>("[data-report] [data-nothing-recorded]"),
    ];
    expect(empty.map((e) => e.dataset["nothingRecorded"])).toEqual([
      "answers",
      "proposals",
      "asks",
    ]);
  });

  it("says there is no report yet", async () => {
    await draw(client({ getLearnerReports: vi.fn(async () => ({ reports: [] })) }));
    expect(screen.getByText("Nie ma jeszcze raportu.")).toBeTruthy();
  });
});

describe("the section", () => {
  it("names no level, score, percentage or streak", async () => {
    const section = await draw(client());
    const text = section.textContent ?? "";
    expect(text).not.toMatch(/%|familiar|proficient|mastered|attempted|punkt|seria|streak|score/i);
  });

  it("shows a failed part on its own, and the others", async () => {
    const api = client({ getLearnerSkills: vi.fn(async () => Promise.reject(new Error("500"))) });
    render(<LearnerKnowledge api={api} learner={LEARNER} language="pl" />);
    await screen.findByRole("heading", { name: "Ostatni raport" });
    expect(
      await screen.findByText("Nie udało się wczytać. Odśwież stronę, żeby spróbować ponownie."),
    ).toBeTruthy();
    expect(document.querySelector("[data-part-failed=goals]")).not.toBeNull();
    expect(document.querySelector("[data-part-failed=report]")).toBeNull();
    expect(document.querySelector("[data-week-strip]")).not.toBeNull();
  });

  it("is left out for a client without the knowledge calls", () => {
    const { getLearnerSkills, getLearnerReports, patchReport, ...parentOnly } = client();
    void getLearnerSkills;
    void getLearnerReports;
    void patchReport;
    const { container } = render(
      <LearnerKnowledge api={parentOnly as ParentClient} learner={LEARNER} language="pl" />,
    );
    expect(container.innerHTML).toBe("");
  });
});
