import { AttachmentId, ID_PREFIXES, idOf } from "@jadwigo/contracts";
import type { Run } from "@jadwigo/contracts/run";
import { RUN_ERROR_TYPE, RunEvent, RunId } from "@jadwigo/contracts/run";
import { foldRun, type RunView } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane, type ChatPaneProps } from "./ChatPane.tsx";
import type { Turn } from "./conversation.ts";
import { LessonPane } from "./LessonPane.tsx";
import type { ObjectRef } from "./objects/ref.ts";
import type { RunPhase } from "./phase.ts";

afterEach(cleanup);

/** A golden log by name (`packages/testing/src/runs/`): its events parsed, its expected view. */
function golden(name: string): { run_id: RunId; view: RunView; events: RunEvent[] } {
  const log = RUN_LOGS.find((l) => l.name === name);
  if (log === undefined) throw new Error(`no golden log ${name}`);
  const events = log.events.map((e) => RunEvent.parse(e));
  const first = events[0] as RunEvent;
  return { run_id: first.run_id, view: structuredClone(log.expected) as RunView, events };
}

function turnOf(name: string, change: (view: RunView) => void = () => {}): Turn {
  const { run_id, view, events } = golden(name);
  change(view);
  const status = view.status ?? "queued";
  const run: Run = {
    id: RunId.parse(run_id),
    pod_id: "pod_00000000000000000000000001" as Run["pod_id"],
    created_by: "acc_00000000000000000000000001" as Run["created_by"],
    conversation_id: null,
    workflow: "jadwigo-lesson-compose",
    resumes: null,
    status,
    attempt: 1,
    cancel_requested_at: null,
    idle_deadline_at: null,
    max_deadline_at: "2026-09-01T08:30:00.000Z",
    cap_usd: view.cap_usd ?? 1,
    spent_usd: view.spent_usd,
    created_at: "2026-09-01T08:00:00.000Z",
    completed_at: null,
  };
  return { run, view, events };
}

