import type { Run } from "@jadwigo/contracts/run";
import { RunEvent, RunId } from "@jadwigo/contracts/run";
import type { RunView } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane } from "../ChatPane.tsx";
import type { Turn } from "../conversation.ts";
import { lessonFacts, wroteLesson } from "./LessonCard.tsx";
import type { ObjectRef } from "./ref.ts";

afterEach(cleanup);

const LESSON: ObjectRef = { kind: "lesson", id: "cnv_00000000000000000000000001" };

/** The happy golden log as a turn, its view changed as the test needs. */
function happyTurn(change: (view: RunView) => void = () => {}): Turn {
  const log = RUN_LOGS.find((l) => l.name === "happy-turn");
  if (log === undefined) throw new Error("no golden log happy-turn");
  const view = structuredClone(log.expected) as RunView;
  change(view);
  const run: Run = {
    id: RunId.parse(RunEvent.parse(log.events[0]).run_id),
    pod_id: "pod_00000000000000000000000001" as Run["pod_id"],
    created_by: "acc_00000000000000000000000001" as Run["created_by"],
    conversation_id: null,
    workflow: "jadwigo-lesson-compose",
    resumes: null,
    status: view.status ?? "completed",
    attempt: 1,
    cancel_requested_at: null,
    idle_deadline_at: null,
    max_deadline_at: "2026-09-01T08:30:00.000Z",
    cap_usd: view.cap_usd ?? 1,
    spent_usd: view.spent_usd,
    created_at: "2026-09-01T08:00:00.000Z",
    completed_at: null,
  };
  return { run, view };
}

function pane(turns: Turn[], onOpen = vi.fn()) {
  render(
    <ChatPane
      language="pl"
      variant="parent"
      turns={turns}
      queued={[]}
      restoring={false}
      stopping={false}
      sendFailed={false}
      onSend={() => {}}
      onStop={() => {}}
      lessonObject={LESSON}
      onOpen={onOpen}
    />,
  );
  return onOpen;
}

const card = () => document.querySelector("[data-object-card='lesson']");

describe("the lesson-ready card (dl-uukj.47.58)", () => {
  it("reads its facts from the turn's own revision: title, questions, version, the first one", () => {
    const lesson = happyTurn().view.lesson;
    if (lesson === null) throw new Error("the happy turn has a lesson");
    const facts = lessonFacts(lesson);
    expect(facts.title).toBe("Równe grupy");
    expect(facts.revision).toBe(2);
    expect(facts.steps).toBeGreaterThan(0);
    expect(facts.first).not.toBeNull();
  });

  it("ends a finished turn that wrote the lesson, and a click opens the lesson", () => {
    const onOpen = pane([happyTurn()]);
    const shown = card();
    expect(shown).not.toBeNull();
    expect(shown?.querySelector("[data-card-title]")?.textContent).toBe("Równe grupy");
    expect(shown?.querySelector("[data-card-facts]")?.textContent).toMatch(/zada.* · Wersja 2/);
    expect(shown?.querySelector("[data-card-first]")?.textContent).toMatch(/^Na początek: /);
    fireEvent.click(screen.getByRole("button", { name: "Otwórz lekcję: Równe grupy" }));
    expect(onOpen).toHaveBeenCalledWith(LESSON);
  });

  it("carries the lesson's actions under the newest card only (dl-uukj.47.55)", () => {
    const first = happyTurn();
    const second = happyTurn();
    second.run = { ...second.run, id: RunId.parse("run_00000000000000000000000002") };
    render(
      <ChatPane
        language="pl"
        variant="parent"
        turns={[first, second]}
        queued={[]}
        restoring={false}
        stopping={false}
        sendFailed={false}
        onSend={() => {}}
        onStop={() => {}}
        lessonObject={LESSON}
        onOpen={() => {}}
        lessonActions={<span data-test-actions>actions</span>}
      />,
    );
    const cards = [...document.querySelectorAll("[data-object-card='lesson']")];
    expect(cards).toHaveLength(2);
    expect(cards[0]?.querySelector("[data-test-actions]")).toBeNull();
    expect(cards[1]?.querySelector("[data-card-actions] [data-test-actions]")).not.toBeNull();
  });

  it("is not drawn while the turn is still open", () => {
    pane([happyTurn((v) => Object.assign(v, { turn_open: true }))]);
    expect(card()).toBeNull();
  });

  it("is not drawn for a turn whose revision no lesson tool wrote, nor without onOpen", () => {
    const parentEdit = happyTurn((v) => {
      v.chat = v.chat.filter((item) => item.kind !== "tool");
    });
    expect(wroteLesson(parentEdit.view)).toBe(false);
    pane([parentEdit]);
    expect(card()).toBeNull();
    cleanup();
    render(
      <ChatPane
        language="pl"
        turns={[happyTurn()]}
        queued={[]}
        restoring={false}
        stopping={false}
        sendFailed={false}
        onSend={() => {}}
        onStop={() => {}}
      />,
    );
    expect(card()).toBeNull();
  });
});
