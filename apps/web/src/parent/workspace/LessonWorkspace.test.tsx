// @vitest-environment happy-dom
/**
 * The lesson workspace on the engine (dl-z5ja.108, decision dl-xo0q): the first screen's words are
 * sent once, after the page reads the conversation back with no turn, and never again on a remount;
 * the turn fills the chat, its state reaches the band in words and its lesson the lesson column; a
 * route that answers AiConsentMissing puts the consent screen in the chat, and agreeing sends the
 * words again; the parent's chat has no Stop button, and Esc stops. A stand-in transport plays the
 * golden happy-turn log (@jadwigo/testing).
 */

import { ApiError } from "@jadwigo/api-client";
import { AttachmentId, ID_PREFIXES, idOf, type Learner, LearnerId } from "@jadwigo/contracts";
import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { FIXED_NOW, RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineTransport } from "../../chat/useConversation.ts";
import type { SendBody } from "../../chat/wire.ts";
import { firstMessage, type LessonEngine } from "./engine.ts";
import { LessonWorkspace } from "./LessonWorkspace.tsx";

const CONVERSATION = ConversationId.parse("cnv_00000000000000000000000001");
const events = (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) =>
  RunEvent.parse(e),
);
const run: Run = {
  id: RunId.parse(events[0]?.run_id),
  pod_id: "pod_00000000000000000000000001" as Run["pod_id"],
  created_by: "acc_00000000000000000000000001" as Run["created_by"],
  conversation_id: CONVERSATION,
  workflow: "jadwigo-lesson-compose",
  resumes: null,
  status: "completed",
  attempt: 1,
  cancel_requested_at: null,
  idle_deadline_at: null,
  max_deadline_at: "2026-09-01T08:30:00.000Z",
  cap_usd: 1,
  spent_usd: 0,
  created_at: "2026-09-01T08:00:00.000Z",
  completed_at: null,
};

/** A new conversation (no turn) until a message is sent; then the happy turn. */
function engineWith(
  send: (body: SendBody) => Promise<Run> = async () => run,
  log: readonly RunEvent[] = events,
) {
  const sent: SendBody[] = [];
  let started = false;
  const transport: EngineTransport = {
    subscribe: () => () => {},
    onConnection: () => () => {},
    runs: async () => (started ? [run] : []),
    events: async (_id, after) => log.filter((e) => e.seq > after),
    send: async (body) => {
      sent.push(body);
      const answer = await send(body);
      started = true;
      return answer;
    },
  };
  const consent = { getMe: vi.fn(), patchPod: vi.fn() };
  const engine: LessonEngine = {
    conversations: { createConversation: vi.fn() },
    transport,
    consent: consent as unknown as LessonEngine["consent"],
    ratings: null,
    give: null,
  };
  return { engine, sent, consent };
}

