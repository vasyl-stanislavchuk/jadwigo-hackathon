import type { Run } from "@jadwigo/contracts/run";
import { RunEvent, RunId } from "@jadwigo/contracts/run";
import type { RunView } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane } from "../ChatPane.tsx";
import type { Turn } from "../conversation.ts";
import { addedSteps } from "../LessonPane.tsx";
import type { LessonCardState } from "../spine/types.ts";
import { comingVersion, LessonCard, lessonFacts, wroteLesson } from "./LessonCard.tsx";
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
    fireEvent.click(screen.getByRole("button", { name: "Podgląd lekcji: Równe grupy" }));
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

/** One card drawn from its state, as lane B mounts it. */
function drawn(state: LessonCardState, more: Partial<Parameters<typeof LessonCard>[0]> = {}) {
  const props = { onOpen: vi.fn(), onFix: vi.fn(), ...more };
  render(
    <LessonCard
      state={state}
      object={LESSON}
      language="pl"
      actions={<span data-test-actions>actions</span>}
      {...props}
    />,
  );
  return props;
}

const BASE = { lessonId: LESSON.id, version: 2, title: "Mnożenie przez 2 i 5" };

describe("the lesson card's 4 states (dl-uukj.47.71 S16, S7)", () => {
  it("ready: Lekcja gotowa, its facts, the first question and the actions", () => {
    drawn({ ...BASE, kind: "ready", count: 4, first: "Ile to 2 × 3?" });
    expect(card()?.getAttribute("data-card-state")).toBe("ready");
    expect(card()?.querySelector("[data-card-label]")?.textContent).toBe("Lekcja gotowa");
    expect(card()?.querySelector("[data-card-facts]")?.textContent).toBe("4 zadania · Wersja 2");
    expect(card()?.querySelector("[data-card-first]")?.textContent).toBe(
      "Na początek: Ile to 2 × 3?",
    );
    expect(card()?.querySelector("[data-card-actions] [data-test-actions]")).not.toBeNull();
  });

  it("fix: Lekcja do poprawy with its findings, Daj lekcję quiet with a reason, Popraw za mnie", () => {
    const props = drawn({
      ...BASE,
      kind: "fix",
      count: 4,
      findings: [
        { step: 2, words: { copyKey: "chat_line_failed_generic", values: {} } },
        { step: 4, words: { copyKey: "chat_line_check_ok", values: {} } },
      ],
    });
    const text = card()?.textContent ?? "";
    expect(text).toContain("Lekcja do poprawy");
    expect(text).not.toContain("Lekcja gotowa");
    const findings = [...(card()?.querySelectorAll("[data-finding]") ?? [])];
    expect(findings.map((f) => f.textContent)).toEqual([
      "Zadanie 2. Ten krok się nie udał, poszłam dalej bez niego",
      "Zadanie 4. Sprawdziłam lekcję: wszystko w porządku",
    ]);
    // The fix foot takes the place of the actions.
    expect(card()?.querySelector("[data-test-actions]")).toBeNull();
    const give = card()?.querySelector("[data-give]") as HTMLElement;
    expect(give.getAttribute("aria-disabled")).toBe("true");
    expect(give.hasAttribute("disabled")).toBe(false);
    expect(document.getElementById(give.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "Najpierw trzeba poprawić 2 zadania.",
    );
    expect(card()?.querySelector("[data-fix-reason]")?.textContent).toBe(
      "Daj lekcję będzie można, gdy zadania będą poprawione.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Popraw za mnie" }));
    expect(props.onFix).toHaveBeenCalledTimes(1);
  });

  it("fix with no step to show never says 0 zadań; without onFix there is no Popraw za mnie", () => {
    drawn({ ...BASE, kind: "fix", count: 0, findings: [] }, { onFix: undefined });
    const text = card()?.textContent ?? "";
    expect(text).not.toMatch(/0 zadań/);
    expect(text).not.toContain("Lekcja gotowa");
    expect(card()?.querySelector("[data-card-facts]")?.textContent).toBe("Wersja 2");
    expect(screen.queryByRole("button", { name: "Popraw za mnie" })).toBeNull();
  });

  it("working: names the version that stands and the one coming; its actions still give", () => {
    drawn({ ...BASE, kind: "working", nextVersion: 3, count: 4, first: "Ile to 2 × 3?" });
    expect(card()?.querySelector("[data-card-label]")?.textContent).toBe(
      "Wersja 2 · Jadwigo robi wersję 3",
    );
    expect(card()?.querySelector("[data-test-actions]")).not.toBeNull();
  });

  it("superseded: one row with no actions and no expand; Otwórz tę wersję only when given", () => {
    drawn({ ...BASE, kind: "superseded" });
    expect(card()?.getAttribute("data-card-state")).toBe("superseded");
    expect(card()?.textContent).toBe("Mnożenie przez 2 i 5wersja 2 · jest nowsza");
    expect(card()?.querySelector("[data-test-actions]")).toBeNull();
    expect(card()?.querySelector("[data-expand]")).toBeNull();
    cleanup();
    const onOpenVersion = vi.fn();
    drawn({ ...BASE, kind: "superseded" }, { onOpenVersion });
    fireEvent.click(screen.getByRole("button", { name: "Otwórz tę wersję" }));
    expect(onOpenVersion).toHaveBeenCalledTimes(1);
  });

  it("from a revision alone: ready, never superseded, since only the run knows the newest", () => {
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
    const states = [...document.querySelectorAll("[data-object-card='lesson']")].map((c) =>
      c.getAttribute("data-card-state"),
    );
    expect(states).toEqual(["ready", "ready"]);
  });

  it("from a revision with no step that reads: Lekcja do poprawy, never 0 zadań (dl-uukj.47.69)", () => {
    const lesson = happyTurn().view.lesson;
    if (lesson === null) throw new Error("the happy turn has a lesson");
    render(
      <LessonCard
        lesson={{ ...lesson, lesson_file: { title: "Pusta" } }}
        object={LESSON}
        language="pl"
        onOpen={() => {}}
        actions={<span data-test-actions>actions</span>}
      />,
    );
    expect(card()?.getAttribute("data-card-state")).toBe("fix");
    expect(card()?.textContent).not.toMatch(/Lekcja gotowa|0 zadań/);
  });
});

describe("what the preview says while the lesson changes (S20)", () => {
  it("names the version coming only while a writing call runs in the open turn", () => {
    expect(comingVersion([happyTurn()])).toBeUndefined();
    const writing = happyTurn((v) => {
      v.turn_open = true;
      const call = v.chat.findLast((i) => i.kind === "tool" && i.verb === "lesson_edit");
      if (call?.kind === "tool") call.state = "running";
      else
        v.chat.push({
          ...(v.chat.find((i) => i.kind === "tool") as Extract<
            RunView["chat"][number],
            { kind: "tool" }
          >),
          verb: "lesson_edit",
          state: "running",
        });
    });
    expect(comingVersion([writing])).toBe(3);
    const thinking = happyTurn((v) => {
      v.turn_open = true;
    });
    expect(comingVersion([thinking])).toBeUndefined();
  });

  it("tells added steps from changed ones by the revision before", () => {
    const turn = happyTurn((v) => {
      v.previous_lesson = v.lesson;
    });
    expect([...addedSteps([turn], new Set(["s02", "s99"]))]).toEqual(["s99"]);
    // With nothing before it, no step reads as new.
    const alone = happyTurn((v) => {
      v.previous_lesson = null;
    });
    expect(addedSteps([alone], new Set(["s99"])).size).toBe(0);
  });
});
