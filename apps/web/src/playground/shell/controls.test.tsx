/**
 * The segmented controls never clip a label (dl-w3.61 smoke test: the Review toolbar showed "Same
 * liczby" as "ame liczb"). happy-dom has no layout, so the test holds the rule
 * that makes clipping impossible: every segment is at least as wide as its words, the row wraps,
 * and nothing hides overflow or fixes a width.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Segmented } from "./controls.tsx";

afterEach(cleanup);

const CLIPS =
  /(^|\s)(overflow-hidden|overflow-clip|truncate|text-ellipsis|text-clip|whitespace-nowrap|w-\d|w-\[|max-w-\d|max-w-\[|min-w-0|basis-0|flex-1|shrink)(\s|$)/;

describe("Segmented", () => {
  it("lets every segment fit its label and wraps the row instead of clipping", () => {
    render(
      <Segmented<string>
        label="Shown in"
        value="pl"
        options={[
          { value: "pl", label: "Polski" },
          { value: "en", label: "English" },
          { value: "same", label: "Same liczby, a long label that wraps" },
        ]}
        onChange={() => undefined}
      />,
    );
    const group = screen.getByRole("radiogroup");
    expect(group.className).toMatch(/(^|\s)flex-wrap(\s|$)/);
    expect(group.className).not.toMatch(/(^|\s)(overflow-hidden|overflow-clip|flex-nowrap)(\s|$)/);
    const items = screen.getAllByRole("radio");
    expect(items).toHaveLength(3);
    for (const item of items) {
      const cls = item.className;
      expect(cls).toMatch(/(^|\s)min-w-fit(\s|$)/);
      expect(cls).toMatch(/(^|\s)whitespace-normal(\s|$)/);
      expect(cls).toMatch(/(^|\s)h-auto(\s|$)/);
      expect(cls).not.toMatch(CLIPS);
      expect(cls).not.toMatch(/(^|\s)(h-8|min-w-8)(\s|$)/);
    }
  });
});
