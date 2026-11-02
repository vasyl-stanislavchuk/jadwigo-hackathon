// @vitest-environment happy-dom
/**
 * Dla kogo in the workspace's details (dl-uukj.47.17; handoff §1 Assignment, §3 Optional selector):
 * with children in the family, "Bez dziecka" opens the same Dla menu as "Zmień" (each child, then
 * "Dodaj dziecko…"), and picking one shows the child with "Zmień"; with none, "Dodaj dziecko" stays.
 */

import { Learner, type LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DlaSelect } from "../newLesson/DlaSelect.tsx";
import { DetailsPanel } from "./DetailsPanel.tsx";

const learner = (id: string, first_name: string) =>
  Learner.parse({
    id,
    pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
    handle: first_name.toLowerCase(),
    first_name,
    age_group: null,
    country: "PL",
    curriculum_id: null,
    school_grade: 1,
    school_language: "pl",
    created_at: "2026-08-01T09:00:00.000Z",
  });
const FAMILY = [
  learner("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq", "Ola"),
  learner("lrn_2h4m8gyw0fb1cvz2nkqw0px8fr", "Kasztan"),
];

/** The panel with Dla held as the workspace holds it, the menu the workspace's own. */
function Held({
  learners,
  onAddChild,
}: {
  learners: readonly Learner[];
  onAddChild: () => void;
}): ReactElement {
  const [forLearner, setForLearner] = useState<LearnerId | null>(null);
  return (
    <DetailsPanel
      language="pl"
      learners={learners}
      child={learners.find((l) => l.id === forLearner) ?? null}
      onAddChild={onAddChild}
      changeMenu={(trigger) => (
        <DlaSelect
          language="pl"
          learners={learners}
          value={forLearner}
          onChange={setForLearner}
          onAddChild={onAddChild}
          trigger={trigger}
        />
      )}
    />
  );
}

afterEach(cleanup);

describe("Dla kogo in the details", () => {
  // First in the file: React says a ref warning once per component (dl-uukj.47.49).
  it("Zmień is ui's Button, and the menu opens on it with no ref warning", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Held learners={FAMILY} onAddChild={vi.fn()} />);
    const change = screen.getByRole("button", { name: "Zmień" });
    expect(change.getAttribute("data-variant")).toBe("outline");
    expect(change.hasAttribute("data-change-child")).toBe(true);
    await act(async () => fireEvent.click(change));
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(change.getAttribute("aria-expanded")).toBe("true");
    const said = errors.mock.calls.map((call) => call.map(String).join(" "));
    errors.mockRestore();
    expect(said.filter((line) => line.includes("cannot be given refs"))).toEqual([]);
  });

  it("opens the Dla menu from Bez dziecka, lists both children, and shows the one picked with Zmień", async () => {
    const onAddChild = vi.fn();
    render(<Held learners={FAMILY} onAddChild={onAddChild} />);
    expect(screen.getByText("Bez dziecka")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dodaj dziecko" })).toBeNull();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zmień" })));
    const menu = screen.getByRole("menu");
    const options = within(menu).getAllByRole("menuitemradio");
    expect(options.map((o) => o.textContent)).toEqual(["Bez dziecka", "Ola", "Kasztan"]);
    expect(within(menu).getByRole("menuitem").textContent).toContain("Dodaj dziecko…");

    await act(async () => fireEvent.click(options[2] as HTMLElement));
    const card = document.querySelector("[data-for-child]") as HTMLElement;
    expect(card.getAttribute("data-for-child")).toBe(FAMILY[1]?.id);
    expect(card.textContent).toContain("Kasztan");
    expect(within(card).getByRole("button", { name: "Zmień" })).toBeTruthy();
  });

  it("keeps Dodaj dziecko when the family has no children yet", async () => {
    const onAddChild = vi.fn();
    render(<Held learners={[]} onAddChild={onAddChild} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Dodaj dziecko" })));
    expect(onAddChild).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Zmień" })).toBeNull();
  });
});
