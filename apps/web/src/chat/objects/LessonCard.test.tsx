import type { Run } from "@jadwigo/contracts/run";
import { RunEvent, RunId } from "@jadwigo/contracts/run";
import type { CopyKey } from "@jadwigo/copy";
import type { RunView } from "@jadwigo/core";
import { LESSON_FILES, RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane } from "../ChatPane.tsx";
import type { Turn } from "../conversation.ts";
import { addedSteps, LessonPane } from "../LessonPane.tsx";
import { cardStateOf } from "../spine/card.ts";
import type { LessonCardState } from "../spine/types.ts";
import { LessonCard, lessonChanging, wroteLesson } from "./LessonCard.tsx";
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
  it("is never written with a version, in the card or the superseded row (delta C5)", () => {
    pane([happyTurn()]);
    expect(card()?.textContent).not.toMatch(/wersj|version \d/i);
  });

  it("ends a finished turn that wrote the lesson, and a click opens the lesson", () => {
    const onOpen = pane([happyTurn()]);
    const shown = card();
    expect(shown).not.toBeNull();
    expect(shown?.querySelector("[data-card-title]")?.textContent).toBe("Równe grupy");
    expect(shown?.querySelector("[data-card-facts]")?.textContent).toBe("4 zadania");
    expect(shown?.querySelectorAll("[data-card-prompt]").length).toBe(3);
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

describe("the lesson card (dl-uukj.47.71 S16, S7; the owner's card delta C1-C5)", () => {
  const PROMPTS = ["Ile to 2 × 3?", "Ile to 5 × 4?", "Uzupełnij: 2, 4, 6, …"];
  const PREVIEW = PROMPTS.map((prompt, i) => ({ place: i + 1, prompt }));

  it("ready: the title first, {n} zadań, 3 prompts, +{n} więcej, the Gotowa tag, the actions", () => {
    drawn({ ...BASE, kind: "ready", count: 4, preview: PREVIEW });
    expect(card()?.getAttribute("data-card-state")).toBe("ready");
    expect(card()?.querySelector("[data-card-title]")?.textContent).toBe("Mnożenie przez 2 i 5");
    expect(card()?.querySelector("[data-card-facts]")?.textContent).toBe("4 zadania");
    expect(
      [...(card()?.querySelectorAll("[data-card-prompt]") ?? [])].map((p) => p.textContent),
    ).toEqual(PROMPTS);
    expect(card()?.querySelector("[data-card-more]")?.textContent).toBe("+1 więcej");
    expect(card()?.querySelector("[data-card-tag]")?.textContent).toBe("Gotowa");
    expect(card()?.querySelector("[data-card-actions] [data-test-actions]")).not.toBeNull();
    // No label row, no version, no "Na początek" (C2, C3, C5).
    expect(card()?.textContent).not.toMatch(/Lekcja gotowa|Na początek|wersj/i);
  });

  it("numbers each row by its question, never by its place in the list (dl-uukj.47.71.32)", () => {
    drawn({
      ...BASE,
      kind: "ready",
      count: 4,
      preview: [
        { place: 1, prompt: "Ile to 2 × 3?" },
        { place: 3, prompt: "Ile to 5 × 4?" },
      ],
    });
    expect(
      [...document.querySelectorAll("[data-card-row]")].map((r) => r.getAttribute("data-card-row")),
    ).toEqual(["1", "3"]);
    expect(document.querySelector("[data-card-row='3']")?.textContent).toBe("3Ile to 5 × 4?");
  });

  it("lists at most 3 prompts, and +{n} więcej only when there are more than 3", () => {
    drawn({ ...BASE, kind: "ready", count: 3, preview: PREVIEW });
    expect(card()?.querySelector("[data-card-more]")).toBeNull();
    cleanup();
    drawn({
      ...BASE,
      kind: "ready",
      count: 12,
      preview: [...PREVIEW, { place: 4, prompt: "Czwarte" }],
    });
    expect(card()?.querySelectorAll("[data-card-prompt]").length).toBe(3);
    expect(card()?.querySelector("[data-card-more]")?.textContent).toBe("+9 więcej");
    cleanup();
    // 5 questions, 2 with words to show: the other 3 are "+3 więcej", never "+2" (steward on #808).
    drawn({ ...BASE, kind: "ready", count: 5, preview: PREVIEW.slice(0, 2) });
    expect(card()?.querySelectorAll("[data-card-prompt]").length).toBe(2);
    expect(card()?.querySelector("[data-card-more]")?.textContent).toBe("+3 więcej");
  });

  it("writes its state only in the tag; the tile is always the book; it alone is raised", () => {
    const kinds = [
      { ...BASE, kind: "ready", count: 4, preview: PREVIEW },
      { ...BASE, kind: "working", count: 4, preview: PREVIEW },
      { ...BASE, kind: "fix", count: 4, preview: PREVIEW, findings: [] },
    ] as const;
    const tags = { ready: "Gotowa", working: "Zmieniam…", fix: "Do poprawy" };
    for (const state of kinds) {
      drawn(state);
      const tile = card()?.querySelector("span[aria-hidden] svg");
      expect(tile?.getAttribute("class")).toContain("lucide-book-open");
      expect(card()?.querySelector("[data-card-tag]")?.textContent).toBe(tags[state.kind]);
      for (const other of Object.values(tags).filter((t) => t !== tags[state.kind]))
        expect(card()?.textContent).not.toContain(other);
      expect(document.querySelectorAll(".shadow-card")).toHaveLength(1);
      cleanup();
    }
  });

  it("fix: Do poprawy with its findings, Daj lekcję quiet with a reason, Popraw za mnie", () => {
    const props = drawn({
      ...BASE,
      kind: "fix",
      count: 4,
      preview: PREVIEW,
      findings: [
        { step: 2, words: { copyKey: "chat_line_failed_generic", values: {} } },
        { step: 4, words: { copyKey: "chat_line_check_ok", values: {} } },
      ],
    });
    expect(card()?.querySelector("[data-card-tag]")?.textContent).toBe("Do poprawy");
    expect(card()?.textContent).not.toContain("Gotowa");
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
    fireEvent.click(screen.getByRole("button", { name: "Popraw za mnie" }));
    expect(props.onFix).toHaveBeenCalledTimes(1);
  });

  it("fix: a finding about the whole lesson names no question (dl-uukj.47.71.31)", () => {
    drawn({
      ...BASE,
      kind: "fix",
      count: 4,
      preview: PREVIEW,
      findings: [
        { step: null, words: { copyKey: "chat_finding_no_question", values: {} } },
        { step: 3, words: { copyKey: "chat_finding_key_in_say", values: {} } },
      ],
    });
    expect([...document.querySelectorAll("[data-finding]")].map((f) => f.textContent)).toEqual([
      "W lekcji nie ma jeszcze żadnego pytania.",
      "Zadanie 3. Pytanie zdradza odpowiedź.",
    ]);
  });

  it("fix with questions and no findings says it was not checked, and never asks to wait (dl-uukj.47.71.48)", () => {
    drawn({ ...BASE, kind: "fix", count: 4, preview: PREVIEW, findings: [] });
    const reason = card()?.querySelector("[data-fix-reason]")?.textContent ?? "";
    expect(reason).toBe(
      "Tej lekcji nikt jeszcze nie sprawdził. „Popraw za mnie” sprawdzi ją i poprawi.",
    );
    // It names no question to fix, since none is listed.
    expect(reason).not.toMatch(/zadania będą poprawione|poprawić/);
    const give = card()?.querySelector("[data-give]") as HTMLElement;
    expect(document.getElementById(give.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      reason,
    );
  });

  it("no card state names a version, in pl or en (delta C5, dl-uukj.47.71.52)", () => {
    const states: LessonCardState[] = [
      { ...BASE, kind: "ready", count: 4, preview: PREVIEW },
      { ...BASE, kind: "working", count: 4, preview: PREVIEW },
      {
        ...BASE,
        kind: "fix",
        count: 4,
        preview: PREVIEW,
        findings: [{ step: 2, words: { copyKey: "chat_finding_key_in_say", values: {} } }],
      },
      // The unchecked fix card, whose reason said "Ta wersja" (#858).
      { ...BASE, kind: "fix", count: 4, preview: PREVIEW, findings: [] },
    ];
    for (const language of ["pl", "en"] as const)
      for (const state of states) {
        drawn(state, { language, actions: <span data-test-actions>actions</span> });
        const give = card()?.querySelector("[data-give]");
        const tooltip = document.getElementById(give?.getAttribute("aria-describedby") ?? "");
        const text = `${card()?.textContent ?? ""} ${tooltip?.textContent ?? ""}`;
        expect(text, `${language} ${state.kind}`).not.toMatch(/wersj|version \d/i);
        cleanup();
      }
    // The superseded row says a newer version exists, as the delta draws it, but never its number.
    for (const language of ["pl", "en"] as const) {
      drawn({ ...BASE, kind: "superseded" }, { language, onOpenVersion: () => {} });
      expect(card()?.textContent).not.toMatch(/wersj\w* \d|version \d/i);
      cleanup();
    }
  });

  it("fix with no step to show never says 0 zadań; without onFix there is no Popraw za mnie", () => {
    drawn({ ...BASE, kind: "fix", count: 0, preview: [], findings: [] }, { onFix: undefined });
    expect(card()?.textContent).not.toMatch(/0 zadań|Gotowa/);
    expect(card()?.querySelector("[data-card-facts]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Popraw za mnie" })).toBeNull();
  });

  it("working: Zmieniam…, the current lesson and its actions, no version", () => {
    drawn({ ...BASE, kind: "working", count: 4, preview: PREVIEW });
    expect(card()?.querySelector("[data-card-tag]")?.textContent).toBe("Zmieniam…");
    expect(card()?.querySelectorAll("[data-card-prompt]").length).toBe(3);
    expect(card()?.querySelector("[data-test-actions]")).not.toBeNull();
    expect(card()?.textContent).not.toMatch(/wersj/i);
  });

  it("superseded: one flat row, jest nowsza wersja, no actions or expand; Otwórz tę wersję when given", () => {
    drawn({ ...BASE, kind: "superseded" });
    expect(card()?.getAttribute("data-card-state")).toBe("superseded");
    expect(card()?.textContent).toBe("Mnożenie przez 2 i 5· jest nowsza wersja");
    expect(card()?.classList.contains("shadow-card")).toBe(false);
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

  it("from a revision with no step that reads: Do poprawy, never 0 zadań (dl-uukj.47.69)", () => {
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
    expect(card()?.textContent).not.toMatch(/Gotowa|0 zadań/);
  });
});

describe("what the preview says while the lesson changes (S20)", () => {
  it("says the lesson is changing only while a writing call runs in the open turn", () => {
    expect(lessonChanging([happyTurn()])).toBe(false);
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
    expect(lessonChanging([writing])).toBe(true);
    const thinking = happyTurn((v) => {
      v.turn_open = true;
    });
    expect(lessonChanging([thinking])).toBe(false);
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

/** happy-turn carrying `file` and a lesson_check that found `findings` on it. */
function checked(file: Record<string, unknown>, findings: Record<string, unknown>[]): RunEvent[] {
  const log = RUN_LOGS.find((l) => l.name === "happy-turn");
  if (log === undefined) throw new Error("no golden log happy-turn");
  return log.events
    .map((e) => RunEvent.parse(e))
    .map((e) =>
      e.type === "lesson_revision"
        ? ({ ...e, payload: { ...e.payload, lesson_file: file } } as RunEvent)
        : e.type === "tool_result" && e.payload.verb === "lesson_check"
          ? ({
              ...e,
              payload: { ...e.payload, output: { publishable: false, findings } },
            } as RunEvent)
          : e,
    );
}

/** multiplication-times-four: s06 is its 6th step and 3rd question (s01, s04, s05 are narration). */
function timesFour(change: (steps: Record<string, unknown>[]) => void = () => {}) {
  const file = structuredClone(
    LESSON_FILES.find((f) => (f as { id: string }).id === "multiplication-times-four"),
  ) as { script: { parts: { steps: Record<string, unknown>[] }[] } };
  change(file.script.parts.flatMap((p) => p.steps));
  return file as unknown as Record<string, unknown>;
}

const finding = (step_id: string) => ({
  step_id,
  path: "",
  level: "warn",
  rule: "key-in-say",
  text: "x",
  fix: "y",
});

describe("one question number everywhere: the card, its findings and the preview modal (dl-uukj.47.71.32)", () => {
  /** The number the card's findings give a step, its card row's, and the modal's row for it. */
  function numbers(file: Record<string, unknown>, step_id: string) {
    const state = cardStateOf(checked(file, [finding(step_id), finding(`${step_id}t`)]));
    if (state?.kind !== "fix") throw new Error("expected a fix card");
    drawn(state);
    const row = (prompt: string) =>
      [...document.querySelectorAll("[data-card-row]")]
        .find((r) => r.textContent?.endsWith(prompt))
        ?.getAttribute("data-card-row");
    const cardRow = row(
      state.preview.find((p) => p.prompt.startsWith("Ile jest kwiatków"))?.prompt ?? "",
    );
    cleanup();
    const lesson = { revision: 1, lesson_file: file } as NonNullable<RunView["lesson"]>;
    render(<LessonPane language="pl" lesson={lesson} />);
    const paneRow = document.querySelector(`[data-step='${step_id}'] .tabular-nums`)?.textContent;
    cleanup();
    return { findings: state.findings.map((f) => f.step), cardRow, paneRow };
  }

  it("a question after narration steps, and its twin, carry its modal row number", () => {
    const { findings, cardRow, paneRow } = numbers(timesFour(), "s06");
    expect(paneRow).toBe("3");
    expect(cardRow).toBe("3");
    expect(findings).toEqual([3, 3]);
  });

  it("a step that cannot be drawn yet keeps its row, so nothing after it renumbers (steward on #814)", () => {
    const file = timesFour((steps) => {
      const s03 = steps.find((s) => s["id"] === "s03");
      if (s03 !== undefined) (s03["question"] as Record<string, unknown>)["family"] = "nope";
    });
    const { findings, cardRow, paneRow } = numbers(file, "s06");
    expect(paneRow).toBe("3");
    expect(cardRow).toBe("3");
    expect(findings).toEqual([3, 3]);
    // A finding on the step that cannot be drawn reads its own row's number, 2.
    const state = cardStateOf(checked(file, [finding("s03")]));
    expect(state?.kind === "fix" ? state.findings.map((f) => f.step) : null).toEqual([2]);
    render(
      <LessonPane
        language="pl"
        lesson={{ revision: 1, lesson_file: file } as NonNullable<RunView["lesson"]>}
      />,
    );
    expect(document.querySelector("[data-step='s03'] .tabular-nums")?.textContent).toBe("2");
  });

  it("an empty prompt before it renumbers nothing", () => {
    const file = timesFour((steps) => {
      const s03 = steps.find((s) => s["id"] === "s03");
      if (s03 !== undefined) s03["say"] = { pl: "", uk: "", en: "" };
    });
    const { findings, cardRow, paneRow } = numbers(file, "s06");
    expect(paneRow).toBe("3");
    expect(cardRow).toBe("3");
    expect(findings).toEqual([3, 3]);
  });
});

describe("the ready card's title (dl-1eieq.16)", () => {
  const ready = {
    lessonId: "les_1",
    version: 1,
    title: "Dodawanie",
    count: 3,
    preview: [{ place: 1, prompt: "2 + 2" }],
    kind: "ready",
  } as const;
  const object = { kind: "lesson", id: "les_1" } as never;
  function card(onRename: (title: string) => Promise<CopyKey | null>) {
    render(
      <LessonCard
        state={ready}
        object={object}
        language="pl"
        onOpen={() => {}}
        onRename={onRename}
      />,
    );
    fireEvent.click(document.querySelector("[data-card-title]") as HTMLElement);
    return document.querySelector("[data-card-title-field]") as HTMLInputElement;
  }

  it("saves on Enter and shows the new words at once", async () => {
    const onRename = vi.fn(async () => null);
    const field = card(onRename);
    fireEvent.change(field, { target: { value: " Dodawanie do 20 " } });
    await act(async () => fireEvent.keyDown(field, { key: "Enter" }));
    expect(onRename).toHaveBeenCalledExactlyOnceWith("Dodawanie do 20");
    expect(document.querySelector("[data-card-title]")?.textContent).toBe("Dodawanie do 20");
  });

  it("keeps the title on Esc, or when nothing changed or nothing is left", async () => {
    const onRename = vi.fn(async () => null);
    const field = card(onRename);
    fireEvent.change(field, { target: { value: "Inne" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(document.querySelector("[data-card-title]")?.textContent).toBe("Dodawanie");
    fireEvent.click(document.querySelector("[data-card-title]") as HTMLElement);
    const again = document.querySelector("[data-card-title-field]") as HTMLInputElement;
    fireEvent.change(again, { target: { value: "   " } });
    fireEvent.blur(again);
    expect(onRename).not.toHaveBeenCalled();
  });

  it("puts the old words back and says why when it is refused", async () => {
    const field = card(async () => "parent_title_refused");
    fireEvent.change(field, { target: { value: "Inne" } });
    await act(async () => fireEvent.blur(field));
    expect(document.querySelector("[data-card-title]")?.textContent).toBe("Dodawanie");
    expect(document.querySelector("[data-card-title-problem]")?.textContent).toBe(
      "Tego tytułu nie możemy użyć. Spróbuj innych słów.",
    );
  });

  it("is plain words on a card that is not ready, or with nothing to save through", () => {
    render(<LessonCard state={ready} object={object} language="pl" onOpen={() => {}} />);
    expect(document.querySelector("[data-card-title]")?.tagName).toBe("SPAN");
  });
});
