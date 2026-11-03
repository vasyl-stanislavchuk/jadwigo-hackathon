import {
  AccountId,
  AttachmentId,
  type AttachmentRead,
  EventId,
  ID_PREFIXES,
  idOf,
  PodId,
} from "@jadwigo/contracts";
import { Attachment, type MessageAttachment } from "@jadwigo/contracts/run";
import { FIXED_NOW } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keepSent, sentPreview } from "./sentPreviews.ts";
import { forgetLinks, ThreadAttachments } from "./ThreadAttachments.tsx";

/** A sent photo under a made-up pod: no learner's data (dl-z5ja.11.6). */
const UUID = "0b8f4c3e-6a1d-4f2b-9c7e-1d2e3f4a5b6c";
const ID = AttachmentId.parse(idOf(ID_PREFIXES.attachment, UUID));
const POD = PodId.parse(idOf(ID_PREFIXES.pod, UUID));
const PHOTO: MessageAttachment = {
  attachment_id: ID,
  storage_path: `pods/${POD}/attachments/${ID}.jpg`,
  media_type: "image/jpeg",
  bytes: 1000,
  width: 800,
  height: 600,
};
const ROW = Attachment.parse({
  id: ID,
  pod_id: POD,
  account_id: AccountId.parse(idOf(ID_PREFIXES.account, UUID)),
  event_id: EventId.parse(UUID),
  state: "attached",
  media_type: "image/jpeg",
  bytes: 1000,
  width: 800,
  height: 600,
  name: null,
  conversation_id: null,
  storage_path: PHOTO.storage_path,
  created_at: FIXED_NOW.toISOString(),
  expires_at: null,
  attached_at: FIXED_NOW.toISOString(),
});

const NOW = FIXED_NOW.getTime();
const at = (ms: number) => new Date(NOW + ms).toISOString();

function reads(...links: { url: string; expires: number }[]) {
  const queue = [...links];
  const read = vi.fn(async (): Promise<AttachmentRead> => {
    const next = queue.shift();
    if (next === undefined) throw new Error("no more links");
    return { attachment: ROW, url: next.url, preview_url: null, expires_at: at(next.expires) };
  });
  return read;
}

const thumb = () => document.querySelector<HTMLElement>(`[data-attachment="${ID}"]`);
const img = () => thumb()?.querySelector("img") ?? null;

