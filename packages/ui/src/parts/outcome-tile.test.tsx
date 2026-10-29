// @vitest-environment happy-dom
// OutcomeTile (dl-uukj.32.3): one outcome as a named tile with an icon and a tone. It carries
// data-outcome and never data-tile, which 11 lesson rules in foundation.css style.
import { cleanup, render, screen } from "@testing-library/react";
import { Check, Minus } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { OutcomeTile } from "./outcome-tile.tsx";

afterEach(cleanup);

describe("OutcomeTile", () => {
  it("is an image named by its label, with its icon and its tone", () => {
    render(
      <OutcomeTile
        tone="right"
        outcome="first_try"
        icon={<Check aria-hidden="true" />}
        label="Pytanie 3: za pierwszym razem"
      />,
    );
    const tile = screen.getByRole("img", { name: "Pytanie 3: za pierwszym razem" });
    expect(tile.getAttribute("data-outcome")).toBe("first_try");
    expect(tile.querySelector("svg")).not.toBeNull();
    expect(tile.classList.contains("bg-kid-correct-soft")).toBe(true);
    expect(tile.classList.contains("size-10")).toBe(true);
  });

  it.each([
    ["right", "bg-kid-correct-soft"],
    ["miss", "bg-kid-try-again-soft"],
    ["plain", "bg-jw-card"],
  ] as const)(
    "tone %s reads %s, and data-outcome names the tone when no outcome is given",
    (tone, fill) => {
      render(<OutcomeTile tone={tone} icon={<Minus aria-hidden="true" />} label={tone} />);
      const tile = screen.getByRole("img", { name: tone });
      expect(tile.getAttribute("data-outcome")).toBe(tone);
      expect(tile.classList.contains(fill)).toBe(true);
    },
  );

  it("never carries data-tile", () => {
    const { container } = render(
      <OutcomeTile tone="miss" icon={<Minus aria-hidden="true" />} label="nie" />,
    );
    expect(container.querySelector("[data-tile]")).toBeNull();
  });

  it("is 32 in a legend", () => {
    render(<OutcomeTile tone="plain" size="sm" icon={<Minus aria-hidden="true" />} label="x" />);
    const tile = screen.getByRole("img", { name: "x" });
    expect(tile.classList.contains("size-8")).toBe(true);
    expect(tile.classList.contains("size-10")).toBe(false);
  });

  it("hands the tile to a router link with asChild: the icon first, the link's own mark after", () => {
    function RouterLink(props: ComponentProps<"a">): ReactElement {
      return <a data-router {...props} />;
    }
    render(
      <OutcomeTile
        asChild
        tone="miss"
        outcome="not_yet"
        icon={<Minus aria-hidden="true" data-icon />}
        label="Pytanie 2: jeszcze nie"
      >
        <RouterLink href="/parent/attempts/1#q2">
          <span data-twin />
        </RouterLink>
      </OutcomeTile>,
    );
    const link = screen.getByRole("link", { name: "Pytanie 2: jeszcze nie" });
    expect(link.hasAttribute("data-router")).toBe(true);
    expect(link.getAttribute("data-outcome")).toBe("not_yet");
    expect(link.hasAttribute("role")).toBe(false);
    expect([...link.children].map((c) => c.hasAttribute("data-icon"))).toEqual([true, false]);
    expect(link.lastElementChild?.hasAttribute("data-twin")).toBe(true);
  });
});
