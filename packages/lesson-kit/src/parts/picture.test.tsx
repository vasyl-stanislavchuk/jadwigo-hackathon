/**
 * The Picture part (dl-w3.52): the box is reserved from width and height, and a drawing's labels
 * sit at percent positions computed from its coordinate range, shifted by their alignment. A label
 * is TeX unless it says `math: false`.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { must } from "./must.ts";
import { Picture } from "./Picture.tsx";

afterEach(cleanup);

describe("Picture", () => {
  it("reserves its box and keeps its words", () => {
    render(
      <Picture src="/media/khan/a.svg" alt="Three rows of four dots." width={120} height={80} />,
    );
    const img = screen.getByAltText("Three rows of four dots.");
    expect(img.getAttribute("width")).toBe("120");
    expect(img.getAttribute("height")).toBe("80");
  });

  it("places each label in the drawing range, y up, shifted by its alignment", () => {
    const labels = {
      range: [
        [0, 10],
        [0, 20],
      ] as [[number, number], [number, number]],
      items: [
        { content: "\\blueD{4}", coordinates: [5, 10] as [number, number], alignment: "center" },
        {
          content: "rows",
          coordinates: [0, 20] as [number, number],
          alignment: "above right",
          math: false as const,
        },
      ],
    };
    const { container } = render(
      <Picture src="/media/khan/a.svg" alt="A drawing." width={100} height={200} labels={labels} />,
    );
    const four = must(must(container.querySelector<HTMLElement>("[data-tex]")).parentElement);
    expect(four.style.left).toBe("50%");
    expect(four.style.top).toBe("50%");
    expect(four.style.transform).toBe("translate(-50%, -50%)");
    expect(four.textContent).toContain("4");
    const rows = screen.getByText("rows");
    expect(rows.style.left).toBe("0%");
    expect(rows.style.top).toBe("0%");
    expect(rows.style.transform).toBe("translate(0%, -100%)");
    expect(rows.querySelector("[data-tex]")).toBeNull();
  });
});
