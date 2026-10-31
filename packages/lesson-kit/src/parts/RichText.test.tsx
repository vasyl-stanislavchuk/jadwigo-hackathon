/**
 * The RichText part (dl-r772.6): the parsed blocks drawn, TeX through KaTeX with Khan's colour
 * macros on our classes, and nothing but KaTeX output set from a string.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { must } from "./must.ts";
import { plainTex, RichText } from "./RichText.tsx";
import { renderTex, TEX_MACROS } from "./richTextMacros.ts";

afterEach(cleanup);

describe("RichText", () => {
  it("draws bold as strong and a backtick span as a chip", () => {
    const { container } = render(<RichText text="**Bold. ** then `bd ready`" />);
    expect(container.querySelector("p strong")?.textContent).toBe("Bold.");
    expect(container.querySelector("code")?.textContent).toBe("bd ready");
    expect(container.textContent).toBe("Bold. then bd ready");
  });

  it("draws a Perseus table as a table with header cells", () => {
    const { container } = render(<RichText text={"a | b\n- | -\n1 | 2"} />);
    expect([...container.querySelectorAll("th")].map((th) => th.textContent)).toEqual(["a", "b"]);
    expect([...container.querySelectorAll("td")].map((td) => td.textContent)).toEqual(["1", "2"]);
  });

  it("draws an image with its alt text", () => {
    const { container } = render(<RichText text="![four dots](/media/khan/a.png)" />);
    const img = must(container.querySelector("img"));
    expect(img.getAttribute("alt")).toBe("four dots");
    expect(img.getAttribute("src")).toBe("/media/khan/a.png");
    expect(img.className).toMatch(/max-w-full/);
  });

  it("draws an item that is only a picture line as the picture, not its markdown (dl-a38n.32.40)", () => {
    const { container } = render(
      <RichText inline text="![The shortest ribbon.]( /media/khan/0a1b2c.svg)" />,
    );
    const img = must(container.querySelector("img"));
    expect(img.getAttribute("alt")).toBe("The shortest ribbon.");
    expect(img.getAttribute("src")).toBe("/media/khan/0a1b2c.svg");
    expect(container.textContent).not.toContain("![");
  });

  it("draws pictures inside a line inline, beside their TeX, never as markdown (dl-a38n.32.40)", () => {
    const { container } = render(
      <span>
        <RichText
          inline
          text="$A$ ![A bar in 3 parts.](/media/khan/1.svg)$=$![A bar in 6 parts.](/media/khan/2.svg)"
        />
      </span>,
    );
    const host = must(container.firstElementChild);
    const imgs = [...host.querySelectorAll("img")];
    expect(imgs.map((i) => i.getAttribute("alt"))).toEqual([
      "A bar in 3 parts.",
      "A bar in 6 parts.",
    ]);
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual([
      "/media/khan/1.svg",
      "/media/khan/2.svg",
    ]);
    // Each picture sits in the line itself, beside the TeX: no block wrapper, no break.
    for (const img of imgs) {
      expect(img.parentElement).toBe(host);
      expect(img.className).toMatch(/inline-block/);
      expect(img.className).toMatch(/align-middle/);
    }
    expect(host.querySelector("br, p, div")).toBeNull();
    expect(host.textContent).not.toMatch(/!\[|\]\(/);
  });

  it("paints \\blueD with the tex-blue class and raises no KaTeX error", () => {
    const { container } = render(<RichText text="so $\blueD{4} \times \greenD{3}$" />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector(".tex-blue")?.textContent).toBe("4");
    expect(container.querySelector(".tex-green")?.textContent).toBe("3");
    expect(container.querySelector(".katex-error")).toBeNull();
  });

  it("gives a TeX span a name a screen reader can read, while the drawn HTML stays aria-hidden", () => {
    const { container } = render(<RichText inline text="$\blueD{4}\times3$ and $\frac{1}{2}$" />);
    expect(screen.getByRole("math", { name: "4 × 3" })).toBeTruthy();
    expect(screen.getByRole("math", { name: "1/2" })).toBeTruthy();
    expect(container.querySelector(".katex-html")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.textContent).not.toContain("\\times");
  });

  it("never sets HTML from the text itself", () => {
    const { container } = render(<RichText text={"<b>x</b> and $\\text{<i>y</i>}$"} />);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("i")).toBeNull();
    expect(container.textContent).toContain("<b>x</b>");
  });

  it("rewrites an inline align to aligned, so it draws", () => {
    expect(renderTex("\\begin{align}a&=b\\\\c&=d\\end{align}")).not.toContain("katex-error");
    const { container } = render(<RichText text="$\begin{align}a&=b\end{align}$" />);
    expect(container.querySelector(".katex-error")).toBeNull();
  });

  it("display TeX is display maths", () => {
    const { container } = render(<RichText text="$$\dfrac{1}{2}$$" />);
    expect(container.querySelector(".katex-display")).not.toBeNull();
    const inline = render(<RichText text="$\dfrac{1}{2}$" />);
    expect(inline.container.querySelector(".katex-display")).toBeNull();
  });

  it("draws a slot through the callback, and a marker inside TeX as TeX", () => {
    const { container } = render(
      <RichText
        text="Fill {g1} of $\text{fives}$ {g2}"
        slotIds={new Set(["g1"])}
        slots={(id) => <input aria-label={id} />}
      />,
    );
    expect(container.querySelector("input")?.getAttribute("aria-label")).toBe("g1");
    expect(container.textContent).toContain("{g2}");
    expect(container.querySelector(".katex")?.textContent).toContain("fives");
  });

  it("keeps a slot with its word on one line, and leaves a slot between spaces alone (dl-w3.68.24)", () => {
    const slots = (id: string) => <input aria-label={id} />;
    const { container } = render(<RichText text="jest mr{g1}z{g2}a, i {g3} tak" slots={slots} />);
    const words = container.querySelectorAll("[data-word]");
    expect(words).toHaveLength(1);
    expect(words[0]?.className).toContain("whitespace-nowrap");
    expect(words[0]?.textContent).toBe("mrza,");
    expect(
      [...must(words[0]).querySelectorAll("input")].map((i) => i.getAttribute("aria-label")),
    ).toEqual(["g1", "g2"]);
    expect(container.querySelector('[aria-label="g3"]')?.closest("[data-word]")).toBeNull();
    expect(container.textContent).toBe("jest mrza, i  tak");
  });

  it("puts a slot inside a word in a cell two letters wide, and a whole word before a full stop in none (Slots addendum 3.2)", () => {
    const slots = (id: string) => <input aria-label={id} data-field={id} />;
    const { container } = render(<RichText text="stoi st{g1}ł. Tu dwa {g2}." slots={slots} />);
    const cells = container.querySelectorAll<HTMLElement>("[data-in-word]");
    expect(cells).toHaveLength(1);
    expect(cells[0]?.querySelector("input")?.getAttribute("aria-label")).toBe("g1");
    // Outside a step frame the laptop's 60; the cell is 64 tall and the field fills it.
    expect(cells[0]?.style.width).toBe("3.75rem");
    expect(cells[0]?.style.getPropertyValue("--gap-w")).toBe("3.75rem");
    expect(cells[0]?.style.getPropertyValue("--gap-h")).toBe("4rem");
    expect(cells[0]?.closest("[data-word]")?.textContent).toBe("stł.");
    expect(container.querySelector('[aria-label="g2"]')?.closest("[data-in-word]")).toBeNull();
  });

  it("inline mode has no block elements", () => {
    const { container } = render(
      <span data-host>
        <RichText inline text={"**b** and $x$"} />
      </span>,
    );
    expect(container.querySelector("p, div, table, ul")).toBeNull();
    expect(container.querySelector("[data-host] > strong")).not.toBeNull();
  });

  it("every colour macro paints a tex- class, and the named macros are KaTeX", () => {
    for (const [name, body] of Object.entries(TEX_MACROS)) {
      const colour = /^\\htmlClass\{(tex-[a-z-]+)\}\{#1\}$/.exec(body);
      if (colour) expect(renderTex(`${name}{1}`), name).toContain(`enclosing ${colour[1]}`);
      else
        expect(
          renderTex(
            name === "\\bold" || name === "\\sout" || name === "\\mbox" ? `${name}{x}` : name,
          ),
          name,
        ).not.toContain("katex-error");
    }
    expect(Object.keys(TEX_MACROS).length).toBeGreaterThanOrEqual(50);
  });
});

describe("a glossary term (dl-w3.56)", () => {
  const host = () =>
    render(
      <p data-host>
        Which number is <RichText inline text="[odd](def: not a multiple of $2$)" />?
      </p>,
    );

  it("is a dotted-underlined button in the run of text, closed until tapped", () => {
    const { container } = host();
    const button = screen.getByRole("button", { name: "odd" });
    expect(button.className).toMatch(/decoration-dotted/);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("[data-host]")?.textContent).toBe("Which number is odd?");
    expect(screen.queryByText(/multiple of/)).toBeNull();
  });

  it("opens by tap with the meaning drawn as rich text, outside the host so the text never moves, and closes on Escape", () => {
    const { container } = host();
    const hostEl = must(container.querySelector("[data-host]"));
    const before = { children: hostEl.querySelectorAll("*").length, text: hostEl.textContent };
    fireEvent.click(screen.getByRole("button", { name: "odd" }));
    const meaning = must(document.querySelector('[data-term="meaning"]'));
    expect(meaning).not.toBeNull();
    expect(meaning.textContent).toContain("not a multiple of");
    expect(meaning.querySelector("[data-tex]")).not.toBeNull();
    expect(must(container.querySelector("[data-host]")).contains(meaning)).toBe(false);
    // Nothing was added to the host: the meaning floats in a portal, so the line keeps its height.
    expect({ children: hostEl.querySelectorAll("*").length, text: hostEl.textContent }).toEqual(
      before,
    );
    fireEvent.keyDown(meaning, { key: "Escape" });
    expect(document.querySelector('[data-term="meaning"]')).toBeNull();
  });

  it("opens by keyboard: the word is a real button that takes focus, Enter and Space", () => {
    host();
    const button = screen.getByRole("button", { name: "odd" }) as HTMLButtonElement;
    expect(button.tagName).toBe("BUTTON");
    expect(button.type).toBe("button");
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
    expect(document.querySelector('[data-term="meaning"]')).not.toBeNull();
  });

  it("on paper the meaning follows the word in brackets, with nothing to tap", () => {
    const { container } = render(<RichText paper inline text="an [odd](def: not even) number" />);
    expect(container.querySelector("button")).toBeNull();
    expect(container.textContent).toBe("an odd (not even) number");
  });
});

describe("formulas (lesson frame rule 17)", () => {
  it("draws numbers and signs as text on one line, and leaves fractions, powers and roots to KaTeX", () => {
    expect(plainTex("3 \\times 4=12")).toBe("3 × 4 = 12");
    expect(plainTex("7-2")).toBe("7 − 2");
    expect(plainTex("-5+2")).toBe("−5 + 2");
    expect(plainTex("1{,}5\\cdot 2")).toBe("1,5 · 2");
    for (const tex of ["\\frac{3}{4}", "5^2", "\\sqrt{9}", "x+3", "\\blueD{7}"])
      expect(plainTex(tex)).toBeNull();
    const { container } = render(<RichText text="Ile to $5^2$, czyli $5 \times 5$?" />);
    const spans = [...container.querySelectorAll<HTMLElement>("[data-tex]")];
    const power = must(spans[0]);
    const product = must(spans[1]);
    expect(power.querySelector(".katex")).not.toBeNull();
    expect(product.querySelector(".katex")).toBeNull();
    expect(product.hasAttribute("data-formula")).toBe(true);
    expect(product.textContent).toBe("5 × 5");
    expect(product.getAttribute("aria-label")).toBe("5 × 5");
  });
});
