/**
 * The Lekcje table against a double of the conversation list's route: a row per conversation with
 * its title (or the untitled line), "Bez dziecka" rows muted, the filter and the search narrowing
 * the rows, the empty and no-match lines, and Archive, which asks once and takes the row away only
 * after the route answers (dl-uukj.47.9).
 */

import type { ConversationListClient } from "@jadwigo/api-client";
import { type Conversation, type ConversationId, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LessonsTable } from "./LessonsTable.tsx";
import { useLessons } from "./useLessons.ts";

const AT = "2026-10-28T14:02:06.274Z";
const OLA = {
  id: LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq"),
  pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
  handle: "ola",
  first_name: "Ola",
  school_grade: 2,
  created_at: AT,
} as never;

const conversation = (n: number, title: string | null): Conversation =>
  ({
    id: `cnv_0000000000000000000000000${n}`,
    pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
    created_by: "acc_7qre3atahx8cpak6xbjtz73var",
    title,
    created_at: AT,
    archived_at: null,
  }) as Conversation;

const refused = (): never => {
  throw new Error("not called in this test");
};

const listOf = (
  conversations: Conversation[],
  changes: Partial<ConversationListClient> = {},
): ConversationListClient => ({
  listConversations: async () => ({ conversations }),
  patchConversation: refused,
  ...changes,
});

/** The table as the page wires it: its rows and Archive from useLessons. */
function Wired({
  list,
  language = "pl",
}: {
  list: ConversationListClient;
  language?: "pl" | "en";
}) {
  const lessons = useLessons(list, "lessons");
  return (
    <LessonsTable
      language={language}
      learners={[OLA]}
      lessons={lessons.rows}
      onArchive={lessons.archive}
    />
  );
}

afterEach(cleanup);

async function shown(
  conversations: Conversation[],
  changes: Partial<ConversationListClient> = {},
): Promise<void> {
  render(<Wired list={listOf(conversations, changes)} />);
  await screen.findByRole("table");
}

const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>("[data-lesson-row]")];

