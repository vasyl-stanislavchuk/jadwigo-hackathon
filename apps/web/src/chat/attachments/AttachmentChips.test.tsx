import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentChips } from "./AttachmentChips.tsx";
import { fileOf, harness, settle } from "./fakes.test-helpers.ts";
import { PhotoUpload } from "./upload.ts";

afterEach(cleanup);

const flush = () => act(settle);

function chip(n: number): HTMLElement {
  const items = screen.getAllByRole("listitem");
  const item = items[n - 1];
  if (!item) throw new Error(`no chip ${n}`);
  return item;
}

describe("AttachmentChips", () => {
  it("shows the upload's progress on the chip's ring, then the ready thumbnail", async () => {
    const h = harness();
    const upload = new PhotoUpload(fileOf("IMG_0001.jpg", "image/jpeg"), h.deps);
    render(<AttachmentChips language="pl" uploads={[upload]} onRemove={() => {}} />);
    void upload.start();
    await flush();

    const ring = screen.getByRole("progressbar");
    expect(ring.getAttribute("aria-valuenow")).toBe("0");
    act(() => h.xhrs[0]?.progress(640, 1000));
    expect(ring.getAttribute("aria-valuenow")).toBe("64");
    expect(ring.getAttribute("aria-label")).toBe("Wysyłam zdjęcie, 64%");

    await act(async () => {
      h.xhrs[0]?.answer(204);
      await settle();
    });
    expect(chip(1).dataset["chip"]).toBe("ready");
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("img", { name: "Zdjęcie 1" }).getAttribute("src")).toBe("blob:photo-1");
  });

  it("a failed POST shows Retry and its reason; Retry posts again into a new slot", async () => {
    const h = harness();
    const upload = new PhotoUpload(fileOf("IMG_0002.jpg", "image/jpeg"), h.deps);
    render(<AttachmentChips language="pl" uploads={[upload]} onRemove={() => {}} />);
    void upload.start();
    await flush();
    await act(async () => {
      h.xhrs[0]?.answer(500, "<Error><Code>InternalError</Code></Error>");
      await settle();
    });

    expect(chip(1).dataset["chip"]).toBe("failed");
    expect(
      screen.getByText("Zdjęcie 1: Serwer nie przyjął zdjęcia. Spróbuj ponownie"),
    ).toBeTruthy();
    fireEvent.click(within(chip(1)).getByRole("button", { name: "Spróbuj ponownie" }));
    await flush();
    expect(chip(1).dataset["chip"]).toBe("uploading");
    expect(h.api.bodies).toHaveLength(2);
    expect(h.api.bodies[1]?.event_id).not.toBe(h.api.bodies[0]?.event_id);
    expect(h.xhrs[1]?.body?.get("policy")).toBe("p2");
  });

  it("a HEIC that still cannot be read is refused with its sentence, and no Retry", async () => {
    const h = harness({ decoded: null, heif: null });
    const upload = new PhotoUpload(fileOf("IMG_0003.heic", "image/heic"), h.deps);
    render(<AttachmentChips language="pl" uploads={[upload]} onRemove={() => {}} />);
    await act(async () => {
      await upload.start();
    });

    expect(chip(1).dataset["chip"]).toBe("refused");
    expect(
      screen.getByText(
        "Zdjęcie 1: Nie umiemy otworzyć tego zdjęcia. Zrób zrzut ekranu albo zapisz je jako JPG",
      ),
    ).toBeTruthy();
    expect(within(chip(1)).queryByRole("button", { name: "Spróbuj ponownie" })).toBeNull();
  });

  it("an undecodable file is refused in English too, with no Retry", async () => {
    const h = harness({ decoded: null });
    const upload = new PhotoUpload(fileOf("notes.pdf", "application/pdf"), h.deps);
    render(<AttachmentChips language="en" uploads={[upload]} onRemove={() => {}} />);
    await act(async () => {
      await upload.start();
    });

    expect(chip(1).dataset["chip"]).toBe("refused");
    expect(
      screen.getByText("Photo 1: We can't open this file as a photo. Pick a photo or a screenshot"),
    ).toBeTruthy();
    expect(within(chip(1)).queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("× stops the upload, revokes its preview and tells the owner", async () => {
    const h = harness();
    const upload = new PhotoUpload(fileOf("IMG_0004.jpg", "image/jpeg"), h.deps);
    const onRemove = vi.fn();
    render(<AttachmentChips language="pl" uploads={[upload]} onRemove={onRemove} />);
    void upload.start();
    await flush();

    fireEvent.click(screen.getByRole("button", { name: "Usuń zdjęcie" }));
    expect(onRemove).toHaveBeenCalledWith(upload);
    expect(h.xhrs[0]?.aborted).toBe(true);
    expect(h.revoked).toEqual(["blob:photo-1"]);
  });

  it("names how many photos were left off past the limit", () => {
    const h = harness();
    const uploads = Array.from(
      { length: 10 },
      (_, i) => new PhotoUpload(fileOf(`${i}.jpg`, "image/jpeg"), h.deps),
    );
    const { rerender } = render(
      <AttachmentChips language="pl" uploads={uploads} leftOff={3} onRemove={() => {}} />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByText("Zmieści się 10 zdjęć, 3 pominięto")).toBeTruthy();
    rerender(<AttachmentChips language="en" uploads={uploads} leftOff={1} onRemove={() => {}} />);
    expect(screen.getByText("10 photos fit, 1 was left off")).toBeTruthy();
  });

  it("renders nothing with no photos", () => {
    const { container } = render(
      <AttachmentChips language="pl" uploads={[]} onRemove={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
