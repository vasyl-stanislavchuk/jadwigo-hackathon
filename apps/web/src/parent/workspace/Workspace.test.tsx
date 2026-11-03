// @vitest-environment happy-dom
/**
 * The lesson workspace (dl-1eieq.1, decision 2026-11-03-the-lesson-opens-in-a-preview-modal-from-an-
 * expand-button-on-the): the chat alone on every screen, no lesson column, no Pokaż lekcję and no
 * phone tabs; what the chat opens shows in a preview over it, which closes back to the chat. The
 * preview's size and the chat's place are apps/web/e2e/chat.spec.ts's.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Preview, Workspace } from "./Workspace.tsx";

function workspace(preview: Preview | null = null, onClosePreview = vi.fn()) {
  render(
    <Workspace
      language="pl"
      chat={<p>wiadomości</p>}
      chatBand={<span>stan</span>}
      preview={preview}
      onClosePreview={onClosePreview}
    />,
  );
  return onClosePreview;
}

afterEach(cleanup);

describe("the workspace: the chat, and the preview over it", () => {
  it("shows the chat alone: no lesson column, no tabs, no Pokaż lekcję", () => {
    workspace();
    expect(screen.getByText("wiadomości")).toBeTruthy();
    expect(document.querySelector("[data-lesson-column]")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("button", { name: "Pokaż lekcję" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the chat's state for screen readers only", () => {
    workspace();
    const band = document.querySelector("[data-chat-band]") as HTMLElement;
    expect(band.textContent).toBe("stan");
    expect(band.className).toContain("sr-only");
  });

  it("opens the preview with its title, body and actions, and Zamknij closes it", () => {
    const onClose = workspace({
      title: "Odejmowanie",
      body: <ol>kroki</ol>,
      actions: <button type="button">Daj lekcję</button>,
    });
    const dialog = screen.getByRole("dialog", { name: "Odejmowanie" });
    expect(dialog.querySelector("[data-preview-body]")?.textContent).toBe("kroki");
    expect(dialog.querySelector("[data-preview-actions]")?.textContent).toBe("Daj lekcję");
    // The chat stays under it.
    expect(screen.getByText("wiadomości", { selector: "p" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("draws no actions row for a thing that has none", () => {
    workspace({ title: "Ola", body: <p>panel</p> });
    expect(document.querySelector("[data-preview-actions]")).toBeNull();
  });
});
