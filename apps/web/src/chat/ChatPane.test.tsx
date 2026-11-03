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
    const stopping = screen.getByRole("button", { name: "Zatrzymuję…" }) as HTMLButtonElement;
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
    expect(await within(row).findByRole("button", { name: "Skopiowane" })).toBeTruthy();
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

  it("a turn whose every try failed says so plainly, with the turn's retry under it (dl-hin8.28)", () => {
    const turn = withError(RUN_ERROR_TYPE.stepFailed, false);
    turn.view.status = "failed";
    pane({ turns: [turn] });
    const row = document.querySelector("[data-row='error'] p");
    expect(row?.textContent).toBe("Jadwigo nie dała rady dokończyć tej prośby, mimo kilku prób.");
    expect(row?.textContent).not.toContain("every try");
    const retry = document.querySelector("[data-row='retry-turn']") as HTMLElement;
    expect(within(retry).getByRole("button", { name: "Spróbuj ponownie" })).toBeTruthy();
    // The turn ended: no spinner, and the status says it did not finish.
    expect(status().getAttribute("data-status")).toBe("failed");
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

describe("the plan as a checklist (dl-uukj.47.31)", () => {
  /** plan-and-cite folded up to `seq`, as a turn. */
  function planTurn(seq: number, change: (view: RunView) => void = () => {}): Turn {
    const turn = turnOf("plan-and-cite");
    const log = RUN_LOGS.find((l) => l.name === "plan-and-cite")?.events ?? [];
    const view = foldRun(log.map((e) => RunEvent.parse(e)).filter((e) => e.seq <= seq));
    change(view);
    return { run: turn.run, view };
  }
  const card = () => document.querySelector("[data-plan]") as HTMLElement | null;
  const header = () => card()?.querySelector("[data-plan-header]")?.textContent;

  it("pins the entries, each with its status in words, above the tool lines while the turn runs", () => {
    pane({ turns: [planTurn(3)] });
    expect(card()?.getAttribute("data-plan")).toBe("open");
    expect(card()?.tagName.toLowerCase()).toBe("section");
    expect(header()).toBe("Plan · 0 z 3");
    const entries = [...(card()?.querySelectorAll("[data-plan-entry]") ?? [])];
    expect(entries.map((e) => e.getAttribute("data-status"))).toEqual([
      "in_progress",
      "pending",
      "pending",
    ]);
    expect(entries[0]?.textContent).toBe("Find questions on carrying" + "w toku");
    // Jadwigo AI's one header sits over the plan.
    expect(document.querySelectorAll("[data-ai-header]")).toHaveLength(1);
    expect(card()?.closest("li")?.querySelector("[data-ai-header]")).not.toBeNull();
  });

  it("moves the count as entries are done, and keeps the plan above the tool lines", () => {
    pane({ turns: [planTurn(15)] });
    expect(header()).toBe("Plan · 1 z 3");
    const plan = card() as HTMLElement;
    const tools = document.querySelector("[data-tools]") as HTMLElement;
    expect(plan.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("folds to its header once the turn ends", () => {
    pane({
      turns: [
        planTurn(15, (view) => {
          view.turn_open = false;
          view.status = "completed";
        }),
      ],
    });
    const folded = card() as HTMLDetailsElement;
    expect(folded.getAttribute("data-plan")).toBe("folded");
    expect(folded.tagName.toLowerCase()).toBe("details");
    expect(folded.open).toBe(false);
    expect(folded.querySelector("summary")?.textContent).toBe("Plan · 1 z 3");
  });

  it("draws nothing for a plan of 2 entries", () => {
    pane({
      turns: [
        planTurn(15, (view) => {
          view.plan = view.plan?.slice(0, 2) ?? null;
        }),
      ],
    });
    expect(card()).toBeNull();
  });
});

describe("the context chip and the footnote (dl-uukj.47.32)", () => {
  const chip = () => document.querySelector("[data-context-chip]")?.textContent ?? null;
  const OLA = "lrn_2h4m8gyw0fb1cvz2nkqw0px8fq";
  const nameOf = (id: string) => (id === OLA ? "Ola" : null);
  /** happy-turn with its parent message sent from `context`. */
  const turns = (context: unknown): Turn[] => [
    turnOf("happy-turn", (view) => {
      const message = view.chat[0];
      if (message?.kind === "message" && context !== undefined)
        message.context = context as NonNullable<typeof message.context>;
    }),
  ];

  it("says no child when the last message went with none", () => {
    pane({ variant: "parent", nameOf, turns: turns(undefined) });
    expect(chip()).toBe("Jadwigo AI widzi: bez dziecka");
  });

  it("follows the last message's context, never an earlier one", () => {
    pane({ variant: "parent", nameOf, turns: turns({ learner_id: OLA }) });
    expect(chip()).toBe("Jadwigo AI widzi: Ola");
    cleanup();
    pane({
      variant: "parent",
      nameOf,
      turns: [
        ...turns({ learner_id: OLA }),
        turnOf("happy-turn", (view) => {
          const message = view.chat[0];
          if (message?.kind === "message") delete message.context;
        }),
      ],
    });
    expect(chip()).toBe("Jadwigo AI widzi: bez dziecka");
    cleanup();
    pane({
      variant: "parent",
      nameOf,
      turns: turns({ lesson_id: "lsn_2h4m8gyw0fb1cvz2nkqw0px8fq" }),
    });
    expect(chip()).toBe("Jadwigo AI widzi: tę lekcję");
  });

  it("shows no chip before the parent has sent anything", () => {
    pane({ variant: "parent", nameOf });
    expect(chip()).toBeNull();
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
