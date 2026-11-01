import type { Run } from "@jadwigo/contracts/run";
import { RunEvent, RunId } from "@jadwigo/contracts/run";
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
    resumes_run_id: null,
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

const status = () => screen.getByRole("status");
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
    expect(status().textContent).toBe("Pracuję nad tym");
    expect(status().getAttribute("aria-live")).toBe("polite");
    const details = screen.getByText(/1 krok/).closest("details");
    expect(details?.open).toBe(false);
    expect(screen.queryByRole("list", { name: "Stuck tool lines" })).toBeNull();
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
    const messages = screen.getByRole("list", { name: "Messages" });
    expect(
      within(messages).getByText("A short lesson on equal groups for grade 2, please."),
    ).toBeTruthy();
    expect(within(messages).getByText("Your lesson is ready on the right.")).toBeTruthy();
    expect(screen.getByText(/Sprawdzam lekcję · 2 kroki/)).toBeTruthy();
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
    const stuck = screen.getByRole("list", { name: "Stuck tool lines" });
    expect(stuck.textContent).toBe("Sprawdzam lekcję: nie udało się: step s03 has no key");
    expect(stuck.closest("details")).toBeNull();
  });

  it("steer (budget-steer-then-stop): the steer at half and the stop near the cap are shown", () => {
    pane({ turns: [turnOf("budget-steer-then-stop")] });
    const rows = document.querySelectorAll("[data-row='steer']");
    expect([...rows].map((r) => r.getAttribute("data-level"))).toEqual(["steer", "stop"]);
    expect(rows[0]?.textContent).toContain("Połowa budżetu wykorzystana");
    expect(rows[0]?.textContent).toContain("0.06 z 0.10 USD");
    expect(rows[1]?.textContent).toContain("tu się zatrzymuję");
  });

  it("cancelled (cancel-during-a-verb): says stopped, and Stop is gone", () => {
    pane({ turns: [turnOf("cancel-during-a-verb")] });
    expect(status().textContent).toBe("Zatrzymane");
    expect(stopButton()).toBeNull();
  });

  it("reconnecting: a Restoring line while the page catches up", () => {
    pane({ turns: [turnOf("reload-with-duplicates")], restoring: true });
    expect(screen.getByText("Przywracam rozmowę…")).toBeTruthy();
  });

  it("an error row (stale-attempt) copies the run id and the attempt", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const turn = turnOf("stale-attempt");
    pane({ turns: [turn] });
    const row = screen.getByRole("alert");
    expect(row.textContent).toContain("Próbuję jeszcze raz.");
    fireEvent.click(within(row).getByRole("button", { name: "Kopiuj szczegóły" }));
    expect(writeText).toHaveBeenCalledWith(`run ${turn.run.id} attempt 1: StepTimedOut`);
    expect(await within(row).findByRole("button", { name: "Skopiowano" })).toBeTruthy();
  });

  it("a follow-up sent mid-turn is listed as queued", () => {
    pane({ turns: [turnOf("reload-with-duplicates")], queued: ["Make it 5 questions, not 8."] });
    const queued = screen.getByRole("list", { name: "Wyślę po tej turze" });
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
