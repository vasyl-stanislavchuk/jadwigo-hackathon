// @vitest-environment happy-dom
// Card's compact size (dl-uukj.32.3): a card in a list on an app page, with a tighter inset and the
// body size. happy-dom does no layout, so the size's classes are the contract.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Card } from "./card.tsx";

afterEach(cleanup);

describe("Card size", () => {
  it("is the default card when no size is given", () => {
    render(<Card aria-label="Lekcja">Dodawanie</Card>);
    const card = screen.getByLabelText("Lekcja");
    expect(card.getAttribute("data-size")).toBe("default");
    expect(card.classList.contains("[--card-spacing:--spacing(6)]")).toBe(true);
    expect(card.classList.contains("text-xl")).toBe(true);
  });

  it("is tighter at the body size when compact, keeping one spacing and one text size", () => {
    render(
      <Card size="compact" aria-label="Lekcja">
        Dodawanie
      </Card>,
    );
    const card = screen.getByLabelText("Lekcja");
    expect(card.getAttribute("data-size")).toBe("compact");
    expect(card.classList.contains("[--card-spacing:--spacing(4)]")).toBe(true);
    expect(card.classList.contains("[--card-spacing:--spacing(6)]")).toBe(false);
    expect(card.classList.contains("text-jw-body")).toBe(true);
    expect(card.classList.contains("text-xl")).toBe(false);
  });
});
