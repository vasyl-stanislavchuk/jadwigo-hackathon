/**
 * The Groups part (dl-w3.47): one picture read by its label, `groups` groups of `each` icons from
 * the icon library, and an icon off the list falls back so a figure always draws.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Groups } from "./Groups.tsx";

afterEach(cleanup);

describe("Groups", () => {
  it("draws groups × each objects as one labelled picture", () => {
    render(<Groups groups={2} each={7} icon="apple" label="2 grupy po 7" />);
    const img = screen.getByRole("img", { name: "2 grupy po 7" });
    expect(img.dataset["groups"]).toBe("2x7");
    expect(img.querySelectorAll("svg").length).toBe(14);
    expect(img.querySelectorAll('svg[aria-hidden="true"]').length).toBe(14);
  });

  it("falls back to the first icon for one off the list", () => {
    render(<Groups groups={1} each={3} icon="dragon" label="1 grupa po 3" />);
    expect(screen.getByRole("img").dataset["icon"]).toBe("apple");
  });

  it.each(["apple", "star", "heart", "fish", "flower", "cherry"])("knows %s", (icon) => {
    render(<Groups groups={1} each={1} icon={icon} label={icon} />);
    expect(screen.getByRole("img").dataset["icon"]).toBe(icon);
  });
});
