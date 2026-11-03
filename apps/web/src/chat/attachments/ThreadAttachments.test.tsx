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

  it("opens the photo at full size on a tap", async () => {
    const read = reads({ url: "https://uploads.test/full", expires: 300_000 });
    render(<ThreadAttachments language="en" attachments={[PHOTO]} read={read} now={() => NOW} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Show photo 1 full size" }));
    const full = document.querySelector("[data-full-size]");
    expect(full?.getAttribute("src")).toBe("https://uploads.test/full");
    expect(screen.getByRole("dialog", { name: "Photo 1" })).toBeTruthy();
  });

  it("shows nothing for a message with no attachments", () => {
    const { container } = render(
      <ThreadAttachments language="pl" attachments={[]} read={reads()} now={() => NOW} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
