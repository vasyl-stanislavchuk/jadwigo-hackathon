// @vitest-environment happy-dom
/**
 * The Jadwigo AI line under the first screen's box (dl-uukj.47.37): one muted line whose second
 * sentence opens a dialog titled "Co robi Jadwigo AI" with its 4 lines and the site's link; Esc
 * closes it and the focus comes back to the button.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AboutJadwigoAi } from "./AboutJadwigoAi.tsx";
import { NewLessonBox } from "./NewLessonBox.tsx";

afterEach(cleanup);

describe("the Jadwigo AI line", () => {
  it("sits under the box, one muted line and nothing else", () => {
    render(
      <NewLessonBox
        language="pl"
        learners={[]}
        forLearner={null}
        onForChange={vi.fn()}
        onAddChild={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    const form = document.querySelector("[data-new-lesson]") as HTMLElement;
    const line = document.querySelector("[data-ai-intro]") as HTMLElement;
    expect(form.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.textContent).toBe("Jadwigo AI ułoży lekcję z Twojego opisu.Zobacz, jak to działa");
    expect(line.className).toContain("text-jw-ink-soft");
    expect(document.querySelectorAll("[data-ai-intro]")).toHaveLength(1);
  });

  it("opens a dialog with the 4 lines and the site's link, and Esc gives the focus back", async () => {
    render(<AboutJadwigoAi language="pl" />);
    const more = screen.getByRole("button", { name: "Zobacz, jak to działa" });
    more.focus();
    await act(async () => fireEvent.click(more));
    const dialog = screen.getByRole("dialog", { name: "Co robi Jadwigo AI" });
    expect(
      within(dialog)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Czyta zadanie.",
      "Szuka w banku zadań.",
      "Układa i sprawdza lekcję.",
      "Ty decydujesz, co trafi do dziecka.",
    ]);
    const link = within(dialog).getByRole("link", { name: "Więcej o Jadwigo AI" });
    expect(link.getAttribute("href")).toBe("https://jadwigo.pl/jadwigo-ai");

    await act(async () => fireEvent.keyDown(dialog, { key: "Escape" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(more));
  });

  it("links to the English page in English", async () => {
    render(<AboutJadwigoAi language="en" />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "See how it works" })),
    );
    const dialog = screen.getByRole("dialog", { name: "What Jadwigo AI does" });
    expect(
      within(dialog).getByRole("link", { name: "More about Jadwigo AI" }).getAttribute("href"),
    ).toBe("https://jadwigo.pl/en/jadwigo-ai");
  });
});
