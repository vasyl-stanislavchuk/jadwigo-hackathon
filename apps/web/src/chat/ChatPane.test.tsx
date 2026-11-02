import type { Run } from "@jadwigo/contracts/run";
import { RUN_ERROR_TYPE, RunEvent, RunId } from "@jadwigo/contracts/run";
import type { RunView } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane, type ChatPaneProps } from "./ChatPane.tsx";
import type { Turn } from "./conversation.ts";
import { LessonPane } from "./LessonPane.tsx";

afterEach(cleanup);

/** A golden log by name (`packages/testing/src/runs/`): its events parsed, its expected view. */
function golden(name: string): { run_id: RunId; view: RunView } {
  const log = RUN_LOGS.find((l) => l.name === name);
  if (log === undefined) throw new Error(`no golden log ${name}`);
  const first = RunEvent.parse(log.events[0]);
  return { run_id: first.run_id, view: structuredClone(log.expected) as RunView };
}

function turnOf(name: string, change: (view: RunView) => void = () => {}): Turn {
  const { run_id, view } = golden(name);
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
  return { run, view };
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

  it("running (reload-with-duplicates): the state in words, a Stop, the tool line folded", () => {
    const { onStop } = pane({ turns: [turnOf("reload-with-duplicates")] });
    expect(status().textContent).toBe("W toku");
    // The live region stays quiet while a turn runs: it speaks when it ends or needs the parent.
    expect(screen.getByRole("status").textContent).toBe("");
    const details = screen.getByText(/1 krok/).closest("details");
    expect(details?.open).toBe(false);
    expect(screen.queryByRole("list", { name: "Kroki, które się zacięły" })).toBeNull();
    fireEvent.click(stopButton() as HTMLElement);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("stopping: Stop turns into a disabled Stopping until the turn ends", () => {
    pane({ turns: [turnOf("reload-with-duplicates")], stopping: true });
    const stopping = screen.getByRole("button", { name: "Zatrzymywanie…" }) as HTMLButtonElement;
    expect(stopping.disabled).toBe(true);
  });

  it("happy turn: messages from both sides, 2 tool lines folded, done, no Stop", () => {
    pane({ turns: [turnOf("happy-turn")] });
    const messages = screen.getByRole("list", { name: "Wiadomości" });
    expect(
      within(messages).getByText("A short lesson on equal groups for grade 2, please."),
    ).toBeTruthy();
    expect(within(messages).getByText("Your lesson is ready on the right.")).toBeTruthy();
    expect(screen.getByText("2 kroki · ostatni: Sprawdzanie lekcji")).toBeTruthy();
    expect(status().textContent).toBe("Gotowe");
    expect(stopButton()).toBeNull();
  });

  it("tool failed: the stuck line stays in view outside the fold, with its reason", () => {
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
    const stuck = screen.getByRole("list", { name: "Kroki, które się zacięły" });
    expect(stuck.querySelector("summary")?.textContent).toBe(
      "Sprawdzanie lekcji · nie udało się: step s03 has no key",
    );
    expect(stuck.closest("details")).toBeNull();
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

  it("an error row (stale-attempt) copies the run id and the attempt", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const turn = turnOf("stale-attempt");
    pane({ turns: [turn] });
    const row = screen.getByRole("alert");
    expect(row.textContent).toContain("Ponowna próba.");
    fireEvent.click(within(row).getByRole("button", { name: "Kopiuj szczegóły" }));
    expect(writeText).toHaveBeenCalledWith(`run ${turn.run.id} attempt 1: StepTimedOut`);
    expect(await within(row).findByRole("button", { name: "Skopiowano" })).toBeTruthy();
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
    expect(screen.getByText("Wersja 2")).toBeTruthy();
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

  it("Spróbuj ponownie sends the failed turn's own words again", () => {
    const turn = turnOf("happy-turn", (view) => {
      view.status = "failed";
    });
    const first = turn.view.chat[0];
    const words = first?.kind === "message" ? first.text : "";
    const { onSend } = pane({ turns: [turn] });
    const row = document.querySelector("[data-row='retry-turn']") as HTMLElement;
    expect(row.textContent).toContain("Tej tury nie udało się dokończyć.");
    expect(live().textContent).toContain("Tej tury nie udało się dokończyć.");
    fireEvent.click(within(row).getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onSend).toHaveBeenCalledWith(words);
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

  it("scrolls to the newest row without motion when the parent asks for less", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }));
    try {
      pane({ turns: [turnOf("happy-turn")] });
      expect(scroll).toHaveBeenCalledWith({ block: "end", behavior: "auto" });
    } finally {
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

  it("every error row has Copy details naming the run and the attempt", () => {
    pane({ turns: [turnOf("stale-attempt")] });
    const error = document.querySelector("[data-row='error']");
    const details = error?.querySelector("[data-details]")?.getAttribute("data-details") ?? "";
    expect(details).toMatch(/^run run_\w+ attempt \d+: /);
    expect(error?.textContent).toContain("Kopiuj szczegóły");
  });
});

describe("a logged steer in the chat (dl-z5ja.30)", () => {
  it("marks a parent's lesson edit and a chat steer apart from an ordinary message", () => {
    const turn = turnOf("happy-turn", (view) => {
      const first = view.chat[0];
      if (first?.kind === "message") first.steer = { source: "lesson_edit", question_ids: ["s02"] };
    });
    pane({ turns: [turn] });
    const steered = document.querySelector("[data-steer='lesson_edit']");
    expect(steered?.textContent).toContain("Ty · Twoja zmiana w lekcji");
    cleanup();
    pane({
      turns: [
        turnOf("happy-turn", (view) => {
          const first = view.chat[0];
          if (first?.kind === "message") first.steer = { source: "chat" };
        }),
      ],
    });
    expect(document.querySelector("[data-steer='chat']")?.textContent).toContain(
      "Ty · Dopisane w trakcie",
    );
  });
});

describe("the engine's limits in plain words (dl-z5ja.28, dl-z5ja.83)", () => {
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

  it("a turn past its time limit says the lesson so far is saved and what to do next", () => {
    pane({ turns: [withError(RUN_ERROR_TYPE.runTimedOut, false)] });
    const row = document.querySelector("[data-row='error']");
    expect(row?.querySelector("p")?.textContent).toBe(
      "Ta tura trwała zbyt długo, więc się zatrzymała. Lekcja do tej pory jest zapisana: napisz, co dalej.",
    );
    expect(row?.textContent).not.toContain("30 minutes");
    expect(row?.querySelector("[data-details]")?.getAttribute("data-details")).toContain(
      "attempt 2: RunTimedOut",
    );
  });

  it("a turn closed while nothing happened says so in Polish, with no retry", () => {
    pane({
      turns: [
        turnOf("happy-turn", (view) => {
          view.chat.push({
            kind: "error",
            seq: 99,
            error: {
              type: RUN_ERROR_TYPE.runIdle,
              message: "nothing happened in the turn for 10 minutes, so it closed",
            },
            attempt: 1,
            retryable: true,
          });
        }),
      ],
    });
    const row = document.querySelector("[data-row='error']");
    expect(row?.querySelector("p")?.textContent).toBe(
      "Na następny krok trzeba było czekać zbyt długo, więc tura się zakończyła. Lekcja do tej pory jest zapisana: napisz, co dalej.",
    );
    expect(row?.textContent).not.toContain("10 minutes");
    expect(row?.textContent).not.toContain("Ponowna próba.");
    expect(document.querySelector("[data-row='retry-turn']")).toBeNull();
  });

  it("a step delivered again only says it is trying again", () => {
    pane({ turns: [withError(RUN_ERROR_TYPE.stepTimedOut, true)] });
    expect(document.querySelector("[data-row='error'] p")?.textContent).toBe("Ponowna próba.");
  });

  it("any other problem keeps its message", () => {
    pane({ turns: [withError("unknown-draft", false)] });
    expect(document.querySelector("[data-row='error'] p")?.textContent).toBe(
      "Coś się zacięło: the turn ran past its 30 minutes",
    );
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

describe("the two sides apart (dl-uukj.47.28)", () => {
  it("draws the parent's words as a filled bubble on the right, with Ty for a screen reader", () => {
    pane({ turns: [turnOf("happy-turn")] });
    const parent = document.querySelector("[data-from='parent']") as HTMLElement;
    expect(parent.className).toContain("self-end");
    expect(parent.className).toContain("max-w-[85%]");
    const bubble = parent.querySelector("[data-bubble]") as HTMLElement;
    expect(bubble.className).toContain("bg-jw-pick");
    expect(bubble.className).toContain("rounded-jw-dialog");
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

describe("tool calls explained (dl-uukj.47.30)", () => {
  const line = (verb: string) => document.querySelector(`[data-tools] [data-tool='${verb}']`);

  it("gives each line its icon, its sentence from the call's input, and its state in text", () => {
    pane({ turns: [turnOf("happy-turn")] });
    const draft = line("lesson_draft") as HTMLElement;
    const icon = draft.querySelector("summary [data-tool-icon]");
    expect(icon?.tagName.toLowerCase()).toBe("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(draft.querySelector("[data-sentence]")?.textContent).toBe(
      "Układanie lekcji o: equal groups",
    );
    expect(draft.querySelector("[data-mark='done']")?.getAttribute("aria-hidden")).toBe("true");
    const state = draft.querySelector("[data-state-words]") as HTMLElement;
    expect(state.textContent).toBe(" · gotowe");
    expect(state.className).toContain("sr-only");
    // No input to say more with: the verb's plain sentence.
    expect(line("lesson_check")?.querySelector("[data-sentence]")?.textContent).toBe(
      "Sprawdzanie lekcji",
    );
    expect(document.querySelector("[data-tools] [role='status']")).toBeNull();
  });

  it("sums the folded group up as the count and the last line's sentence", () => {
    pane({ turns: [turnOf("happy-turn")] });
    const group = document.querySelector("[data-tool-group]") as HTMLDetailsElement;
    expect(group.open).toBe(false);
    expect(group.querySelector("summary")?.textContent).toBe(
      "2 kroki · ostatni: Sprawdzanie lekcji",
    );
    cleanup();
    pane({ turns: [turnOf("cancel-during-a-verb")] });
    expect(document.querySelector("[data-tool-group] summary")?.textContent).toBe(
      "1 krok · ostatni: Układanie lekcji o: clock",
    );
  });

  it("keeps a failed line in view, with a red dot and its reason, while the group stays folded", () => {
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
    expect((document.querySelector("[data-tool-group]") as HTMLDetailsElement).open).toBe(false);
    const stuck = screen.getByRole("list", { name: "Kroki, które się zacięły" });
    expect(stuck.closest("details")).toBeNull();
    expect(stuck.querySelector("[data-mark='failed']")?.getAttribute("aria-hidden")).toBe("true");
    const reason = stuck.querySelector("[data-state-words]") as HTMLElement;
    expect(reason.className).not.toContain("sr-only");
    expect(reason.textContent).toBe(" · nie udało się: step s03 has no key");
  });

  it("opens a line on what was done, and the raw input and output one more tap under Szczegóły", () => {
    pane({ turns: [turnOf("happy-turn")] });
    const draft = line("lesson_draft") as HTMLElement;
    const opened = draft.querySelector("[data-tool-line]") as HTMLDetailsElement;
    expect(opened.textContent).toContain("Co zostało zrobione");
    const raw = draft.querySelector("[data-card='plain']") as HTMLDetailsElement;
    expect(raw.parentElement?.closest("[data-tool-line]")).toBe(opened);
    expect(raw.querySelector("summary")?.textContent).toBe("Szczegóły");
    expect(raw.querySelector("[data-card-input]")?.textContent).toContain(
      '"topic": "equal groups"',
    );
  });

  it("spins a running line's mark only under motion-safe", () => {
    pane({
      turns: [
        turnOf("happy-turn", (view) => {
          const check = view.chat.find((c) => c.kind === "tool" && c.verb === "lesson_check");
          if (check?.kind === "tool") check.state = "running";
        }),
      ],
    });
    const mark = line("lesson_check")?.querySelector("[data-mark='running']");
    expect(mark?.getAttribute("class")).toContain("motion-safe:animate-spin");
    expect(mark?.getAttribute("class")).not.toMatch(/(^|\s)animate-spin/);
  });

  it("names the child a learner verb read, when the family has them", () => {
    pane({
      nameOf: (id) => (id === "lrn_1" ? "Ola" : null),
      turns: [
        turnOf("happy-turn", (view) => {
          const check = view.chat.find((c) => c.kind === "tool" && c.verb === "lesson_check");
          if (check?.kind === "tool") {
            check.verb = "learner_week";
            check.input = { learner_id: "lrn_1" };
            delete check.view;
          }
        }),
      ],
    });
    expect(line("learner_week")?.querySelector("[data-sentence]")?.textContent).toBe(
      "Czytanie tygodnia · Ola",
    );
  });
});
