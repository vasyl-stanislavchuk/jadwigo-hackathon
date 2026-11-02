import type { ConversationListClient } from "@jadwigo/api-client";
import { type Conversation, ConversationId } from "@jadwigo/contracts/run";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatScreen } from "./ChatScreen.tsx";
import { ConversationList } from "./ConversationList.tsx";
import type { EngineTransport } from "./useConversation.ts";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

const FIRST = ConversationId.parse("cnv_00000000000000000000000011");
const SECOND = ConversationId.parse("cnv_00000000000000000000000012");

const row = (id: ConversationId, title: string | null): Conversation =>
  ({
    id,
    pod_id: "pod_00000000000000000000000001",
    created_by: "acc_00000000000000000000000001",
    title,
    created_at: "2026-11-01T10:00:00.000Z",
    archived_at: null,
  }) as Conversation;

/** The list routes over 2 made-up conversations; `archive` decides each PATCH's answer. */
function routes(archive: () => Promise<void> = async () => {}) {
  const patched: unknown[] = [];
  const api: ConversationListClient = {
    listConversations: async () => ({
      conversations: [row(FIRST, "Mnożenie do 50"), row(SECOND, null)],
    }),
    patchConversation: async (id, body) => {
      patched.push([id, body]);
      await archive();
      return { ...row(id, null), archived_at: "2026-11-01T11:00:00.000Z" };
    },
  };
  return { api, patched };
}

const draw = (api: ConversationListClient, opened: ConversationId[] = []) =>
  render(
    <ConversationList language="pl" api={api} current={null} onOpen={(id) => opened.push(id)} />,
  );

const rows = () =>
  [...document.querySelectorAll("[data-conversation]")].map((r) =>
    r.getAttribute("data-conversation"),
  );

describe("a parent's conversation list (dl-z5ja.106)", () => {
  it("lists the live conversations from the route, an untitled one named so", async () => {
    draw(routes().api);
    expect(await screen.findByText("Mnożenie do 50")).toBeTruthy();
    expect(screen.getByText("Rozmowa bez tytułu")).toBeTruthy();
    expect(rows()).toEqual([FIRST, SECOND]);
  });

  it("says so when there is none", async () => {
    draw({ ...routes().api, listConversations: async () => ({ conversations: [] }) });
    expect(await screen.findByText("Nie masz jeszcze żadnej rozmowy.")).toBeTruthy();
  });

  it("opens one", async () => {
    const opened: ConversationId[] = [];
    draw(routes().api, opened);
    fireEvent.click(await screen.findByText("Mnożenie do 50"));
    expect(opened).toEqual([FIRST]);
  });

  it("Archive asks with what it does, and removes the row only after the route answers", async () => {
    let answer = () => {};
    const r = routes(() => new Promise<void>((resolve) => (answer = resolve)));
    draw(r.api);
    await screen.findByText("Mnożenie do 50");
    fireEvent.click(document.querySelector(`[data-archive='${FIRST}']`) as HTMLElement);
    expect(document.querySelector("[data-archive-confirm]")?.textContent).toContain(
      "Rozmowa zniknie z listy. Zostanie zachowana przy koncie rodziny i usunięta razem z nim.",
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tak, archiwizuj" })));
    expect(r.patched).toEqual([[FIRST, { archived: true }]]);
    expect(rows()).toEqual([FIRST, SECOND]);
    await act(async () => answer());
    expect(rows()).toEqual([SECOND]);
  });

  it("a failed archive keeps the row and says so", async () => {
    const r = routes(async () => {
      throw new Error("offline");
    });
    draw(r.api);
    await screen.findByText("Mnożenie do 50");
    fireEvent.click(document.querySelector(`[data-archive='${FIRST}']`) as HTMLElement);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tak, archiwizuj" })));
    expect(rows()).toEqual([FIRST, SECOND]);
    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się zarchiwizować rozmowy. Spróbuj jeszcze raz.",
    );
  });

  it("Anuluj leaves it as it was", async () => {
    const r = routes();
    draw(r.api);
    await screen.findByText("Mnożenie do 50");
    fireEvent.click(document.querySelector(`[data-archive='${FIRST}']`) as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    expect(document.querySelector("[data-archive-confirm]")).toBeNull();
    expect(r.patched).toEqual([]);
  });
});

describe("the chat page opens a conversation from the list (dl-z5ja.106)", () => {
  it("reads the opened conversation's runs by its server id", async () => {
    const asked: string[] = [];
    const transport: EngineTransport = {
      subscribe: () => () => {},
      onConnection: () => () => {},
      runs: async (id) => {
        asked.push(id);
        return [];
      },
      events: async () => [],
      send: async () => {
        throw new Error("not sent in this test");
      },
    };
    render(<ChatScreen transport={transport} lists={routes().api} />);
    fireEvent.click(await screen.findByText("Mnożenie do 50"));
    await act(async () => {});
    expect(asked.at(-1)).toBe(FIRST);
    expect(window.sessionStorage.getItem(`jadwigo.playground.chat.server.${FIRST}`)).toBe(FIRST);
  });
});
