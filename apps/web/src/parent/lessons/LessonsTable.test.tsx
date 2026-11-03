/**
 * The Lekcje list against a double of the conversation list's route (dl-uukj.47.67.7): rows that
 * open on a click (the checkbox doesn't), the facets, sort and page read from and written to the
 * URL, one child hiding the Dziecko facet and the Dla column, the empty, filtered and error states,
 * and Archive, which asks once and takes the row away only after the route answers.
 */

import type { ConversationListClient } from "@jadwigo/api-client";
import {
  type Conversation,
  type ConversationId,
  type Learner,
  LearnerId,
} from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LessonsTable } from "./LessonsTable.tsx";
import { useLessons } from "./useLessons.ts";

const NOW = new Date("2026-11-04T12:00:00.000Z");
const learner = (id: string, first_name: string): Learner =>
  ({
    id: LearnerId.parse(id),
    pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
    handle: first_name.toLowerCase(),
    first_name,
    school_grade: 2,
    created_at: "2026-10-01T08:00:00.000Z",
  }) as unknown as Learner;
const OLA = learner("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq", "Ola");
const TYMEK = learner("lrn_7qre3atahx8cpak6xbjtz73var", "Tymek");

const conversation = (n: number, title: string | null, at = "2026-10-28T14:02:06.274Z") =>
  ({
    id: `cnv_${String(n).padStart(26, "0")}`,
    pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
    created_by: "acc_7qre3atahx8cpak6xbjtz73var",
    title,
    created_at: at,
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

/** The list as the page wires it: its rows, Archive and the retry from useLessons. */
function Wired({ list, learners }: { list: ConversationListClient; learners: Learner[] }) {
  const lessons = useLessons(list, "lessons");
  return (
    <LessonsTable
      language="pl"
      learners={learners}
      lessons={lessons.rows}
      onArchive={lessons.archive}
      onRetry={lessons.reload}
      now={() => NOW}
    />
  );
}

beforeEach(() => window.history.replaceState(null, "", "/parent/lessons"));
afterEach(cleanup);

async function shown(
  conversations: Conversation[],
  {
    learners = [OLA, TYMEK],
    ...changes
  }: Partial<ConversationListClient> & {
    learners?: Learner[];
  } = {},
): Promise<void> {
  render(<Wired list={listOf(conversations, changes)} learners={learners} />);
  await screen.findByRole("table", { name: "Lekcje" });
}

/** The laptop table's body rows (the phone's list draws them again); none once the table is gone. */
const rows = (): HTMLElement[] => {
  const table = screen.queryByRole("table", { name: "Lekcje" });
  return table === null ? [] : within(table).getAllByRole("row").slice(1);
};
const titles = (): string[] =>
  rows().map((row) => row.querySelector("td:nth-child(2)")?.textContent ?? "");
const params = (): string => window.location.search;

describe("LessonsTable", () => {
  it("lists each conversation newest first, opening its workspace from the row, not its checkbox", async () => {
    await shown([
      conversation(1, "Odejmowanie przez 10", "2026-10-20T09:00:00.000Z"),
      conversation(2, null, "2026-10-28T09:00:00.000Z"),
    ]);
    expect(titles()).toEqual(["Lekcja bez tytułu", "Odejmowanie przez 10"]);
    const [, second] = rows();
    const row = second as HTMLElement;
    expect(within(row).getByText("Bez dziecka").closest("[data-no-child]")).not.toBeNull();
    expect(within(row).getByText("—")).toBeTruthy();
    expect(within(row).getByText("20 paź")).toBeTruthy();

    fireEvent.click(within(row).getByRole("checkbox", { name: "Zaznacz: Odejmowanie przez 10" }));
    expect(window.location.pathname).toBe("/parent/lessons");
    expect(screen.getByText("1 zaznaczona")).toBeTruthy();

    await act(async () => fireEvent.click(within(row).getByText("Odejmowanie przez 10")));
    expect(window.location.pathname).toBe(`/parent/lessons/cnv_${"1".padStart(26, "0")}`);
  });

  it("hides the Dziecko facet and the Dla column with one child", async () => {
    await shown([conversation(1, "Odejmowanie przez 10")]);
    expect(screen.getByRole("button", { name: /Dziecko/ })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Dla" })).toBeTruthy();
    cleanup();
    await shown([conversation(1, "Odejmowanie przez 10")], { learners: [OLA] });
    expect(screen.queryByRole("button", { name: /Dziecko/ })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Dla" })).toBeNull();
    expect(screen.getByRole("button", { name: /Data/ })).toBeTruthy();
  });

  it("offers each child by count with Bez dziecka last, and writes the pick to the URL", async () => {
    await shown([conversation(1, "Odejmowanie przez 10")]);
    fireEvent.click(screen.getAllByRole("button", { name: /Dziecko/ })[0] as HTMLElement);
    const group = await screen.findByRole("group", { name: "Dziecko" });
    const names = within(group)
      .getAllByRole("checkbox")
      .map((box) => box.getAttribute("aria-label") ?? box.textContent);
    expect(names.at(-1)).toContain("Bez dziecka");
    fireEvent.click(within(group).getByRole("checkbox", { name: /Ola/ }));
    expect(params()).toBe(`?dziecko=${OLA.id}`);
    expect(rows()).toHaveLength(0);
    fireEvent.click(within(group).getByRole("checkbox", { name: /Bez dziecka/ }));
    expect(params()).toBe(`?dziecko=${OLA.id}%2Cbez`);
    expect(rows()).toHaveLength(1);
  });

  it("reads its filters, sort and page from the URL, and writes them back", async () => {
    window.history.replaceState(null, "", "/parent/lessons?sort=lekcja&strona=2");
    const many = Array.from({ length: 25 }, (_, i) =>
      conversation(i + 1, `Lekcja ${String(i + 1).padStart(2, "0")}`),
    );
    await shown(many);
    expect(titles()).toEqual(["Lekcja 21", "Lekcja 22", "Lekcja 23", "Lekcja 24", "Lekcja 25"]);
    expect(screen.getByText("21–25 z 25")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Poprzednia strona" }));
    expect(params()).toBe("?sort=lekcja");
    expect(rows()).toHaveLength(20);

    fireEvent.click(screen.getByRole("button", { name: "Lekcja" }));
    expect(params()).toBe("?sort=-lekcja");
    expect(titles()[0]).toBe("Lekcja 25");

    window.history.replaceState(null, "", "/parent/lessons?data=dzis");
    cleanup();
    await shown([conversation(1, "Dziś", "2026-11-04T08:00:00.000Z"), conversation(2, "Wczoraj")]);
    expect(titles()).toEqual(["Dziś"]);
  });

  it("names the filters when nothing matches, and clears them", async () => {
    window.history.replaceState(null, "", `/parent/lessons?data=dzis&dziecko=${OLA.id}`);
    render(
      <Wired list={listOf([conversation(1, "Odejmowanie przez 10")])} learners={[OLA, TYMEK]} />,
    );
    expect(await screen.findByText("Nic nie pasuje do filtrów")).toBeTruthy();
    expect(screen.getByText("Ola · Dziś")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Wyczyść filtry" }));
    expect(params()).toBe("");
    expect(rows()).toHaveLength(1);
  });

  it("says where lessons will be before the first one, with Nowa lekcja", async () => {
    render(<Wired list={listOf([])} learners={[OLA]} />);
    expect(await screen.findByText("Tu będą lekcje")).toBeTruthy();
    expect(
      screen.getByText("Napisz, czego dziecko się uczy, albo wrzuć zdjęcie zadania."),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Nowa lekcja" }).getAttribute("href")).toBe("/parent");
  });

  it("says the read failed, and reads again on Spróbuj ponownie", async () => {
    const listConversations = vi
      .fn<ConversationListClient["listConversations"]>()
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValue({ conversations: [conversation(1, "Odejmowanie przez 10")] });
    render(<Wired list={listOf([], { listConversations })} learners={[OLA]} />);
    expect(await screen.findByText("Nie udało się wczytać lekcji")).toBeTruthy();
    expect(screen.getByText("Sprawdź internet. Twoje lekcje są bezpieczne.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    await screen.findByRole("table", { name: "Lekcje" });
    expect(titles()).toEqual(["Odejmowanie przez 10"]);
  });

  it("archives from the row's menu after asking once, and only once the route answers", async () => {
    let answer: () => void = () => {};
    const patchConversation = vi.fn(
      (id: ConversationId) =>
        new Promise<Conversation>((resolve) => {
          answer = () => resolve({ ...conversation(1, "Odejmowanie przez 10"), id });
        }),
    );
    await shown([conversation(1, "Odejmowanie przez 10"), conversation(2, "Żółw liczy kroki")], {
      patchConversation,
    });
    const more = screen.getByRole("button", { name: "Więcej: Odejmowanie przez 10" });
    fireEvent.keyDown(more, { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Archiwizuj" }));
    expect(await screen.findByText("Zarchiwizować lekcję?")).toBeTruthy();
    expect(patchConversation).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tak, archiwizuj" })));
    expect(patchConversation).toHaveBeenCalledWith(`cnv_${"1".padStart(26, "0")}`, {
      archived: true,
    });
    // Asked, not yet answered: the row stays.
    expect(rows()).toHaveLength(2);
    await act(async () => answer());
    expect(titles()).toEqual(["Żółw liczy kroki"]);
  });

  it("keeps the row and says so when archiving fails", async () => {
    await shown([conversation(1, "Odejmowanie przez 10")], {
      patchConversation: async () => {
        throw new Error("503");
      },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Zaznacz: Odejmowanie przez 10" }));
    fireEvent.click(screen.getByRole("button", { name: "Archiwizuj" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tak, archiwizuj" })));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(
        "Nie udało się zarchiwizować rozmowy. Spróbuj jeszcze raz.",
      ),
    );
    expect(rows()).toHaveLength(1);
  });
});
