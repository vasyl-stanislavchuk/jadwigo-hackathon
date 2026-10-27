import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisuallyHidden } from "./visually-hidden.tsx";

describe("VisuallyHidden", () => {
  it("keeps its text for a screen reader and takes no room on screen", () => {
    render(
      <button type="button">
        <VisuallyHidden>Sprawdź</VisuallyHidden>
      </button>,
    );
    const label = screen.getByText("Sprawdź");
    expect(screen.getByRole("button", { name: "Sprawdź" })).toBeDefined();
    expect(label.style.width).toBe("1px");
    expect(label.style.overflow).toBe("hidden");
  });
});