async function workspace(engine: LessonEngine, forLearner: LearnerId | null = null): Promise<void> {
  await act(async () => {
    render(
      <LessonWorkspace
        language="pl"
        conversation={CONVERSATION}
        engine={engine}
        learners={[]}
        forLearner={forLearner}
        onForChange={() => {}}
        onAddChild={() => {}}
      />,
    );
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  // Each test opens on the chat alone: a preview a test opened by its link stays in that test.
  window.history.replaceState(null, "", `/parent/lessons/${CONVERSATION}`);
});
afterEach(cleanup);

describe("the lesson workspace on the engine", () => {
  it("sends the first screen's words once, then draws the turn, its state and its lesson", async () => {
    const { engine, sent } = engineWith();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(engine);
    expect(sent.filter((b) => b.kind === "message").map((b) => "text" in b && b.text)).toEqual([
      "Odejmowanie przez 10",
    ]);
    expect(sent[0]?.conversation_id).toBe(CONVERSATION);
    expect(window.sessionStorage.getItem(`jw.parent.first.${CONVERSATION}`)).toBeNull();
    expect(await screen.findByText("Your lesson is ready on the right.")).toBeTruthy();
    expect(
      document.querySelector("[data-object-card='lesson']")?.getAttribute("data-revision"),
    ).toBe("2");
    expect(
      document.querySelector("[data-chat-band] [data-status]")?.getAttribute("data-status"),
    ).toBe("done");

    // A remount (a reload) finds the turn and sends nothing more.
    cleanup();
    await workspace(engine);
    expect(sent.filter((b) => b.kind === "message")).toHaveLength(1);
  });

  it("posts the first screen's photos on its first message, once (dl-z5ja.11.16)", async () => {
    const photo = AttachmentId.parse(
      idOf(ID_PREFIXES.attachment, "00000000-0000-4000-8000-000000000001"),
    );
    const { engine, sent } = engineWith();
    firstMessage.put(CONVERSATION, { text: "Zadanie ze zdjęcia", attachment_ids: [photo] });
    await workspace(engine);
    const messages = sent.filter((b) => b.kind === "message");
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ text: "Zadanie ze zdjęcia", attachment_ids: [photo] });

    cleanup();
    await workspace(engine);
    expect(sent.filter((b) => b.kind === "message")).toHaveLength(1);
  });

  it("posts nothing for a kept first message with no words and no photo that reads", async () => {
    const { engine, sent } = engineWith();
    window.sessionStorage.setItem(
      `jw.parent.first.${CONVERSATION}`,
      JSON.stringify({ text: "", attachment_ids: ["not-an-id"] }),
    );
    await workspace(engine);
    expect(sent.filter((b) => b.kind === "message")).toHaveLength(0);
  });

  it("sends an older tab's plain words with no photos", async () => {
    const { engine, sent } = engineWith();
    window.sessionStorage.setItem(`jw.parent.first.${CONVERSATION}`, "Odejmowanie przez 10");
    await workspace(engine);
    expect(sent[0]).toMatchObject({ kind: "message", text: "Odejmowanie przez 10" });
    expect(sent[0]).not.toHaveProperty("attachment_ids");
  });

  it("sends Dla as the first message's page, and no page without one (dl-uukj.47.12)", async () => {
    const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
    const withChild = engineWith();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(withChild.engine, OLA);
    expect(withChild.sent[0]).toMatchObject({ kind: "message", context: { learner_id: OLA } });
    cleanup();
    window.sessionStorage.clear();
    const without = engineWith();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(without.engine);
    expect(without.sent[0]?.kind).toBe("message");
    expect(without.sent[0]).not.toHaveProperty("context");
  });

  it("says there is no such lesson when the routes refuse the conversation (dl-uukj.47.33)", async () => {
    for (const status of [404, 403]) {
      const { engine } = engineWith();
      engine.transport.runs = async () => {
        throw new ApiError("no such conversation", status, null);
      };
      await workspace(engine);
      const missing = document.querySelector("[data-not-found]") as HTMLElement;
      expect(missing.textContent).toContain(
        "Nie ma tu takiej lekcji. Może należy do innego konta albo została usunięta.",
      );
      const link = screen.getByRole("link", { name: "Nowa lekcja" });
      expect(link.getAttribute("href")).toBe("/parent");
      // No 3 columns, and nothing stuck on restoring.
      expect(document.querySelector("[data-workspace]")).toBeNull();
      cleanup();
    }
  });

  it("keeps the workspace, stalled, when a restore fails for any other reason", async () => {
    const { engine } = engineWith();
    engine.transport.runs = async () => {
      throw new Error("the network went away");
    };
    await workspace(engine);
    expect(document.querySelector("[data-not-found]")).toBeNull();
    expect(document.querySelector("[data-workspace]")).not.toBeNull();
    expect(
      document.querySelector("[data-chat-band] [data-status]")?.getAttribute("data-status"),
    ).toBe("stalled");
  });

  it("opens on a waiting line with no words to send, and sends nothing", async () => {
    // The preview, opened by its link, says the lesson is still to come.
    window.history.replaceState(
      null,
      "",
      `/parent/lessons/${CONVERSATION}?open=lesson:${CONVERSATION}`,
    );
    const { engine, sent } = engineWith();
    await workspace(engine);
    expect(sent).toEqual([]);
    expect(document.querySelector("[data-lesson-waiting]")).not.toBeNull();
  });

  it("asks for the pod's consent when the route refuses, and sends the words again once given", async () => {
    let refuse = true;
    const { engine, sent, consent } = engineWith(async () => {
      if (refuse) throw new ApiError("no consent", 409, "AiConsentMissing");
      return run;
    });
    consent.getMe.mockResolvedValue({ pod: { id: "pod_00000000000000000000000001" } });
    consent.patchPod.mockResolvedValue({});
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(engine);
    const agree = await screen.findByRole("button", { name: /Zgadzam/ });
    refuse = false;
    await act(async () => fireEvent.click(agree));
    expect(consent.patchPod).toHaveBeenCalled();
    expect(sent.filter((b) => b.kind === "message")).toHaveLength(2);
    expect(await screen.findByText("Your lesson is ready on the right.")).toBeTruthy();
  });

  it("gives the parent's chat no Stop button, a round send, and the composer's words", async () => {
    const { engine } = engineWith();
    await workspace(engine);
    expect(screen.queryByRole("button", { name: "Zatrzymaj" })).toBeNull();
    const box = screen.getByRole("textbox", { name: /Twoja wiadomość|Wiadomość/ });
    expect(box.getAttribute("placeholder")).toBe("Możesz pisać dalej…");
    const sendButton = document.querySelector("[data-variant=parent] [data-send]");
    expect(sendButton?.getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(box, { target: { value: "Dodaj jedno zadanie" } });
    expect(sendButton?.getAttribute("aria-disabled")).toBe("false");
  });
});

