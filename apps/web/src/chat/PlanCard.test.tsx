/**
 * The steward's findings on the plan card and the tool lines (dl-uukj.47.50): the plan pins as a
 * direct sticky child of the scrolling list; a plan-only turn counts as Jadwigo AI having spoken;
 * an opened line shows the widget or the line in plain words, never only the state word; each
 * verb's icon and the input sentences are pinned.
 */

import type { Run } from "@jadwigo/contracts/run";
import { RunEvent, RunId } from "@jadwigo/contracts/run";
import { foldRun, type RunView } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { cleanup, render, screen } from "@testing-library/react";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Eye,
  LayoutList,
  Lightbulb,
  NotebookPen,
  PencilLine,
  Search,
  Target,
} from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane, type ChatPaneProps } from "./ChatPane.tsx";
import type { Turn } from "./conversation.ts";
import type { RunPhase } from "./phase.ts";
import { sentenceOf, TOOL_ICON } from "./toolLine.ts";

afterEach(cleanup);

const runOf = (id: string, status: Run["status"]): Run =>
  ({ id: RunId.parse(id), status }) as unknown as Run;

/** A golden log folded up to `seq`, changed by `change`, as one turn. */
function turnAt(name: string, seq: number, change: (view: RunView) => void = () => {}): Turn {
  const log = (RUN_LOGS.find((l) => l.name === name)?.events ?? []).map((e) => RunEvent.parse(e));
  const view = foldRun(log.filter((e) => e.seq <= seq));
  change(view);
  return { run: runOf(log[0]?.run_id ?? "", view.status ?? "queued"), view };
}

function pane(props: Partial<ChatPaneProps>) {
  render(
    <ChatPane
      language="pl"
      turns={[]}
      queued={[]}
      restoring={false}
      stopping={false}
      sendFailed={false}
      onSend={vi.fn()}
      onStop={vi.fn()}
      {...props}
    />,
  );
}

const scroller = () => screen.getByRole("list", { name: "Wiadomości" });

describe("the plan pins (dl-uukj.47.50)", () => {
  it("is a direct sticky child of the scrolling list while the turn runs, however many lines follow", () => {
    pane({
      turns: [
        turnAt("plan-and-cite", 15, (view) => {
          // Enough tool lines after the plan to overflow the list.
          const tool = view.chat.find((c) => c.kind === "tool");
          if (tool?.kind !== "tool") throw new Error("no tool line");
          for (let i = 0; i < 20; i += 1)
            view.chat.push({ ...tool, call_id: `call_x${i}`, seq: 100 + i });
        }),
      ],
    });
    const row = document.querySelector("[data-plan-row]") as HTMLElement;
    expect(row.parentElement).toBe(scroller());
    expect(row.className).toContain("sticky");
    expect(row.className).toContain("top-0");
    expect(row.querySelector("[data-plan='open']")).not.toBeNull();
    // The lines come after it in the same scroller, so they scroll beneath it.
    expect(scroller().querySelectorAll("[data-tool]").length).toBeGreaterThan(20);
  });

  it("stops pinning once the turn ends and the card folds", () => {
    pane({
      turns: [
        turnAt("plan-and-cite", 15, (view) => {
          view.turn_open = false;
          view.status = "completed";
        }),
      ],
    });
    const row = document.querySelector("[data-plan-row]") as HTMLElement;
    expect(row.className).not.toContain("sticky");
  });

  it("a plan-only turn counts as Jadwigo AI having spoken: one header, over the plan", () => {
    const turn = turnAt("plan-and-cite", 3);
    expect(turn.view.chat.every((c) => c.kind === "message" && c.from === "parent")).toBe(true);
    const phase: RunPhase = {
      kind: "thinking",
      copyKey: "chat_phase_thinking",
      since: 0,
      open: true,
      run: turn.run.id,
    };
    pane({ turns: [turn], phase, now: 0 });
    const headers = document.querySelectorAll("[data-ai-header]");
    expect(headers).toHaveLength(1);
    expect(headers[0]?.closest("[data-plan-row]")).not.toBeNull();
  });
});

describe("an opened tool line shows what was done (dl-uukj.47.50)", () => {
  const opened = (verb: string) =>
    document.querySelector(`[data-tool-group] [data-tool='${verb}'] [data-tool-line] > div`);

  it("draws a kept-visible widget (lesson_check) inside the opened line, not only the state word", () => {
    pane({
      turns: [
        turnAt("happy-turn", 17, (view) => {
          const check = view.chat.find((c) => c.kind === "tool" && c.verb === "lesson_check");
          if (check?.kind === "tool")
            check.view = { kind: "lesson_check", data: { publishable: true, findings: [] } };
        }),
      ],
    });
    expect(opened("lesson_check")?.querySelector("[data-widget='lesson_check']")).not.toBeNull();
    expect(opened("lesson_check")?.querySelector("[data-what-done]")).toBeNull();
  });

  it("says a line with no widget in plain words: its sentence and its state", () => {
    pane({ turns: [turnAt("happy-turn", 17)] });
    const words = opened("lesson_draft")?.querySelector("[data-what-done]");
    expect(words?.textContent).toBe("Układanie lekcji o: equal groupsgotowe");
    expect([...(words?.children ?? [])].map((c) => c.textContent)).toEqual([
      "Układanie lekcji o: equal groups",
      "gotowe",
    ]);
  });
});

describe("each verb's icon and sentence (dl-uukj.47.50)", () => {
  it("pins the verb-to-icon map", () => {
    expect(TOOL_ICON).toEqual({
      question_search: Search,
      lesson_draft: LayoutList,
      lesson_edit: PencilLine,
      lesson_check: ClipboardCheck,
      lesson_show: Eye,
      learner_skills: Target,
      learner_week: CalendarDays,
      learner_mistakes: NotebookPen,
      curriculum_topics: BookOpen,
      lesson_ideas: Lightbulb,
    });
  });

  it("builds the sentences of question_search, lesson_edit, lesson_show and curriculum_topics from their input", () => {
    expect(sentenceOf("question_search", { words: " odejmowanie do 20 " })).toEqual({
      key: "chat_tool_question_search_about",
      vars: { topic: "odejmowanie do 20" },
    });
    expect(sentenceOf("lesson_edit", { step_id: "s03" })).toEqual({
      key: "chat_tool_lesson_edit_step",
      vars: { step: "s03" },
    });
    expect(sentenceOf("lesson_show", { step_id: "s02" })).toEqual({
      key: "chat_tool_lesson_show_step",
      vars: { step: "s02" },
    });
    expect(sentenceOf("curriculum_topics", { words: "ułamki" })).toEqual({
      key: "chat_tool_curriculum_topics_about",
      vars: { topic: "ułamki" },
    });
    // Nothing to say with: the verb's plain sentence.
    expect(sentenceOf("question_search", { words: "  " }).vars).toEqual({});
    expect(sentenceOf("lesson_edit", undefined).vars).toEqual({});
  });
});
