// @vitest-environment happy-dom
// Link (dl-uukj.32.3): an underlined link at the body or the small size, or the look handed to the
// app's own router link.
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Link, linkVariants } from "./link.tsx";

afterEach(cleanup);

describe("Link", () => {
  it("is an underlined link at the body size by default", () => {
    render(<Link href="/parent">Wróć</Link>);
    const link = screen.getByRole("link", { name: "Wróć" });
    expect(link.getAttribute("href")).toBe("/parent");
    expect(link.getAttribute("data-size")).toBe("body");
    for (const c of ["underline", "text-jw-body", "font-bold"])
      expect(link.classList.contains(c), c).toBe(true);
  });

  it("is smaller at size small", () => {
    render(
      <Link href="/parent" size="small">
        Wyloguj
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Wyloguj" });
    expect(link.classList.contains("text-jw-small")).toBe(true);
    expect(link.classList.contains("text-jw-body")).toBe(false);
  });

  it("hands its look to the app's router link with asChild", () => {
    function RouterLink(props: ComponentProps<"a">): ReactElement {
      return <a data-router {...props} />;
    }
    render(
      <Link asChild size="small">
        <RouterLink href="/parent/attempts/1">Lekcja 1</RouterLink>
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Lekcja 1" });
    expect(link.hasAttribute("data-router")).toBe(true);
    expect(link.getAttribute("data-slot")).toBe("link");
    expect(link.classList.contains("underline")).toBe(true);
  });

  it("gives the same look to whatever reads linkVariants", () => {
    expect(linkVariants({ size: "small" })).toContain("text-jw-small");
  });
});