/** A turn that is sent and then never heard from: the live channel and the state are the test's. */
function quietEngine() {
  const queued: Run = { ...run, status: "queued" };
  let started = false;
  let push: (events: readonly RunEvent[]) => void = () => {};
  let link: (state: "up" | "down" | "error") => void = () => {};
  const reads = { runs: 0 };
  const sent: SendBody[] = [];
  const transport: EngineTransport = {
    subscribe: (_run, onEvents) => {
      push = onEvents;
      return () => {};
    },
    onConnection: (on) => {
      link = on;
      return () => {};
    },
    runs: async () => {
      reads.runs += 1;
      return started ? [queued] : [];
    },
    events: async () => [],
    send: async (body) => {
      sent.push(body);
      started = true;
      return queued;
    },
  };
  const engine: LessonEngine = {
    conversations: { createConversation: vi.fn() },
    transport,
    consent: null,
    ratings: null,
    give: null,
  };
  return {
    engine,
    sent,
    reads,
    push: (events: readonly RunEvent[]) => push(events),
    link: (state: "up" | "down" | "error") => link(state),
  };
}

const band = () => document.querySelector("[data-chat-band] [data-status]")?.textContent ?? "";
const live = () => document.querySelector("[data-chat-band] [data-live]")?.textContent ?? "";
const placeholder = () => document.querySelector("[data-lesson-waiting]")?.textContent ?? "";
/** The newest turn spine's phase (dl-uukj.47.71.3): the thread's one working indicator. */
const activity = () =>
  [...document.querySelectorAll("[data-spine]")].at(-1)?.getAttribute("data-spine") ?? null;
const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe("one honest run state (dl-uukj.47.29)", () => {
  // The page's clock ticks here, from the unit tests' pinned FIXED_NOW, and is pinned again after.
  beforeEach(() => {
    vi.useFakeTimers({
      now: FIXED_NOW,
      toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"],
    });
  });
  afterEach(() => {
    vi.useFakeTimers({ now: FIXED_NOW, toFake: ["Date"] });
  });

  it("echoes the words before any event, goes slow at 20 s with one read back, stalled at 60 s", async () => {
    const q = quietEngine();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(q.engine);
    // The echo, at once: the parent's bubble with the words, and the turn queued.
    const echo = document.querySelector("[data-pending] [data-bubble]");
    expect(echo?.textContent).toBe("Odejmowanie przez 10");
    expect(band()).toMatch(/^W kolejce/);
    expect(activity()).toBe("queued");
    // The page's one polite live region (§3, dl-uukj.47.71.10), saying only the live words.
    expect(document.querySelectorAll("[aria-live]")).toHaveLength(1);
    expect(live()).toBe("Jadwigo pracuje");

    const before = q.reads.runs;
    await tick(20_000);
    expect(band()).toMatch(/^To trwa dłużej niż zwykle · 20 s/);
    expect(q.reads.runs).toBe(before + 1);
    await tick(20_000);
    // Read back once on entering slow, not again while it stays slow.
    expect(q.reads.runs).toBe(before + 1);

    await tick(20_000);
    expect(band()).toMatch(/^Utknęło/);
    expect(band()).not.toMatch(/Nie udało się/);
    expect(live()).toBe("Utknęło");
    expect(screen.getByRole("button", { name: "Spróbuj ponownie" })).toBeTruthy();
    // The spine's stalled foot (S11): Spróbuj ponownie and Czekaj dalej, no run id in view.
    expect(document.querySelector("[data-foot='stalled']")?.textContent).toContain(
      "Nic się nie dzieje od minuty.",
    );
    expect(screen.getByRole("button", { name: "Czekaj dalej" })).toBeTruthy();
  });

  it("comes back from slow when a late event arrives", async () => {
    const q = quietEngine();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(q.engine);
    await tick(30_000);
    expect(activity()).toBe("slow");
    await act(async () => q.push(events.filter((e) => e.seq <= 5)));
    expect(activity()).toBe("tool");
    expect(band()).toMatch(/^Układanie lekcji/);
  });

  it("says a channel error as stalled, not failed", async () => {
    const q = quietEngine();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(q.engine);
    await act(async () => q.link("error"));
    expect(activity()).toBe("stalled");
    expect(band()).toMatch(/^Utknęło/);
  });

  it("retrying a stalled turn cancels it, and sends its words as a new turn once it has ended", async () => {
    const q = quietEngine();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(q.engine);
    await tick(60_000);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" })),
    );
    // The cancel only asks the turn to end: the words wait, or they would join the ending turn.
    expect(q.sent.map((b) => b.kind)).toEqual(["message", "cancel"]);
    // The turn ends cancelled; then the words go, opening a turn of their own.
    const end = (seq: number, from: RunEvent) =>
      RunEvent.parse({ ...from, seq, event_id: `00000000-0000-4000-800b-00000000000${seq}` });
    const status = events.find((e) => e.type === "status" && e.seq > 2) as RunEvent;
    const complete = events.find((e) => e.type === "turn_complete") as RunEvent;
    await act(async () =>
      q.push([
        end(1, { ...status, payload: { status: "cancelled" } } as RunEvent),
        end(2, complete),
      ]),
    );
    expect(q.sent.map((b) => b.kind)).toEqual(["message", "cancel", "message"]);
    const last = q.sent.at(-1);
    expect(last?.kind === "message" && last.text).toBe("Odejmowanie przez 10");
  });

  it("says one state in the band, the preview's placeholder and the live region", async () => {
    window.history.replaceState(
      null,
      "",
      `/parent/lessons/${CONVERSATION}?open=lesson:${CONVERSATION}`,
    );
    const q = quietEngine();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(q.engine);
    for (const [wait, words, spine] of [
      [0, "W kolejce", "queued"],
      [20_000, "To trwa dłużej niż zwykle", "slow"],
      [40_000, "Utknęło", "stalled"],
    ] as const) {
      await tick(wait);
      expect(band().startsWith(words)).toBe(true);
      expect(placeholder()).toBe(words);
      // The thread's spine reads the same phase (dl-uukj.47.71.3).
      expect(activity()).toBe(spine);
    }
    expect(live()).toBe("Utknęło");
  });
});

