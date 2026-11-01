// @vitest-environment happy-dom
// The Logo: the wordmark inlined with its crown group (so the tip reaches it), or the crown alone,
// each named for a screen reader.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Logo } from "./logo.tsx";

afterEach(cleanup);

describe("Logo", () => {
  it("inlines the wordmark with its title and its crown group", () => {
    const { container } = render(<Logo />);
    expect(screen.getByRole("img", { name: "Jadwigo" })).toBeDefined();
    expect(container.querySelector("[data-slot=logo] svg .crown")).not.toBeNull();
  });

  it("draws the crown alone for a folded sidebar, named by its label", () => {
    render(<Logo mark label="Jadwigo, strona główna" />);
    const crown = screen.getByRole("img", { name: "Jadwigo, strona główna" });
    expect(crown.hasAttribute("data-mark")).toBe(true);
  });
});
