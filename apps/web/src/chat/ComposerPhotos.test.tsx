// @vitest-environment happy-dom
/**
 * The composer's photos (handoff dl-uukj.47.71 §4.5, dl-uukj.47.71.8): with a way to upload, a
 * photo button sits after Dla; a picked or pasted photo uploads at once as a chip; Wyślij waits for
 * it with its reason, then sends it, alone or with words; the sent photo's local copy passes to
 * the thread. Every picture is synthetic (fakes.test-helpers.ts).
 */

import { ID_PREFIXES } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fileOf, type Harness, harness, settle } from "./attachments/fakes.test-helpers.ts";
import { sentPreview } from "./attachments/sentPreviews.ts";
import { ChatPane } from "./ChatPane.tsx";

afterEach(cleanup);

function pane(h: Harness | null) {
  const onSend = vi.fn();
  render(
    <ChatPane
      language="pl"
      variant="parent"
      turns={[]}
      queued={[]}
      restoring={false}
      stopping={false}
      sendFailed={false}
      onSend={onSend}
      onStop={() => {}}
      {...(h === null ? {} : { uploadDeps: h.deps })}
    />,
  );
  return onSend;
}

const send = () => screen.getByRole("button", { name: "Wyślij" });
const words = () => screen.getByRole("textbox", { name: "Twoja wiadomość" });

/** Picks files through the hidden input, as the photo button's dialog would. */
async function pick(...files: File[]) {
  const input = document.querySelector("[data-photo-input]") as HTMLInputElement;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  await act(async () => {
    fireEvent.change(input);
    await settle();
  });
}

async function finish(h: Harness, n = 0) {
  await act(async () => {
    h.xhrs[n]?.answer(204);
    await settle();
  });
}

describe("the composer's photos (dl-uukj.47.71.8)", () => {
  it("has a photo button after Dla only when the page can upload", () => {
    pane(null);
    expect(screen.queryByRole("button", { name: "Dodaj zdjęcie" })).toBeNull();
    cleanup();
    pane(harness());
    expect(screen.getByRole("button", { name: "Dodaj zdjęcie" })).toBeTruthy();
  });

  it("sends a photo alone once it has uploaded, and hands its local copy to the thread", async () => {
    const h = harness();
    const onSend = pane(h);
    await pick(fileOf("zadanie.jpg", "image/jpeg"));
    expect(document.querySelectorAll("[data-attachments] li")).toHaveLength(1);
    // Still on its way: Wyślij says why it waits.
    expect(send().getAttribute("aria-disabled")).toBe("true");
    expect(document.body.textContent).toContain("Czekam, aż zdjęcia się wyślą");
    fireEvent.click(send());
    expect(onSend).not.toHaveBeenCalled();

    await finish(h);
    expect(send().getAttribute("aria-disabled")).toBe("false");
    await act(async () => fireEvent.click(send()));
    const [text, ids] = onSend.mock.calls[0] ?? [];
    expect(text).toBe("");
    expect(ids).toHaveLength(1);
    expect(String(ids[0]).startsWith(ID_PREFIXES.attachment)).toBe(true);
    expect(sentPreview(ids[0])).toBe("blob:photo-1");
    expect(document.querySelector("[data-attachments]")).toBeNull();
  });

  it("sends words and photos together, and words alone exactly as before", async () => {
    const h = harness();
    const onSend = pane(h);
    fireEvent.change(words(), { target: { value: "Ułamki" } });
    await act(async () => fireEvent.click(send()));
    expect(onSend).toHaveBeenLastCalledWith("Ułamki");
    await pick(fileOf("a.png", "image/png"));
    await finish(h);
    fireEvent.change(words(), { target: { value: "Z tego zdjęcia" } });
    await act(async () => fireEvent.keyDown(words(), { key: "Enter" }));
    expect(onSend.mock.calls.at(-1)?.[0]).toBe("Z tego zdjęcia");
    expect(onSend.mock.calls.at(-1)?.[1]).toHaveLength(1);
  });

  it("takes a photo pasted into the words, and leaves other pasted files alone", async () => {
    const h = harness();
    pane(h);
    await act(async () => {
      fireEvent.paste(words(), {
        clipboardData: { files: [fileOf("x.pdf", "application/pdf")] },
      });
      await settle();
    });
    expect(document.querySelector("[data-attachments]")).toBeNull();
    await act(async () => {
      fireEvent.paste(words(), { clipboardData: { files: [fileOf("x.png", "image/png")] } });
      await settle();
    });
    expect(document.querySelectorAll("[data-attachments] li")).toHaveLength(1);
  });

  it("says a failed upload stops the send until it is retried or removed", async () => {
    const h = harness();
    const onSend = pane(h);
    fireEvent.change(words(), { target: { value: "Ułamki" } });
    await pick(fileOf("a.png", "image/png"));
    await act(async () => {
      h.xhrs[0]?.answer(500, "<Error><Code>InternalError</Code></Error>");
      await settle();
    });
    expect(send().getAttribute("aria-disabled")).toBe("true");
    expect(document.body.textContent).toContain("Ponów albo usuń zdjęcie, które się nie wysłało");
    fireEvent.click(send());
    expect(onSend).not.toHaveBeenCalled();
  });
});
