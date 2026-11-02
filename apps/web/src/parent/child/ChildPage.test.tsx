// @vitest-environment happy-dom
/**
 * A child's page (dl-uukj.47.3, decision dl-xo0q): the header with the disc, the name, the class
 * and "Nowa lekcja · {name}" as the page's own action; the four agreed tabs; Przegląd holding the child's
 * lessons as the old home's card did; the other tabs a muted line until their content is decided.
 */

import type { ParentClient } from "@jadwigo/api-client";
import { AttemptId, type Learner, type LearnerAttempts, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NO_GOALS } from "../learner/fixtures.ts";
import { ChildPage } from "./ChildPage.tsx";

const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const ATTEMPT = AttemptId.parse("att_43007b83dp9w2tnfjxhha74cyq");
const ola = { id: OLA, first_name: "Ola", school_grade: 2 } as unknown as Learner;

const empty = async () => {
  throw new Error("not in this test");
};
const api = {
  getLearnerAttempts: async () =>
    ({
      learner: ola,
      attempts: [
        {
          attempt: { id: ATTEMPT, started_at: "2026-10-28T14:02:06.274Z" },
          title: "Równe grupy",
          results: [],
        },
      ],
    }) as unknown as LearnerAttempts,
  getLearnerSkills: empty,
  getLearnerWeek: empty,
  getLearnerReports: empty,
} as unknown as ParentClient;

afterEach(cleanup);

describe("ChildPage", () => {
  it("heads the page with the name, the class and the page's own new-lesson action", async () => {
    await act(async () => {
      render(<ChildPage api={api} learner={ola} language="pl" />);
    });
    const header = document.querySelector("[data-child-header]") as HTMLElement;
    expect(within(header).getByRole("heading", { name: "Ola" })).toBeDefined();
    expect(header.textContent).toContain("2 kl.");
    const action = within(header).getByRole("link", { name: "Nowa lekcja · Ola" });
    expect(action.getAttribute("href")).toBe(`/parent?for=${OLA}`);
  });

  it("stands on the wide page with the disc in the child's tone and one primary (dl-uukj.47.67 §8)", async () => {
    await act(async () => {
      render(<ChildPage api={api} learner={ola} language="pl" tone={3} />);
    });
    const page = document.querySelector("[data-learner-card]") as HTMLElement;
    expect(page.className).toContain("max-w-240");
    const disc = page.querySelector("[data-child-header] [data-slot=disc]") as HTMLElement;
    expect(disc.className).toContain("size-8");
    expect(disc.className).toContain("jw-tone-3");
    expect(document.querySelectorAll("[data-slot=button][data-variant=default]")).toHaveLength(1);
  });

  it("has the four agreed tabs, Przegląd first with the child's lessons", async () => {
    await act(async () => {
      render(<ChildPage api={api} learner={ola} language="pl" />);
    });
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["Przegląd", "Umiejętności", "Lekcje", "Historia"]);
    expect(await screen.findByText("Równe grupy")).toBeDefined();
    expect(document.querySelector(`li[data-attempt="${ATTEMPT}"]`)).not.toBeNull();
  });

  it("shows a child added this week this week's card and one muted line, nothing more (dl-uukj.47.22)", async () => {
    const added = { ...ola, created_at: "2026-09-01T07:00:00.000Z" } as Learner;
    const fresh = {
      getLearnerAttempts: async () => ({ learner: added, attempts: [] }),
      getLearnerSkills: async () => NO_GOALS,
      getLearnerReports: async () => ({ reports: [] }),
      patchReport: empty,
    } as unknown as ParentClient;
    await act(async () => {
      render(<ChildPage api={fresh} learner={added} language="pl" />);
    });
    const panel = screen.getByRole("tabpanel");
    await within(panel).findByRole("heading", { name: "Tydzień po tygodniu" });
    expect(panel.querySelectorAll("[data-week]")).toHaveLength(1);
    const line = within(panel).getByText(
      "Tu pojawi się tydzień po tygodniu, jak idzie nauka, po pierwszej lekcji.",
    );
    expect(line.className).toContain("text-jw-ink-soft");
    expect(panel.textContent).not.toContain("Nie ma jeszcze raportu.");
    expect(panel.textContent).not.toContain("Jeszcze nie ma tu lekcji.");
  });

  it("shows each other tab's place with one muted line", async () => {
    await act(async () => {
      render(<ChildPage api={api} learner={ola} language="pl" />);
    });
    const history = screen.getByRole("tab", { name: "Historia" });
    await act(async () => {
      fireEvent.mouseDown(history);
      fireEvent.click(history);
    });
    expect(screen.getByRole("tabpanel").textContent).toContain("Tu pojawi się każda lekcja");
  });
});
