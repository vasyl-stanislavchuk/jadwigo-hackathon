// @vitest-environment happy-dom
/**
 * The lesson workspace (dl-uukj.47.5, decision dl-xo0q, design review 2026-11-02): the chat alone
 * at first, the lesson opening beside it from the top bar's "Pokaż lekcję", the chat folding to its
 * strip only beside the lesson; no details and no footer; the phone's Lekcja tab marked when the
 * lesson changes behind the chat. Widths and the 68 px line are
 * apps/web/e2e/parent-shell.spec.ts's.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { folds } from "../shell/fold.ts";
import { ChatFoldToggle, LessonToggle, Workspace } from "./Workspace.tsx";

const _ola = {
  id: LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq"),
  first_name: "Ola",
} as unknown as Learner;

function workspace(lessonKey = "a"): void {
  render(
    <>
      {/* The shell's top bar holds the chat's fold button and "Pokaż lekcję" (barLead, barEnd). */}
      <ChatFoldToggle language="pl" />
      <LessonToggle language="pl" />
      <Workspace
        language="pl"
        chat={<p>wiadomości</p>}
        chatBand={<span>stan</span>}
        chatFact="Jadwigo pisze lekcję"
        lessonTitle="Odejmowanie"
        lesson={<ol>kroki</ol>}
        lessonKey={lessonKey}
      />
    </>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  folds.set("chat", true);
  folds.set("lesson", false);
});
afterEach(cleanup);

describe("the workspace's panels", () => {
  it("opens on the chat alone, the lesson shut until Pokaż lekcję (design review 2026-11-02)", async () => {
    workspace();
    const chat = document.getElementById("parent-chat") as HTMLElement;
    expect(chat.getAttribute("data-panel")).toBe("open");
    expect(document.querySelector("[data-chat-body]")?.hasAttribute("data-chat-wide")).toBe(true);
    const lesson = document.getElementById("parent-lesson") as HTMLElement;
    const desktopHidden = () => lesson.className.split(" ").includes("lg:hidden");
    expect(desktopHidden()).toBe(true);
    // Alone, the chat has nothing to fold beside: no fold button yet; no details, no footer.
    expect(screen.queryByRole("button", { name: "Zwiń rozmowę" })).toBeNull();
    expect(document.getElementById("parent-details")).toBeNull();
    expect(document.querySelector("[data-lesson-footer]")).toBeNull();

    const show = screen.getByRole("button", { name: "Pokaż lekcję" });
    expect(show.getAttribute("aria-expanded")).toBe("false");
    expect(show.getAttribute("aria-controls")).toBe("parent-lesson");
    await act(async () => fireEvent.click(show));
    expect(desktopHidden()).toBe(false);
    expect(window.localStorage.getItem("jw.parent.fold.lesson")).toBe("open");
    expect(screen.getByRole("button", { name: "Ukryj lekcję" })).toBeDefined();
    const fold = screen.getByRole("button", { name: "Zwiń rozmowę" });
    expect(fold.getAttribute("aria-controls")).toBe("parent-chat");
  });

  it("folds the chat to its strip beside the open lesson, keeps the run's state on it", async () => {
    folds.set("lesson", true);
    workspace();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zwiń rozmowę" })));
    const chat = document.getElementById("parent-chat") as HTMLElement;
    expect(chat.getAttribute("data-panel")).toBe("folded");
    expect(within(chat).getByText("Jadwigo pisze lekcję")).toBeDefined();
    expect(window.localStorage.getItem("jw.parent.fold.chat")).toBe("folded");
  });

  it("keeps the chat's state for screen readers only", () => {
    workspace();
    const band = document.querySelector("[data-chat-band]") as HTMLElement;
    expect(band.textContent).toBe("stan");
    expect(band.className).toContain("sr-only");
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
        lessonKey="a"
      />,
    );
    rerender(
      <Workspace
        language="pl"
        chat={null}
        chatBand={null}
        lessonTitle=""
        lesson={null}
        lessonKey="b"
      />,
    );
    expect(document.querySelector("[data-changed]")).not.toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("tab", { name: "Lekcja" })));
    expect(document.querySelector("[data-changed]")).toBeNull();
  });
});