describe("opening things from the chat (dl-uukj.47.58, dl-1eieq.1)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", `/parent/lessons/${CONVERSATION}`);
  });

  /** The preview over the chat, or null while it is shut. */
  const preview = () => document.querySelector<HTMLElement>("[data-preview-dialog]");

  it("the lesson card's expand button opens the lesson in the preview, and Zamknij shuts it", async () => {
    const { engine } = engineWith();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(engine);
    await screen.findByText("Your lesson is ready on the right.");
    expect(preview()).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Podgląd lekcji: / }));
    });
    expect(window.location.search).toBe(`?open=lesson%3A${CONVERSATION}`);
    const dialog = preview() as HTMLElement;
    expect(dialog.querySelector("[data-preview-body] [data-step]")).not.toBeNull();
    // The card's actions again in the preview's foot.
    expect(dialog.querySelector("[data-preview-actions] [data-give]")).not.toBeNull();
    expect(dialog.querySelector("[data-preview-actions] [data-print]")).not.toBeNull();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Zamknij" }));
    });
    expect(window.location.search).toBe("");
    expect(preview()).toBeNull();
  });

  it("a link that opens a child of the family draws their panel: the name, the way to their page (dl-uukj.47.59)", async () => {
    // A made-up child of the family: the panel reads only what the list holds.
    const child = {
      id: LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq"),
      pod_id: "pod_00000000000000000000000001",
      handle: "ola",
      first_name: "Ola",
      created_at: "2026-10-28T14:02:06.274Z",
    } as unknown as Learner;
    window.history.replaceState(
      null,
      "",
      `/parent/lessons/${CONVERSATION}?open=learner:${child.id}`,
    );
    const { engine } = engineWith();
    await act(async () => {
      render(
        <LessonWorkspace
          language="pl"
          conversation={CONVERSATION}
          engine={engine}
          learners={[child]}
          forLearner={null}
          onForChange={() => {}}
          onAddChild={() => {}}
        />,
      );
    });
    expect(screen.getByRole("dialog", { name: "Ola" })).toBeTruthy();
    expect(document.querySelector(`[data-learner-panel='${child.id}']`)).not.toBeNull();
    expect(screen.getByRole("link", { name: "Strona dziecka: Ola" }).getAttribute("href")).toBe(
      `/parent/children/${child.id}`,
    );
  });

  it("a link that opens a child the family lacks says so and reads nothing", async () => {
    const learner = "lrn_00000000000000000000000001";
    window.history.replaceState(
      null,
      "",
      `/parent/lessons/${CONVERSATION}?open=learner:${learner}`,
    );
    const { engine } = engineWith();
    await workspace(engine);
    expect(preview()).not.toBeNull();
    expect(document.querySelector("[data-learner-panel='unknown']")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /^Strona dziecka/ })).toBeNull();
  });
});

