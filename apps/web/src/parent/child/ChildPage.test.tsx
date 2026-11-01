// @vitest-environment happy-dom
/**
 * A child's page (dl-uukj.47.3, decision dl-xo0q): the header with the disc, the name, the class
 * and "Nowa lekcja dla" as the page's own action; the four agreed tabs; Przegląd holding the child's
 * lessons as the old home's card did; the other tabs a muted line until their content is decided.
 */

import type { ParentClient } from "@jadwigo/api-client";
import { AttemptId, type Learner, type LearnerAttempts, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
    const action = within(header).getByRole("link", { name: "Nowa lekcja dla: Ola" });
    expect(action.getAttribute("href")).toBe(`/parent?for=${OLA}`);
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