describe("LessonsTable", () => {
  it("lists each conversation, opening its workspace, with no child in muted ink", async () => {
    await shown([conversation(1, "Odejmowanie przez 10"), conversation(2, null)]);
    expect(rows()).toHaveLength(2);
    const link = screen.getByRole("link", { name: "Odejmowanie przez 10" });
    expect(link.getAttribute("href")).toBe("/parent/lessons/cnv_00000000000000000000000001");
    expect(screen.getByRole("link", { name: "Lekcja bez tytułu" })).toBeTruthy();
    const [first] = rows();
    expect(first?.hasAttribute("data-no-child")).toBe(true);
    expect(first?.className).toContain("text-jw-ink-soft");
    expect(within(first as HTMLElement).getByText("Bez dziecka")).toBeTruthy();
  });

  it("offers Wszystkie, each child and Bez dziecka as the filter", async () => {
    await shown([conversation(1, "Odejmowanie przez 10")]);
    const filter = screen.getByRole("radiogroup", { name: "Pokaż" });
    const choices = within(filter)
      .getAllByRole("radio")
      .map((radio) => radio.textContent);
    expect(choices).toEqual(["Wszystkie", "Ola", "Bez dziecka"]);
    expect(
      within(filter).getByRole("radio", { name: "Wszystkie" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("narrows the rows to a child's, and says so when none match", async () => {
    await shown([conversation(1, "Odejmowanie przez 10")]);
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "Ola" })));
    expect(rows()).toHaveLength(0);
    expect(screen.getByText("Nic tu nie pasuje do wyboru.")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "Bez dziecka" })));
    expect(rows()).toHaveLength(1);
  });

  it("searches the titles without case or accents", async () => {
    await shown([conversation(1, "Odejmowanie przez 10"), conversation(2, "Żółw liczy kroki")]);
    const search = screen.getByRole("searchbox", { name: "Szukaj" });
    fireEvent.change(search, { target: { value: "zolw" } });
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining("Żółw liczy kroki"),
    ]);
    fireEvent.change(search, { target: { value: "mnożenie" } });
    expect(rows()).toHaveLength(0);
    expect(screen.getByText("Nic tu nie pasuje do wyboru.")).toBeTruthy();
    fireEvent.change(search, { target: { value: "" } });
    expect(rows()).toHaveLength(2);
  });

  it("shows the structure and one muted line before the first lesson", async () => {
    await shown([]);
    expect(screen.getByRole("searchbox", { name: "Szukaj" })).toBeTruthy();
    expect(screen.getByText("Tu pojawią się lekcje, które przygotujesz.")).toBeTruthy();
    expect(screen.queryByText("Nic tu nie pasuje do wyboru.")).toBeNull();
  });

  it("starts a new lesson from the row atop the table, with lessons and without", async () => {
    for (const conversations of [[conversation(1, "Odejmowanie przez 10")], []]) {
      await shown(conversations);
      const row = screen.getByRole("link", { name: "Nowa lekcja" });
      expect(row.getAttribute("href")).toBe("/parent");
      expect(row.hasAttribute("data-new-lesson-row")).toBe(true);
      // First: before the table and every lesson in it.
      const table = screen.getByRole("table");
      expect(row.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      window.history.replaceState(null, "", "/parent/lessons");
      await act(async () => fireEvent.click(row));
      expect(window.location.pathname).toBe("/parent");
      cleanup();
    }
  });

  it("archives a row after asking once, and only once the route answers", async () => {
    let answer: () => void = () => {};
    const patchConversation = vi.fn(
      (id: ConversationId) =>
        new Promise<Conversation>((resolve) => {
          answer = () =>
            resolve({ ...conversation(1, "Odejmowanie przez 10"), id, archived_at: AT });
        }),
    );
    await shown([conversation(1, "Odejmowanie przez 10"), conversation(2, "Żółw liczy kroki")], {
      patchConversation,
    });
    const [first] = rows();
    await act(async () =>
      fireEvent.click(within(first as HTMLElement).getByRole("button", { name: "Archiwizuj" })),
    );
    expect(
      screen.getByText(
        "Rozmowa zniknie z listy. Zostanie zachowana przy koncie rodziny i usunięta razem z nim.",
      ),
    ).toBeTruthy();
    expect(patchConversation).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tak, archiwizuj" })));
    expect(patchConversation).toHaveBeenCalledWith("cnv_00000000000000000000000001", {
      archived: true,
    });
    // Asked, not yet answered: the row stays.
    expect(rows()).toHaveLength(2);
    await act(async () => answer());
    expect(rows()).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Odejmowanie przez 10" })).toBeNull();
  });

  it("keeps the row and says so when archiving fails", async () => {
    await shown([conversation(1, "Odejmowanie przez 10")], {
      patchConversation: async () => {
        throw new Error("503");
      },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Archiwizuj" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tak, archiwizuj" })));
    expect(rows()).toHaveLength(1);
    expect(screen.getByRole("alert").textContent).toBe(
      "Nie udało się zarchiwizować rozmowy. Spróbuj jeszcze raz.",
    );
  });

  it("cancels an archive without calling the route", async () => {
    const patchConversation = vi.fn(refused);
    await shown([conversation(1, "Odejmowanie przez 10")], { patchConversation });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Archiwizuj" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Anuluj" })));
    expect(document.querySelector("[data-archive-confirm]")).toBeNull();
    expect(patchConversation).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(1);
  });

  it("says it could not load when the route fails", async () => {
    render(
      <Wired
        language="en"
        list={listOf([], {
          listConversations: async () => {
            throw new Error("503");
          },
        })}
      />,
    );
    expect(await screen.findByText(/Reload the page/)).toBeTruthy();
  });
});
