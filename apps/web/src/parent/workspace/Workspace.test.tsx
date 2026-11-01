// @vitest-environment happy-dom
/**
 * The lesson workspace (dl-uukj.47.5, decision dl-xo0q): chat open and details folded at first,
 * each folding to a strip with its name and one fact and remembered per device; the lesson footer's
 * one primary following the child and quiet with its reason until the lesson is ready; the phone's
 * Lekcja tab marked when the lesson changes behind the chat. Widths and the 68 px line are
 * apps/web/e2e/parent-shell.spec.ts's.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { folds } from "../shell/fold.ts";
import { LessonFooter } from "./LessonFooter.tsx";
import { Workspace } from "./Workspace.tsx";

const ola = {
  id: LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq"),
  first_name: "Ola",
} as unknown as Learner;

function workspace(lessonKey = "a"): void {
  render(
    <Workspace
      language="pl"
      chat={<p>wiadomości</p>}
      chatBand={<span>stan</span>}
      chatFact="Jadwigo pisze lekcję"
      lessonTitle="Odejmowanie"
      lesson={<ol>kroki</ol>}
      lessonFooter={<footer>stopka</footer>}
      lessonKey={lessonKey}
      details={<p>szczegóły</p>}
      detailsFact="Bez dziecka"
    />,
  );
}

beforeEach(() => {
  folds.set("chat", true);
  folds.set("details", false);
  window.localStorage.clear();
});
afterEach(cleanup);

describe("the workspace's panels", () => {
  it("opens the chat and folds the details to a strip with its name and who it is for", () => {
    workspace();
    expect(document.getElementById("parent-chat")?.getAttribute("data-panel")).toBe("open");
    const details = document.getElementById("parent-details") as HTMLElement;
    expect(details.getAttribute("data-panel")).toBe("folded");
    expect(within(details).getByText("Szczegóły lekcji")).toBeDefined();
    expect(within(details).getByText("Bez dziecka")).toBeDefined();
    const unfold = within(details).getByRole("button", { name: "Rozwiń szczegóły" });
    expect(unfold.getAttribute("aria-expanded")).toBe("false");
    expect(unfold.getAttribute("aria-controls")).toBe("parent-details");
  });

  it("folds the chat to its strip, keeps the run's state on it, and remembers the choice", async () => {
    workspace();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zwiń rozmowę" })));
    const chat = document.getElementById("parent-chat") as HTMLElement;
    expect(chat.getAttribute("data-panel")).toBe("folded");
    expect(within(chat).getByText("Jadwigo pisze lekcję")).toBeDefined();
    expect(window.localStorage.getItem("jw.parent.fold.chat")).toBe("folded");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Rozwiń szczegóły" })),
    );
    expect(window.localStorage.getItem("jw.parent.fold.details")).toBe("open");
    expect(screen.getByText("szczegóły")).toBeDefined();
  });

  it("puts the chat's band under the messages and the footer under the steps", () => {
    workspace();
    expect(document.querySelector("[data-chat-band]")?.textContent).toBe("stan");
    const column = document.querySelector("[data-lesson-column]") as HTMLElement;
    expect(column.lastElementChild?.textContent).toBe("stopka");
  });

  it("marks the phone's Lekcja tab when the lesson changes while the chat is in front", async () => {
    workspace("a");
    expect(document.querySelector("[data-changed]")).toBeNull();
    cleanup();
    const { rerender } = render(
      <Workspace
        language="pl"
        chat={null}
        chatBand={null}
        lessonTitle=""
        lesson={null}
        lessonFooter={null}
        lessonKey="a"
        details={null}
      />,
    );
    rerender(
      <Workspace
        language="pl"
        chat={null}
        chatBand={null}
        lessonTitle=""
        lesson={null}
        lessonFooter={null}
        lessonKey="b"
        details={null}
      />,
    );
    expect(document.querySelector("[data-changed]")).not.toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("tab", { name: "Lekcja" })));
    expect(document.querySelector("[data-changed]")).toBeNull();
  });
});

describe("the lesson footer", () => {
  it("keeps Daj lekcję quiet with the reason in the status line until the lesson is ready", () => {
    const give = vi.fn();
    render(
      <LessonFooter
        language="pl"
        status="Gotowe zadania: 3 z 6"
        ready={false}
        child={null}
        onSave={() => {}}
        onGive={give}
      />,
    );
    const primary = screen.getByRole("button", { name: "Daj lekcję" });
    expect(primary.getAttribute("aria-disabled")).toBe("true");
    const status = document.querySelector("[data-status]") as HTMLElement;
    expect(status.textContent).toContain("Gotowe zadania: 3 z 6");
    expect(status.textContent).toContain("zadziała, gdy lekcja przejdzie sprawdzenie");
    expect(primary.getAttribute("aria-describedby")).toBe(status.id);
    fireEvent.click(primary);
    expect(give).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Zapisz na później" })).toBeDefined();
  });

  it("says Pokaż with the child, and gives the lesson once it is ready", () => {
    const give = vi.fn();
    render(
      <LessonFooter
        language="pl"
        status="Gotowe"
        ready
        child={ola}
        onSave={() => {}}
        onGive={give}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pokaż: Ola" }));
    expect(give).toHaveBeenCalledOnce();
    expect(document.querySelector("[data-status]")?.textContent).toBe("Gotowe");
  });
});
