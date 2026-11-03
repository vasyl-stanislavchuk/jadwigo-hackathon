// @vitest-environment happy-dom
/**
 * The first screen (dl-uukj.47.2, decision dl-xo0q): the question and one box with the caret in it;
 * "Zrób lekcję" aria-disabled with its reason on focus until there are words; Enter sends,
 * Shift+Enter does not; Dla (the kit's Combobox, dl-uukj.47.67 §6.5) defaults to "Bez dziecka", lists
 * each child with the class, moves by ↑ ↓ and a typed letter, picks with Enter, closes on Esc, and ends
 * with "Dodaj dziecko…", which gives the focus back to Dla. Photos (dl-z5ja.11.16)
 * upload as they are picked, pasted or dropped and show as chips; the send waits for every upload,
 * a failed one holds it until retried, and the send carries the attachment ids. The uploads run on
 * upload.ts's fakes (fakes.test-helpers.ts): no network, no real photo.
 */

import { AttachmentId, ID_PREFIXES, idOf, type Learner, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fileOf,
  type Harness,
  harness,
  settle,
} from "../../chat/attachments/fakes.test-helpers.ts";
import { NewLessonBox } from "./NewLessonBox.tsx";

const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const ola = {
  id: OLA,
  first_name: "Ola",
  school_grade: 2,
  created_at: "2026-10-01T08:00:00.000Z",
} as unknown as Learner;
const TYMEK = LearnerId.parse("lrn_7qre3atahx8cpak6xbjtz73var");
const tymek = {
  id: TYMEK,
  first_name: "Tymek",
  school_grade: null,
  created_at: "2026-10-02T08:00:00.000Z",
} as unknown as Learner;

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

function box(changes: Partial<Parameters<typeof NewLessonBox>[0]> = {}) {
  const props = {
    language: "pl" as const,
    learners: [ola],
    forLearner: null,
    onForChange: vi.fn(),
    onAddChild: vi.fn(),
    onSend: vi.fn(),
    ...changes,
  };
  render(<NewLessonBox {...props} />);
  return props;
}

const field = () => screen.getByRole("textbox", { name: "Opisz zadanie domowe" });
const send = () => screen.getByRole("button", { name: /Zrób lekcję/ });
const dla = () => screen.getByRole("combobox", { name: "Dla" });
/** The words the send button is described by: its reason while it can't send. */
const sendReason = () => {
  const id = send().getAttribute("aria-describedby");
  return id === null ? null : (document.getElementById(id)?.textContent ?? null);
};

