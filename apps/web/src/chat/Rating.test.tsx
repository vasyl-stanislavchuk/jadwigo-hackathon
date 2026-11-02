import type { RunRatingClient } from "@jadwigo/api-client";
import { type Run, RunEvent, RunId, type RunRatingCreate } from "@jadwigo/contracts/run";
import { foldRun, type RunView } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane } from "./ChatPane.tsx";
import { ChatScreen } from "./ChatScreen.tsx";
import type { Turn } from "./conversation.ts";
import type { EngineTransport } from "./useConversation.ts";

afterEach(cleanup);

const eventsOf = (name: string): RunEvent[] =>
  (RUN_LOGS.find((l) => l.name === name)?.events ?? []).map((e) => RunEvent.parse(e));

/** A golden log's turn, its run as the log left it. */
function turnOf(name: string, id?: string): Turn {
  const events = eventsOf(name);
  const view: RunView = foldRun(events);
  const run = {
    id: RunId.parse(id ?? events[0]?.run_id),
    status: view.status ?? "in_progress",
  } as unknown as Run;
  return { run, view };
}

/** The pane over `turns`, with a rating route that answers `answer`. */
function pane(turns: Turn[], answer: () => Promise<unknown> = async () => ({})) {
  const rated: [RunId, RunRatingCreate][] = [];
  const onSend = vi.fn();
  render(
    <ChatPane
      language="pl"
      turns={turns}
      queued={[]}
      restoring={false}
      stopping={false}
      sendFailed={false}
      onSend={onSend}
      onStop={() => {}}
      onRate={(run, body) => {
        rated.push([run, body]);
        return answer();
      }}
    />,
  );
  return { rated, onSend };
}

const bands = () =>
  [...document.querySelectorAll("[data-rating]")].map((b) => b.getAttribute("data-rating"));

const SECOND = "run_00000000000000000000000099";

describe("Good, Bad and Try again on each completed turn (dl-z5ja.63)", () => {
  it("draws the 3 controls once per completed turn, carrying its run id", () => {
    const first = turnOf("happy-turn");
    pane([first, turnOf("happy-turn", SECOND)]);
    expect(bands()).toEqual([first.run.id, SECOND]);
    expect(screen.getAllByRole("button", { name: "Dobrze" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Słabo" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Spróbuj jeszcze raz" })).toHaveLength(2);
  });

  it("draws none on a turn still running", () => {
    pane([turnOf("reload-with-duplicates")]);
    expect(bands()).toEqual([]);
  });

  it("Dobrze posts good with the run id, then thanks", async () => {
    const turn = turnOf("happy-turn");
    const { rated } = pane([turn]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Dobrze" })));
    expect(rated).toEqual([[turn.run.id, { verdict: "good" }]]);
    expect(screen.getByText("Dziękujemy, ocena jest zapisana.")).toBeTruthy();
  });

  it("Słabo asks what was missing, and posts bad with the note", async () => {
    const turn = turnOf("happy-turn");
    const { rated } = pane([turn]);
    fireEvent.click(screen.getByRole("button", { name: "Słabo" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Czego zabrakło?" }), {
      target: { value: " więcej przykładów z życia " },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Wyślij ocenę" })));
    expect(rated).toEqual([[turn.run.id, { verdict: "bad", note: "więcej przykładów z życia" }]]);
  });

  it("Słabo with no note posts bad alone", async () => {
    const turn = turnOf("happy-turn");
    const { rated } = pane([turn]);
    fireEvent.click(screen.getByRole("button", { name: "Słabo" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Wyślij ocenę" })));
    expect(rated).toEqual([[turn.run.id, { verdict: "bad" }]]);
  });

  it("a rating the route refuses says so, and the controls stay", async () => {
    pane([turnOf("happy-turn")], async () => {
      throw new Error("offline");
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Dobrze" })));
    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się zapisać oceny. Spróbuj jeszcze raz.",
    );
    expect(screen.getByRole("button", { name: "Dobrze" })).toBeTruthy();
  });

  it("Spróbuj jeszcze raz sends the turn's message again", () => {
    const turn = turnOf("happy-turn");
    const said = turn.view.chat.find((i) => i.kind === "message" && i.from === "parent");
    const { onSend } = pane([turn]);
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj jeszcze raz" }));
    expect(onSend).toHaveBeenCalledWith(said?.kind === "message" ? said.text : "");
  });
});

describe("the chat page rates through the route (dl-z5ja.63)", () => {
  it("posts the rating with the run id through the rating client", async () => {
    const events = eventsOf("happy-turn");
    const run = { id: RunId.parse(events[0]?.run_id), status: "completed" } as unknown as Run;
    const transport: EngineTransport = {
      subscribe: () => () => {},
      onConnection: () => () => {},
      runs: async () => [run],
      events: async () => events,
      send: async () => run,
    };
    const rated: unknown[] = [];
    const ratings: RunRatingClient = {
      rateRun: async (id, body) => {
        rated.push([id, body]);
        return {} as never;
      },
    };
    render(<ChatScreen transport={transport} ratings={ratings} />);
    const good = await screen.findByRole("button", { name: "Dobrze" });
    await act(async () => fireEvent.click(good));
    expect(rated).toEqual([[run.id, { verdict: "good" }]]);
  });
});