/** What the old thread drew and the spine replaces (dl-uukj.47.71.3): none of it is in the DOM. */
function noOldRows() {
  for (const old of [
    "[data-tool-group]",
    "[data-tools]",
    "[data-plan]",
    "[data-activity]",
    "[data-row='error']",
    "[data-card='plain']",
  ])
    expect(document.querySelector(old)).toBeNull();
  const chat = screen.getByRole("list", { name: "Wiadomości" });
  expect(chat.textContent).not.toContain("Szczegóły");
  expect(chat.textContent).not.toMatch(/[a-z_]+\(|\{|"[a-z_]+":/);
}

function pane(props: Partial<ChatPaneProps> = {}) {
  const onSend = vi.fn();
  const onStop = vi.fn();
  render(
    <ChatPane
      language="pl"
      turns={[]}
      queued={[]}
      restoring={false}
      stopping={false}
      sendFailed={false}
      onSend={onSend}
      onStop={onStop}
      {...props}
    />,
  );
  return { onSend, onStop };
}

const status = () => document.querySelector("[data-status]") as HTMLElement;

/** The page's phase for a turn that ended failed (phase.ts). */
const failedPhase = (turn: Turn): RunPhase => ({
  kind: "failed",
  copyKey: "chat_phase_failed",
  since: null,
  open: false,
  run: turn.run.id,
});
const stopButton = () => screen.queryByRole("button", { name: "Zatrzymaj" });

describe("the chat pane, one state per golden log", () => {
  it("empty: says what to do and offers 3 starters that send", () => {
    const { onSend } = pane();
    expect(screen.getByText(/Napisz, jakiej lekcji potrzebujesz/)).toBeTruthy();
    const starter = screen.getByRole("button", { name: /równych grupach/ });
    fireEvent.click(starter);
    expect(onSend).toHaveBeenCalledWith("Krótka lekcja o równych grupach dla 2 klasy.");
    expect(stopButton()).toBeNull();
  });

  it("running (reload-with-duplicates): the state in words, a Stop, one spine and no tool rows", () => {
    const { onStop } = pane({ turns: [turnOf("reload-with-duplicates")] });
    expect(status().textContent).toBe("W toku");
    // The live region stays quiet while a turn runs: it speaks when it ends or needs the parent.
    expect(screen.getByRole("status").textContent).toBe("");
    expect(document.querySelectorAll("[data-spine]")).toHaveLength(1);
    noOldRows();
    fireEvent.click(stopButton() as HTMLElement);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("stopping: Stop turns into a disabled Stopping until the turn ends", () => {
    pane({ turns: [turnOf("reload-with-duplicates")], stopping: true });
    const stopping = screen.getByRole("button", { name: "Zatrzymuję…" }) as HTMLButtonElement;
    expect(stopping.disabled).toBe(true);
  });

  it("happy turn: the parent's words, the folded spine, the reply, done, no Stop", () => {
    pane({ turns: [turnOf("happy-turn")] });
    const messages = screen.getByRole("list", { name: "Wiadomości" });
    expect(
      within(messages).getByText("A short lesson on equal groups for grade 2, please."),
    ).toBeTruthy();
    expect(within(messages).getByText("Your lesson is ready on the right.")).toBeTruthy();
    // D5: the done turn folds to one row, closed until the parent opens it.
    const row = document.querySelector("[data-summary-row]") as HTMLElement;
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(row.querySelector("[data-meta]")?.textContent).toMatch(/^2 kroki · \d/);
    noOldRows();
    expect(status().textContent).toBe("Gotowe");
    expect(stopButton()).toBeNull();
  });

  it("tool failed: the engine's own words never reach the thread (S3)", () => {
    pane({
      turns: [
        turnOf("happy-turn", (view) => {
          const check = view.chat.find((c) => c.kind === "tool" && c.verb === "lesson_check");
          if (check?.kind === "tool") {
            check.state = "failed";
            check.error = { type: "CheckFailed", message: "step s03 has no key" };
          }
        }),
      ],
    });
    expect(document.body.textContent).not.toContain("step s03 has no key");
    noOldRows();
  });

  it("steer (budget-steer-then-stop): the steer at half and the stop near the cap are shown", () => {
    pane({ turns: [turnOf("budget-steer-then-stop")] });
    const rows = document.querySelectorAll("[data-row='steer']");
    expect([...rows].map((r) => r.getAttribute("data-level"))).toEqual(["steer", "stop"]);
    expect(rows[0]?.textContent).toBe(
      "Kończenie lekcji z tym, co jest, żeby zmieścić się w limicie.",
    );
    expect(rows[1]?.textContent).toContain("Zapisane, zatrzymane");
    expect(rows[1]?.textContent).toContain("Lekcja do tej pory jest zapisana.");
    // Cost in words: no dollar figure and no token count reaches the parent (dl-z5ja.29).
    for (const row of rows) expect(row.textContent).not.toMatch(/USD|\$|\d\.\d/);
  });

  it("cancelled (cancel-during-a-verb): says stopped, and Stop is gone", () => {
    pane({ turns: [turnOf("cancel-during-a-verb")] });
    expect(status().textContent).toBe("Zatrzymane");
    expect(stopButton()).toBeNull();
  });

  it("reconnecting: a Restoring line while the page catches up", () => {
    pane({ turns: [turnOf("reload-with-duplicates")], restoring: true });
    expect(screen.getByText("Przywracanie rozmowy…")).toBeTruthy();
  });

  it("a failed turn's foot copies the run, its attempt, error types and stage places for support (D7, S3)", () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const turn = turnOf("failed-turn");
    pane({ turns: [turn], phase: failedPhase(turn) });
    expect(screen.queryByRole("alert")).toBeNull();
    const foot = document.querySelector("[data-foot='failed']") as HTMLElement;
    fireEvent.click(within(foot).getByRole("button", { name: "Kopiuj szczegóły dla pomocy" }));
    const copied = String(writeText.mock.calls.at(0)?.at(0));
    expect(copied.split("\n")).toEqual([
      `run ${turn.run.id}`,
      "attempt 1",
      `status ${turn.view.status}`,
      "errors: question_types bank-busy, StepTimedOut (attempt 1), StepTimedOut (attempt 2), StepFailed (attempt 3)",
      "plan: 1 done · 2 failed · 3 pending",
    ]);
  });

  it("copies no learner data: no name, answer, message, tool output, error message or plan words (dl-uukj.47.71.28)", () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const PLANTED = "Ola odpowiedziała 17 jabłek";
    const turn = turnOf("failed-turn");
    // Plant the child's name and answer everywhere the log can carry words.
    const planted = (turn.events ?? []).map((e): RunEvent => {
      switch (e.type) {
        case "message":
          return { ...e, payload: { ...e.payload, text: PLANTED } };
        case "tool_call":
          return { ...e, payload: { ...e.payload, input: { answer: PLANTED } } };
        case "tool_result":
          return {
            ...e,
            payload: {
              ...e.payload,
              output: { answer: PLANTED },
              error: e.payload.error === null ? null : { ...e.payload.error, message: PLANTED },
            },
          };
        case "error":
          // A sentence where a code belongs: the contract types an error's type as any string.
          return {
            ...e,
            payload: {
              ...e.payload,
              error: { ...e.payload.error, type: PLANTED, message: PLANTED },
            },
          };
        case "plan":
          return {
            ...e,
            payload: { entries: e.payload.entries.map((x) => ({ ...x, text: PLANTED })) },
          };
        default:
          return e;
      }
    });
    expect(JSON.stringify(planted)).toContain(PLANTED);
    pane({ turns: [{ ...turn, events: planted }], phase: failedPhase(turn) });
    const foot = document.querySelector("[data-foot='failed']") as HTMLElement;
    fireEvent.click(within(foot).getByRole("button", { name: "Kopiuj szczegóły dla pomocy" }));
    const copied = String(writeText.mock.calls.at(0)?.at(0));
    expect(copied).toContain(`run ${turn.run.id}`);
    expect(copied).toContain("other (attempt 3)");
    for (const word of ["Ola", "17", "jabłek", "answer", "{", '"'])
      expect(copied).not.toContain(word);
  });

  it("a follow-up sent mid-turn is listed as queued", () => {
    pane({ turns: [turnOf("reload-with-duplicates")], queued: ["Make it 5 questions, not 8."] });
    const queued = screen.getByRole("list", { name: "W kolejce, do wysłania po tej turze" });
    expect(queued.textContent).toContain("Make it 5 questions, not 8.");
  });

  it("the composer sends on Enter and clears", () => {
    const { onSend } = pane();
    const box = screen.getByRole("textbox", { name: "Twoja wiadomość" }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "Ułamki dla 3 klasy" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("Ułamki dla 3 klasy");
    expect(box.value).toBe("");
  });

  it("speaks English when the parent's language is en", () => {
    pane({ language: "en", turns: [turnOf("cancel-during-a-verb")] });
    expect(status().textContent).toBe("Stopped");
  });
});

describe("the lesson pane", () => {
  it("before a revision: says the lesson appears here", () => {
    render(<LessonPane language="pl" lesson={null} />);
    expect(screen.getByText("Tu pojawi się lekcja.")).toBeTruthy();
  });

  it("draws the highest revision of happy-turn, its title and its question steps", () => {
    const { view } = golden("happy-turn");
    render(<LessonPane language="pl" lesson={view.lesson} />);
    expect(document.querySelector("[data-revision]")?.getAttribute("data-revision")).toBe("2");
    // The header counts the questions; no version is drawn (lesson card delta C5).
    expect(screen.getByText("4 zadania")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/wersj/i);
    expect(document.querySelectorAll("[data-step]").length).toBeGreaterThan(0);
  });

  it("a revision that does not parse says so and draws nothing else", () => {
    render(<LessonPane language="en" lesson={{ revision: 3, lesson_file: { id: 1 } }} />);
    expect(screen.getByRole("alert").textContent).toBe("This revision can't be shown yet.");
  });
});

describe("accessibility and recovery (dl-z5ja.28)", () => {
  const live = () => screen.getByRole("status");

  it("the live region speaks when a turn finishes, stops or needs the parent, and not while restoring", () => {
    pane({ turns: [turnOf("happy-turn")] });
    expect(live().getAttribute("aria-live")).toBe("polite");
    expect(live().textContent).toBe("Jadwigo AI: gotowe");
    cleanup();
    // plan-and-cite's approval, still unanswered.
    const waiting = turnOf("plan-and-cite", (view) => {
      for (const item of view.chat) if (item.kind === "approval") item.decision = null;
    });
    pane({ turns: [waiting] });
    expect(live().textContent).toBe("Jadwigo AI: czeka na Twoją odpowiedź");
    cleanup();
    pane({ turns: [turnOf("cancel-during-a-verb")] });
    expect(live().textContent).toBe("Zapisane, zatrzymane.");
    cleanup();
    pane({ turns: [turnOf("happy-turn")], restoring: true });
    expect(live().textContent).toBe("");
  });

  it("the run's state is text, not a colour alone", () => {
    pane({ turns: [turnOf("happy-turn")] });
    expect(status().textContent).toBe("Gotowe");
    expect(status().getAttribute("data-status")).toBe("completed");
  });

  it("a failed turn offers Spróbuj ponownie once, in its spine's foot, never a row above the composer (D7)", () => {
    const turn = turnOf("failed-turn");
    pane({ turns: [turn], phase: failedPhase(turn) });
    const retries = screen.getAllByRole("button", { name: "Spróbuj ponownie" });
    expect(retries).toHaveLength(1);
    expect(retries[0]?.closest("[data-foot='failed']")).not.toBeNull();
    expect(document.querySelector("[data-row='retry-turn']")).toBeNull();
    expect(live().textContent).toContain("Tej tury nie udało się dokończyć.");
  });

  it("a send that did not reach the server can go again, and the draft being typed stays", () => {
    const { onSend } = pane({ sendFailed: true });
    const box = screen.getByRole("textbox", { name: "Twoja wiadomość" });
    fireEvent.change(box, { target: { value: "Dodawanie do 10." } });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij" }));
    fireEvent.change(box, { target: { value: "jeszcze" } });
    const failed = document.querySelector("[data-row='send-failed']") as HTMLElement;
    fireEvent.click(within(failed).getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onSend.mock.calls).toEqual([["Dodawanie do 10."], ["Dodawanie do 10."]]);
    expect((box as HTMLTextAreaElement).value).toBe("jeszcze");
  });

  it("Escape in the composer stops a running turn", () => {
    const { onStop } = pane({ turns: [turnOf("reload-with-duplicates")] });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Twoja wiadomość" }), { key: "Escape" });
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("a stopped turn's foot says whether the lesson changed, and names no version (S15, dl-vxjv2)", () => {
    // cancel-during-a-verb wrote a revision before the stop.
    pane({ turns: [turnOf("cancel-during-a-verb")] });
    expect(document.querySelector("[data-foot='stopped']")?.textContent).toBe(
      "Zatrzymane. W lekcji jest to, co zdążyłam zmienić.",
    );
    expect(document.querySelector("[data-spine]")?.textContent).not.toMatch(/wersj|version \d/i);
    cleanup();
    pane({ language: "en", turns: [turnOf("cancel-during-a-verb")] });
    expect(document.querySelector("[data-foot='stopped']")?.textContent).toBe(
      "Stopped. The lesson has what I managed to change.",
    );
    expect(document.querySelector("[data-spine]")?.textContent).not.toMatch(/wersj|version \d/i);
  });

  it("Escape in the thread stops a running turn once, and does nothing once it has ended (S6)", () => {
    const { onStop } = pane({ turns: [turnOf("reload-with-duplicates")] });
    fireEvent.keyDown(document.querySelector("[data-spine]") as HTMLElement, { key: "Escape" });
    expect(onStop).toHaveBeenCalledTimes(1);
    cleanup();
    const done = pane({ turns: [turnOf("happy-turn")] });
    fireEvent.keyDown(document.querySelector("[data-spine]") as HTMLElement, { key: "Escape" });
    expect(done.onStop).not.toHaveBeenCalled();
  });

  it("scrolls to the newest row without motion when the parent asks for less", () => {
    // Only the list's own box moves, never the page around it (dl-uukj.47.68): scrollIntoView
    // would scroll every scrollable ancestor too.
    const intoView = vi.fn();
    Element.prototype.scrollIntoView = intoView;
    const scrollTo = vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(() => {});
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
    try {
      pane({ turns: [turnOf("happy-turn")] });
      const list = screen.getByRole("list", { name: "Wiadomości" });
      expect(scrollTo.mock.contexts).toContain(list);
      expect(scrollTo).toHaveBeenCalledWith({ top: list.scrollHeight, behavior: "auto" });
      expect(intoView).not.toHaveBeenCalled();
    } finally {
      scrollTo.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("says when the network is gone, and what to do", () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    try {
      pane();
      expect(document.querySelector("[data-row='offline']")?.textContent).toBe(
        "Nie ma połączenia z siecią. Wiadomość zostaje tutaj: wyślij ją, gdy sieć wróci.",
      );
    } finally {
      online.mockRestore();
    }
  });

  it("a step tried again draws no error box (S5): a retry is a quiet line in its stage", () => {
    pane({ turns: [turnOf("stale-attempt")] });
    expect(screen.queryByRole("alert")).toBeNull();
    noOldRows();
  });
});

describe("a logged steer in the chat (dl-z5ja.30, S17)", () => {
  it("draws a steer as a line in the spine, never as a bubble of its own", () => {
    for (const steer of [
      { source: "lesson_edit" as const, question_ids: ["s02"] },
      { source: "chat" as const },
    ]) {
      pane({
        turns: [
          turnOf("happy-turn", (view) => {
            const first = view.chat[0];
            if (first?.kind === "message") first.steer = steer;
          }),
        ],
      });
      expect(document.querySelector("[data-steer]")).toBeNull();
      expect(document.querySelector("[data-bubble]")).toBeNull();
      cleanup();
    }
  });
});

describe("the engine's limits never in its own words (dl-z5ja.28, D7, S3)", () => {
  const withError = (type: string, retryable: boolean) =>
    turnOf("happy-turn", (view) => {
      view.chat.push({
        kind: "error",
        seq: 99,
        error: { type, message: "the turn ran past its 30 minutes" },
        attempt: 2,
        retryable,
      });
    });

  it.each([
    RUN_ERROR_TYPE.runTimedOut,
    RUN_ERROR_TYPE.runIdle,
    RUN_ERROR_TYPE.stepTimedOut,
    "unknown-draft",
  ])("%s: no error box, no engine message in the thread", (type) => {
    pane({ turns: [withError(type, false)] });
    expect(document.body.textContent).not.toContain("30 minutes");
    noOldRows();
  });

  it("a turn whose every try failed ends in the spine's foot, with Spróbuj ponownie (dl-hin8.28)", () => {
    const turn = withError(RUN_ERROR_TYPE.stepFailed, false);
    turn.view.status = "failed";
    const first = turn.view.chat[0];
    const words = first?.kind === "message" ? first.text : "";
    const { onSend } = pane({ turns: [turn], phase: failedPhase(turn) });
    const foot = document.querySelector("[data-foot='failed']") as HTMLElement;
    expect(foot.textContent).toContain("Nie udało się ułożyć lekcji.");
    fireEvent.click(within(foot).getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onSend).toHaveBeenCalledWith(words);
    expect(status().getAttribute("data-status")).toBe("failed");
  });
});

describe("the message limits (dl-z5ja.62, .100)", () => {
  it("says the minute's limit in one line: wait a moment, with no retry", () => {
    pane({ sendFailed: true, sendLimit: "minute" });
    expect(document.querySelector("[data-row='send-limited']")?.textContent).toBe(
      "Teraz przychodzi dużo wiadomości. Spróbuj ponownie za chwilę.",
    );
    expect(document.querySelector("[data-row='send-failed']")).toBeNull();
    expect(screen.queryByRole("button", { name: "Spróbuj ponownie" })).toBeNull();
  });

  it("says the day's limit in one line: come back tomorrow, with no retry", () => {
    pane({ sendFailed: true, sendLimit: "day" });
    expect(document.querySelector("[data-row='send-limited']")?.textContent).toBe(
      "Na dziś to już wszystkie rozmowy z Jadwigo AI. Wróć jutro, a lekcja poczeka.",
    );
    expect(document.querySelector("[data-row='send-failed']")).toBeNull();
    expect(screen.queryByRole("button", { name: "Spróbuj ponownie" })).toBeNull();
  });
});

describe("one living lesson card (S7, S16)", () => {
  it("the newest version's card carries the actions; an older one is a superseded row without them", () => {
    pane({
      turns: [turnOf("happy-turn"), turnOf("happy-turn")],
      lessonObject: { kind: "lesson", id: "lsn_2h4m8gyw0fb1cvz2nkqw0px8fq" } as ObjectRef,
      onOpen: vi.fn(),
      lessonActions: <button type="button">Daj lekcję</button>,
    });
    const cards = [...document.querySelectorAll("[data-card-state]")];
    expect(cards.map((c) => c.getAttribute("data-card-state"))).toEqual(["superseded", "ready"]);
    expect(
      within(cards[0] as HTMLElement).queryByRole("button", { name: "Daj lekcję" }),
    ).toBeNull();
    expect(
      within(cards[1] as HTMLElement).getByRole("button", { name: "Daj lekcję" }),
    ).toBeTruthy();
  });
});

describe("the two sides apart (dl-uukj.47.28)", () => {
  it("draws the parent's words as a bordered box on the right, with Ty for a screen reader", () => {
    pane({ turns: [turnOf("happy-turn")] });
    const parent = document.querySelector("[data-from='parent']") as HTMLElement;
    expect(parent.className).toContain("self-end");
    expect(parent.className).toContain("max-w-[90%]");
    const bubble = parent.querySelector("[data-bubble]") as HTMLElement;
    expect(bubble.className).toContain("border-jw-line");
    expect(bubble.className).toContain("rounded-jw-box");
    expect(bubble.textContent).toBe("A short lesson on equal groups for grade 2, please.");
    const label = within(parent).getByText("Ty");
    expect(label.className).toContain("sr-only");
  });

  it("heads Jadwigo AI's turn once, with its mark and name, over prose with no border", () => {
    pane({ variant: "parent", turns: [turnOf("happy-turn")] });
    const headers = document.querySelectorAll("[data-ai-header]");
    expect(headers).toHaveLength(1);
    const header = headers[0] as HTMLElement;
    expect(header.textContent).toBe("Jadwigo AI");
    expect(header.querySelector("[data-ai-mark]")?.getAttribute("aria-hidden")).toBe("true");
    // The header sits over the turn's first row of Jadwigo AI, the tool lines, not the parent's.
    expect(header.closest("li")?.querySelector("[data-from='parent']")).toBeNull();
    const prose = document.querySelector("[data-prose]") as HTMLElement;
    expect(prose.textContent).toBe("Your lesson is ready on the right.");
    expect(prose.className).not.toMatch(/\bborder\b|rounded/);
    expect(prose.closest("li")?.className).not.toContain("items-end");
  });

  it("gives each turn a header of its own", () => {
    pane({ turns: [turnOf("happy-turn"), turnOf("happy-turn", () => {})] });
    expect(document.querySelectorAll("[data-ai-header]")).toHaveLength(1 * 2);
  });

  it("fades rows in only when the system allows motion", () => {
    pane({ turns: [turnOf("happy-turn")] });
    expect(document.querySelectorAll("[data-chat-row][data-enter]").length).toBeGreaterThan(0);
    cleanup();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
    try {
      pane({ turns: [turnOf("happy-turn")] });
      expect(document.querySelectorAll("[data-chat-row]").length).toBeGreaterThan(0);
      expect(document.querySelectorAll("[data-enter]")).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("one spine per turn, no plan card (D1, S9)", () => {
  /** plan-and-cite folded up to `seq`, as a turn. */
  function planTurn(seq: number): Turn {
    const turn = turnOf("plan-and-cite");
    const events = (turn.events ?? []).filter((e) => e.seq <= seq);
    return { run: turn.run, view: foldRun(events), events };
  }

  it.each([3, 15])("plan-and-cite at seq %i: one spine under one header, no plan card", (seq) => {
    pane({ turns: [planTurn(seq)] });
    expect(document.querySelectorAll("[data-spine]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-ai-header]")).toHaveLength(1);
    const spine = document.querySelector("[data-spine]") as HTMLElement;
    expect(spine.closest("li")?.querySelector("[data-ai-header]")).not.toBeNull();
    // Not sticky (§3): it grows in place.
    expect(spine.closest("li")?.className).not.toContain("sticky");
    noOldRows();
  });

  it("the spine appears at send, before the run has a row (S9)", () => {
    pane({ pending: "Dodawanie do 20", now: 1_000 });
    const spine = document.querySelector("[data-spine='queued']") as HTMLElement;
    expect(spine.querySelector("[data-title]")?.textContent).toBe("W kolejce");
    expect(spine.querySelector("[data-meta]")?.textContent).toBe("0 s");
    expect(spine.textContent).toContain("Zacznę za chwilę.");
  });
});

describe("no context chip, and no footnote (dl-uukj.47.32, S21)", () => {
  const OLA = "lrn_2h4m8gyw0fb1cvz2nkqw0px8fq";
  const nameOf = (id: string) => (id === OLA ? "Ola" : null);

  it("draws no 'Jadwigo AI widzi' chip once a message went (S21: Dla already says it)", () => {
    pane({
      variant: "parent",
      nameOf,
      turns: [
        turnOf("happy-turn", (view) => {
          const message = view.chat[0];
          if (message?.kind === "message")
            message.context = { learner_id: OLA } as NonNullable<typeof message.context>;
        }),
      ],
    });
    expect(document.querySelector("[data-context-chip]")).toBeNull();
    expect(screen.queryByText(/Jadwigo AI widzi/)).toBeNull();
  });

  it("has no footnote under the composer (design review 2026-11-02)", () => {
    pane({ variant: "parent" });
    expect(document.querySelector("[data-footnote]")).toBeNull();
    expect(screen.queryByText(/może się mylić/)).toBeNull();
  });
});

const ATTACHMENT = AttachmentId.parse(
  idOf(ID_PREFIXES.attachment, "0b8f4c3e-6a1d-4f2b-9c7e-1d2e3f4a5b6c"),
);

describe("what Jadwigo received under a parent's message (dl-z5ja.11.6)", () => {
  const attach = (view: RunView) => {
    const first = view.chat.find((item) => item.kind === "message" && item.from === "parent");
    if (first?.kind !== "message") throw new Error("the golden log has no parent message");
    first.attachments = [
      {
        attachment_id: ATTACHMENT,
        storage_path: "pods/pod_made_up/attachments/atch_1.jpg",
        media_type: "image/jpeg",
        bytes: 1000,
        width: 800,
        height: 600,
      },
    ];
  };

  it("shows the message's photos as a strip under its bubble when the pane can read them", () => {
    const readAttachment = vi.fn(() => new Promise<never>(() => {}));
    pane({ variant: "parent", turns: [turnOf("happy-turn", attach)], readAttachment });
    const row = document.querySelector("[data-from='parent']") as HTMLElement;
    expect(within(row).getByText("Tak Jadwigo widzi zdjęcia")).toBeTruthy();
    expect(row.querySelectorAll("[data-attachment]")).toHaveLength(1);
    expect(readAttachment).toHaveBeenCalledWith(ATTACHMENT);
  });

  it("shows no strip without a way to read them, and none for a message with no photos", () => {
    pane({ variant: "parent", turns: [turnOf("happy-turn", attach)] });
    expect(document.querySelector("[data-thread-attachments]")).toBeNull();
    cleanup();
    pane({ variant: "parent", turns: [turnOf("happy-turn")], readAttachment: vi.fn() });
    expect(document.querySelector("[data-thread-attachments]")).toBeNull();
  });
});
