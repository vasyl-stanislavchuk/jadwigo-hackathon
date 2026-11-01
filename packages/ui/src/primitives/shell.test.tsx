// @vitest-environment happy-dom
// The parts of the parent's app frame (dl-xo0q): the breadcrumb, the fold button, the initial disc
// and the quiet action, as a person meets them (role and name).
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DensityScope } from "../lib/register.tsx";
import { Breadcrumb } from "./breadcrumb.tsx";
import { Button } from "./button.tsx";
import { Disc } from "./disc.tsx";
import { PanelToggle } from "./panel-toggle.tsx";

afterEach(cleanup);

describe("Breadcrumb", () => {
  const trail = [{ label: "Lekcje", href: "/parent/lessons" }, { label: "Nowa lekcja" }];

  it("is a named nav: the section a link, the current page marked and not a link", () => {
    render(<Breadcrumb label="Ścieżka" trail={trail} />);
    const nav = screen.getByRole("navigation", { name: "Ścieżka" });
    expect(nav).toBeDefined();
    expect(screen.getByRole("link", { name: "Lekcje" }).getAttribute("href")).toBe(
      "/parent/lessons",
    );
    const here = screen.getByText("Nowa lekcja");
    expect(here.getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("link", { name: "Nowa lekcja" })).toBeNull();
  });

  it("hands a plain click to onNavigate and keeps a modified one for the browser", () => {
    const go = vi.fn();
    render(<Breadcrumb label="Ścieżka" trail={trail} onNavigate={go} />);
    const link = screen.getByRole("link", { name: "Lekcje" });
    fireEvent.click(link, { metaKey: true });
    expect(go).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(go).toHaveBeenCalledWith("/parent/lessons", expect.anything());
  });
});

describe("PanelToggle", () => {
  it("is a named button that says whether its panel is open and which one", () => {
    const toggle = vi.fn();
    render(
      <PanelToggle side="left" expanded label="Zwiń menu" controls="menu" onToggle={toggle} />,
    );
    const button = screen.getByRole("button", { name: "Zwiń menu" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe("menu");
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledOnce();
  });
});

describe("Disc", () => {
  it("shows the first initial, upper case, hidden from a screen reader", () => {
    const { container } = render(<Disc name="  ola" />);
    const disc = container.querySelector("[data-slot=disc]");
    expect(disc?.textContent).toBe("O");
    expect(disc?.getAttribute("aria-hidden")).toBe("true");
  });

  it("holds a pencil to swap in on the row's hover or focus", () => {
    const { container } = render(<Disc name="Ola" swap />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(render(<Disc name="Ola" />).container.querySelector("svg")).toBeNull();
  });
});

describe("the quiet action in the parent's density", () => {
  it("draws a disabled action with a dashed outline there, and not on other app pages", () => {
    render(
      <DensityScope value="parent">
        <Button size="control" aria-disabled>
          Zrób lekcję
        </Button>
      </DensityScope>,
    );
    const button = screen.getByRole("button", { name: "Zrób lekcję" });
    expect(button.className).toContain("in-data-[density=parent]:aria-disabled:border-dashed");
    cleanup();
    render(<Button aria-disabled>Dalej</Button>);
    expect(screen.getByRole("button").className).not.toContain("border-dashed");
  });
});