describe("the first screen's draft (dl-uukj.47.24)", () => {
  it("keeps the words and Dla across an unmount and a remount", () => {
    box({ forLearner: OLA });
    fireEvent.change(field(), { target: { value: "Odejmowanie przez 10" } });
    cleanup();

    const props = box();
    expect((field() as HTMLTextAreaElement).value).toBe("Odejmowanie przez 10");
    expect(props.onForChange).toHaveBeenCalledWith(OLA);
  });

  it("keeps the child a page names (?for) over the tab's Dla", () => {
    box({ forLearner: OLA });
    cleanup();
    const props = box({ learners: [ola, tymek], forLearner: TYMEK });
    expect(props.onForChange).not.toHaveBeenCalled();
  });

  it("forgets a child who is no longer in the family", () => {
    box({ forLearner: OLA });
    cleanup();
    const props = box({ learners: [] });
    expect(props.onForChange).not.toHaveBeenCalled();
  });

  it("clears the words and Dla once they are sent", () => {
    box({ forLearner: OLA });
    fireEvent.change(field(), { target: { value: "15 − 7" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    cleanup();

    const props = box();
    expect((field() as HTMLTextAreaElement).value).toBe("");
    expect(props.onForChange).not.toHaveBeenCalled();
  });
});

describe("the first screen", () => {
  it("asks one question over one box, with the caret in it and the example as its placeholder", () => {
    box();
    expect(
      screen.getByRole("heading", { level: 1, name: "Jaką lekcję przygotować?" }),
    ).toBeDefined();
    expect(document.activeElement).toBe(field());
    expect(field().getAttribute("placeholder")).toBe(
      "Np. Odejmowanie przez 10. Pomyliła się w 15 − 7 i 12 − 5.",
    );
    // Photos need what they upload through; without it there is no photo button.
    expect(screen.queryByText("Dodaj zdjęcie")).toBeNull();
  });

  it("keeps Zrób lekcję disabled with its reason, on focus too, until there are words", async () => {
    const props = box();
    expect(send().getAttribute("aria-disabled")).toBe("true");
    expect(sendReason()).toBe("Napisz, czego ma się uczyć.");
    // Still focusable, and the reason opens on focus (S5).
    act(() => send().focus());
    expect(document.activeElement).toBe(send());
    expect((await screen.findByRole("tooltip")).textContent).toBe("Napisz, czego ma się uczyć.");
    fireEvent.click(send());
    expect(props.onSend).not.toHaveBeenCalled();

    fireEvent.change(field(), { target: { value: "Odejmowanie przez 10" } });
    expect(send().getAttribute("aria-disabled")).toBe("false");
    expect(sendReason()).toBeNull();
    expect(document.querySelector("[data-new-lesson]")?.hasAttribute("data-ready")).toBe(true);
  });

  it("sends on Enter with the words and the child, and makes a new line on Shift+Enter", () => {
    const props = box({ forLearner: OLA });
    fireEvent.change(field(), { target: { value: "  15 − 7  " } });
    fireEvent.keyDown(field(), { key: "Enter", shiftKey: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(props.onSend).toHaveBeenCalledWith({ text: "15 − 7", attachmentIds: [], learner: OLA });
  });

  it("Dla: Bez dziecka first, each child with the class; ↑ ↓, a typed letter and Enter pick; Esc closes", async () => {
    const props = box({ learners: [ola, tymek] });
    expect(dla().textContent).toContain("Dla");
    expect(dla().textContent).toContain("Bez dziecka");
    act(() => dla().focus());
    fireEvent.keyDown(dla(), { key: "ArrowDown" });
    const list = await screen.findByRole("listbox", { name: "Dla" });
    const options = within(list).getAllByRole("option");
    expect(options.map((o) => [o.textContent, o.getAttribute("aria-selected")])).toEqual([
      ["Bez dziecka", "true"],
      // The disc's initial (hidden from a screen reader), the name, then the class.
      ["OOlaklasa 2", "false"],
      ["TTymek", "false"],
    ]);
    await waitFor(() => expect(document.activeElement).toBe(options[0]));
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]);
    fireEvent.keyDown(document.activeElement as Element, { key: "t" });
    expect(document.activeElement).toBe(options[2]);
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
    fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(props.onForChange).toHaveBeenCalledWith(OLA);
    expect(document.activeElement).toBe(dla());

    await act(async () => fireEvent.click(dla()));
    await screen.findByRole("listbox");
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(document.activeElement).toBe(dla());
    expect(props.onForChange).toHaveBeenCalledOnce();
  });

  it("ends Dla with Dodaj dziecko…, which gives the focus back to Dla before the dialog opens", async () => {
    let focusedAtAdd: Element | null = null;
    const props = box({
      onAddChild: vi.fn(() => {
        focusedAtAdd = document.activeElement;
      }),
    });
    await act(async () => fireEvent.click(dla()));
    await screen.findByRole("listbox");
    fireEvent.keyDown(document.activeElement as Element, { key: "End" });
    const add = screen.getByRole("button", { name: /Dodaj dziecko…/ });
    expect(document.activeElement).toBe(add);
    expect(add.textContent).toContain("Imię i klasa, nic więcej.");
    fireEvent.click(add);
    await waitFor(() => expect(props.onAddChild).toHaveBeenCalledOnce());
    expect(focusedAtAdd).toBe(dla());
  });

  it("shows the chosen child in Dla", () => {
    box({ forLearner: OLA });
    expect(dla().textContent).toContain("Ola");
  });
});

/** The fake api's n-th attachment (fakes.test-helpers.ts numbers them from 1). */
const photoId = (n: number) =>
  AttachmentId.parse(
    idOf(ID_PREFIXES.attachment, `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`),
  );

describe("the first screen's photos (dl-z5ja.11.16)", () => {
  let fake: Harness;
  beforeEach(() => {
    fake = harness();
  });
  const withPhotos = (changes: Partial<Parameters<typeof NewLessonBox>[0]> = {}) =>
    box({ photos: true, uploadDeps: fake.deps, ...changes });
  const photo = () => fileOf("zadanie.png", "image/png");
  const chips = () => [...document.querySelectorAll("[data-attachments] [data-chip]")];
  const pick = async (file: File) => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      await settle();
    });
  };
  const answer = async (n: number, status: number) => {
    await act(async () => {
      fake.xhrs[n]?.answer(status);
      await settle();
    });
  };

  it("uploads a picked photo, shows its chip, waits for it, then sends its id", async () => {
    const props = withPhotos();
    expect(screen.getByText("Dodaj zdjęcie")).toBeDefined();
    await pick(photo());
    expect(fake.api.bodies).toHaveLength(1);
    expect(chips().map((c) => c.getAttribute("data-chip"))).toEqual(["uploading"]);
    // A photo alone is enough to send, once it is up.
    expect(sendReason()).toBe("Czekam, aż zdjęcia się wyślą");
    expect(send().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(send());
    expect(props.onSend).not.toHaveBeenCalled();

    await answer(0, 204);
    expect(chips().map((c) => c.getAttribute("data-chip"))).toEqual(["ready"]);
    expect(sendReason()).toBeNull();
    expect(send().getAttribute("aria-disabled")).toBe("false");
    fireEvent.click(send());
    expect(props.onSend).toHaveBeenCalledWith({
      text: "",
      attachmentIds: [photoId(1)],
      learner: null,
    });
  });

  it("uploads a pasted photo and a dropped one, each as its own chip", async () => {
    withPhotos();
    await act(async () => {
      fireEvent.paste(field(), { clipboardData: { files: [photo()] } });
      await settle();
    });
    const form = document.querySelector("[data-new-lesson]") as HTMLElement;
    await act(async () => {
      fireEvent.drop(form, { dataTransfer: { files: [photo(), fileOf("a.txt", "text/plain")] } });
      await settle();
    });
    // The text file is not a photo, so it is left out.
    expect(fake.api.bodies).toHaveLength(2);
    expect(chips()).toHaveLength(2);
  });

  it("holds the send with its reason when an upload fails, and sends once the chip retries it", async () => {
    const props = withPhotos();
    fireEvent.change(field(), { target: { value: "Odejmowanie" } });
    await pick(photo());
    await answer(0, 500);
    expect(chips().map((c) => c.getAttribute("data-chip"))).toEqual(["failed"]);
    expect(sendReason()).toBe("Ponów albo usuń zdjęcie, które się nie wysłało");
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(props.onSend).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
      await settle();
    });
    expect(fake.api.bodies).toHaveLength(2);
    await answer(1, 204);
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(props.onSend).toHaveBeenCalledWith({
      text: "Odejmowanie",
      attachmentIds: [photoId(2)],
      learner: null,
    });
  });

  it("asks to remove a refused photo, which has no Retry, and holds the send", async () => {
    fake = harness({ decoded: null });
    const props = withPhotos();
    fireEvent.change(field(), { target: { value: "Odejmowanie" } });
    await pick(photo());
    expect(chips().map((c) => c.getAttribute("data-chip"))).toEqual(["refused"]);
    expect(sendReason()).toBe("Usuń zdjęcie, którego nie da się wysłać");
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("sends without a photo whose chip was removed", async () => {
    const props = withPhotos();
    fireEvent.change(field(), { target: { value: "Odejmowanie" } });
    await pick(photo());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Usuń zdjęcie" })));
    expect(chips()).toHaveLength(0);
    expect(fake.xhrs[0]?.aborted).toBe(true);
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(props.onSend).toHaveBeenCalledWith({
      text: "Odejmowanie",
      attachmentIds: [],
      learner: null,
    });
  });
});