describe("Daj lekcję from the card (dl-uukj.47.55; steward on #747)", () => {
  beforeEach(() => window.history.replaceState(null, "", `/parent/lessons/${CONVERSATION}`));
  // A made-up child of the family, and the happy turn with its lesson_check passed, so it can be given.
  const ola = {
    id: LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq"),
    pod_id: "pod_00000000000000000000000001",
    handle: "ola",
    first_name: "Ola",
    created_at: "2026-10-28T14:02:06.274Z",
  } as unknown as Learner;
  const checked = events.map((e) =>
    e.type === "tool_result" && e.payload.verb === "lesson_check"
      ? RunEvent.parse({
          ...e,
          payload: {
            ...e.payload,
            view: { kind: "lesson_check", data: { publishable: true, findings: [] } },
          },
        })
      : e,
  );
  const ASSIGNMENT = "asg_00000000000000000000000001";

  let workspace: (forLearner: LearnerId | null) => ReactElement;

  async function giving(
    giveLesson: ReturnType<typeof vi.fn>,
    forLearner: LearnerId | null = ola.id,
  ) {
    const { engine } = engineWith(async () => run, checked);
    engine.give = { giveLesson } as unknown as LessonEngine["give"];
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    workspace = (learner) => (
      <LessonWorkspace
        language="pl"
        conversation={CONVERSATION}
        engine={engine}
        learners={[ola]}
        forLearner={learner}
        onForChange={() => {}}
        onAddChild={() => {}}
      />
    );
    let view: ReturnType<typeof render> | undefined;
    await act(async () => {
      view = render(workspace(forLearner));
    });
    await screen.findByText("Your lesson is ready on the right.");
    await act(async () => {
      fireEvent.click(document.querySelector("[data-give]") as HTMLElement);
    });
    return view as ReturnType<typeof render>;
  }

  it("gives the revision shown to the Dla child and shows the child's link", async () => {
    const giveLesson = vi.fn(async () => ({ assignment: { id: ASSIGNMENT } }));
    await giving(giveLesson);
    expect(giveLesson).toHaveBeenCalledWith(CONVERSATION, {
      revision: expect.any(Number),
      learner_id: ola.id,
    });
    expect(document.querySelector("[data-given]")?.textContent).toContain("Lekcja czeka na: Ola.");
    expect(screen.getByRole("link", { name: "Otwórz lekcję" }).getAttribute("href")).toBe(
      `/play/${ASSIGNMENT}?learner=${ola.id}`,
    );
  });

  it("with no child gives a link anyone may play, and stays in the chat", async () => {
    const giveLesson = vi.fn(async () => ({ assignment: { id: ASSIGNMENT } }));
    await giving(giveLesson, null);
    expect(giveLesson).toHaveBeenCalledWith(CONVERSATION, { revision: expect.any(Number) });
    expect(screen.getByRole("link", { name: "Otwórz lekcję" }).getAttribute("href")).toBe(
      `/play/${ASSIGNMENT}`,
    );
    expect(window.location.pathname).not.toContain("/play/");
  });

  it("takes the link away when the Dla child changes", async () => {
    const giveLesson = vi.fn(async () => ({ assignment: { id: ASSIGNMENT } }));
    const { rerender } = await giving(giveLesson);
    expect(document.querySelector("[data-given]")).not.toBeNull();
    await act(async () => rerender(workspace(null)));
    expect(document.querySelector("[data-given]")).toBeNull();
  });

  it("words a refusal: a lesson changed since its check, and any other failure", async () => {
    await giving(
      vi.fn(async () => {
        throw new ApiError("not publishable", 409, "LessonNotPublishable");
      }),
    );
    expect(document.querySelector("[data-give-state]")?.textContent).toMatch(
      /^Lekcja zmieniła się od ostatniego sprawdzenia/,
    );
    cleanup();
    await giving(
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    expect(document.querySelector("[data-give-state]")?.textContent).toBe(
      "Nie udało się dać lekcji. Spróbuj jeszcze raz.",
    );
  });
});
