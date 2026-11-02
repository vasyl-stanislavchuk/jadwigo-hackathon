/**
 * Jadwigo AI's words as markdown (ChatMarkdown.tsx): bold, lists and tables draw as elements, a
 * lone newline stays a break, and raw HTML or an image never renders.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatMarkdown } from "./ChatMarkdown.tsx";

afterEach(cleanup);

const md = (text: string): HTMLElement => {
  render(<ChatMarkdown text={text} />);
  return document.querySelector("[data-markdown]") as HTMLElement;
};

describe("ChatMarkdown", () => {
  it("draws bold, a list and a table", () => {
    const root = md(
      "Gotowe: **Powtórka mieszana**\n\n- jeden\n- dwa\n\n| a | b |\n| - | - |\n| 1 | 2 |",
    );
    expect(root.querySelector("strong")?.textContent).toBe("Powtórka mieszana");
    expect(root.querySelectorAll("ul > li")).toHaveLength(2);
    expect(root.querySelector("table td")?.textContent).toBe("1");
  });

  it("keeps a lone newline as a line break", () => {
    const root = md("pierwsza\ndruga");
    expect(root.querySelector("p br")).not.toBeNull();
  });

  it("renders no raw HTML and no image", () => {
    const root = md("<b>x</b> ![a](https://example.com/a.png) <script>alert(1)</script>");
    expect(root.querySelector("b, img, script")).toBeNull();
  });

  it("opens a link in a new tab", () => {
    const link = md("[strona](https://example.com)").querySelector("a") as HTMLAnchorElement;
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
  });
});