beforeEach(() => {
  forgetLinks();
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ThreadAttachments", () => {
  it("shows the local copy until the stored one is read, then swaps and revokes the local", async () => {
    keepSent(ID, "blob:local-1");
    let answer: (value: AttachmentRead) => void = () => {};
    const read = vi.fn(
      () =>
        new Promise<AttachmentRead>((resolve) => {
          answer = resolve;
        }),
    );
    render(<ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => NOW} />);
    expect(screen.getByText("Tak Jadwigo widzi zdjęcia")).toBeTruthy();
    expect(img()?.getAttribute("src")).toBe("blob:local-1");
    expect(thumb()?.dataset["source"]).toBe("local");

    await act(async () =>
      answer({
        attachment: ROW,
        url: "https://uploads.test/stored-1",
        preview_url: null,
        expires_at: at(300_000),
      }),
    );
    expect(img()?.getAttribute("src")).toBe("https://uploads.test/stored-1");
    expect(thumb()?.dataset["source"]).toBe("stored");
    fireEvent.load(img() as HTMLImageElement);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-1");
    expect(sentPreview(ID)).toBeNull();
  });

  it("keeps a fresh link for every strip, and reads an expired one again", async () => {
    const read = reads(
      { url: "https://uploads.test/a", expires: 300_000 },
      { url: "https://uploads.test/b", expires: 900_000 },
    );
    let clock = NOW;
    const first = render(
      <ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => clock} />,
    );
    await act(async () => {});
    expect(img()?.getAttribute("src")).toBe("https://uploads.test/a");
    first.unmount();

    render(<ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => clock} />);
    await act(async () => {});
    expect(read).toHaveBeenCalledTimes(1);

    // Past its expiry the stored copy fails to load: the link is read again.
    clock = NOW + 400_000;
    await act(async () => {
      fireEvent.error(img() as HTMLImageElement);
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(img()?.getAttribute("src")).toBe("https://uploads.test/b");
  });

  it("asks once when 2 strips show the same photo at the same time", async () => {
    const read = reads({ url: "https://uploads.test/once", expires: 300_000 });
    render(
      <>
        <ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => NOW} />
        <ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => NOW} />
      </>,
    );
    await act(async () => {});
    expect(read).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('img[src="https://uploads.test/once"]')).toHaveLength(2);
  });

  it("falls back to a name chip when a fresh stored copy will not load", async () => {
    const read = reads({ url: "https://uploads.test/broken", expires: 300_000 });
    render(<ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => NOW} />);
    await act(async () => {});
    fireEvent.error(img() as HTMLImageElement);
    expect(img()).toBeNull();
    expect(thumb()?.dataset["kind"]).toBe("failed");
    expect(screen.getByRole("img", { name: "Nie udało się pokazać zdjęcia 1" })).toBeTruthy();
  });

  it("shows the name chip when the link cannot be read and the tab holds no local copy", async () => {
    const read = reads();
    render(<ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => NOW} />);
    await act(async () => {});
    expect(thumb()?.dataset["kind"]).toBe("failed");
    expect(screen.getByRole("img", { name: "Nie udało się pokazać zdjęcia 1" })).toBeTruthy();
  });

  it("reads a stale link again once per mount, never in a loop", async () => {
    // Each link is already past its expiry by this clock, as with a clock ahead of the server's.
    const read = reads(
      { url: "https://uploads.test/s1", expires: -60_000 },
      { url: "https://uploads.test/s2", expires: -60_000 },
      { url: "https://uploads.test/s3", expires: -60_000 },
    );
    render(<ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => NOW} />);
    await act(async () => {});
    await act(async () => {
      fireEvent.error(img() as HTMLImageElement);
    });
    await act(async () => {
      fireEvent.error(img() as HTMLImageElement);
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(thumb()?.dataset["kind"]).toBe("failed");
  });

  it("revokes the local copy when the stored one fails", async () => {
    keepSent(ID, "blob:local-2");
    const read = reads({ url: "https://uploads.test/broken", expires: 300_000 });
    render(<ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => NOW} />);
    await act(async () => {});
    fireEvent.error(img() as HTMLImageElement);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-2");
    expect(sentPreview(ID)).toBeNull();
  });

  it("opens the photo at full size on a tap", async () => {
    const read = reads({ url: "https://uploads.test/full", expires: 300_000 });
    render(<ThreadAttachments language="en" attachments={[PHOTO]} read={read} now={() => NOW} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Show photo 1 full size" }));
    const full = document.querySelector("[data-full-size]");
    expect(full?.getAttribute("src")).toBe("https://uploads.test/full");
    expect(screen.getByRole("dialog", { name: "Photo 1" })).toBeTruthy();
  });

  it("draws 2 documents as 2 tiles with their names, and one caption for the bubble (S18, s19)", async () => {
    const doc = (n: number, name: string | null): [MessageAttachment, AttachmentRead] => {
      const uuid = `0b8f4c3e-6a1d-4f2b-9c7e-1d2e3f4a5b6${n}`;
      const id = AttachmentId.parse(idOf(ID_PREFIXES.attachment, uuid));
      const media_type = "application/pdf";
      const sent = { ...PHOTO, attachment_id: id, media_type, width: null, height: null } as const;
      const row = Attachment.parse({ ...ROW, id, media_type, width: null, height: null, name });
      return [
        sent,
        {
          attachment: row,
          url: `https://files.test/${n}`,
          preview_url: null,
          expires_at: at(60_000),
        },
      ];
    };
    const [first, firstRead] = doc(1, "karta-pracy.pdf");
    const [second, secondRead] = doc(2, null);
    const byId = new Map([
      [first.attachment_id, firstRead],
      [second.attachment_id, secondRead],
    ]);
    const read = vi.fn(async (id: AttachmentId) => byId.get(id) as AttachmentRead);
    render(
      <ThreadAttachments language="pl" attachments={[first, second]} read={read} now={() => NOW} />,
    );
    const tiles = () => [...document.querySelectorAll("[data-kind='document']")];
    expect(tiles()).toHaveLength(2);
    // Until the link is read, a tile names its kind.
    expect(tiles()[0]?.querySelector("[data-name]")?.textContent).toBe("PDF");
    await act(async () => {});
    expect(tiles().map((t) => t.querySelector("[data-name]")?.textContent)).toEqual([
      "karta-pracy.pdf",
      "PDF",
    ]);
    // No picture is drawn for a document, and no page line until a message carries the count.
    expect(document.querySelector("[data-thread-attachments] img")).toBeNull();
    // Documents only: the caption says files, once.
    expect(screen.getAllByText("Tak Jadwigo widzi pliki")).toHaveLength(1);
    expect(screen.queryByText("Tak Jadwigo widzi zdjęcia")).toBeNull();
  });

  it("captions a photos-only bubble and a mixed one with 'zdjęcia', once (dl-uukj.47.71.25)", () => {
    const pdfId = AttachmentId.parse(
      idOf(ID_PREFIXES.attachment, "0b8f4c3e-6a1d-4f2b-9c7e-1d2e3f4a5b70"),
    );
    const pdf: MessageAttachment = {
      ...PHOTO,
      attachment_id: pdfId,
      media_type: "application/pdf",
    };
    const read = reads({ url: "https://files.test/a", expires: 60_000 });
    const { unmount } = render(
      <ThreadAttachments language="pl" attachments={[PHOTO]} read={read} now={() => NOW} />,
    );
    expect(screen.getAllByText("Tak Jadwigo widzi zdjęcia")).toHaveLength(1);
    expect(screen.queryByText("Tak Jadwigo widzi pliki")).toBeNull();
    unmount();
    render(
      <ThreadAttachments language="pl" attachments={[PHOTO, pdf]} read={read} now={() => NOW} />,
    );
    expect(screen.getAllByText("Tak Jadwigo widzi zdjęcia")).toHaveLength(1);
    expect(screen.queryByText("Tak Jadwigo widzi pliki")).toBeNull();
  });

  it("shows nothing for a message with no attachments", () => {
    const { container } = render(
      <ThreadAttachments language="pl" attachments={[]} read={reads()} now={() => NOW} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
