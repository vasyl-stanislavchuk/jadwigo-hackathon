/**
 * The picture sheet (dl-uukj.29.5, lesson-frame rule 16): a tap on a picture opens it full screen
 * with close focused; Esc, a tap or close returns focus to the picture.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { must } from "./must.ts";
import { PictureView } from "./PictureSheet.tsx";

afterEach(cleanup);

const draw = () =>
  render(
    <PictureView language="pl" alt="Morze" thumb>
      <img src="/x.png" alt="Morze" />
    </PictureView>,
  );

describe("PictureView", () => {
  it("opens the sheet with close focused, and Esc returns focus to the picture", () => {
    draw();
    const picture = screen.getByRole("button", { name: "Powiększ obrazek: Morze" });
    expect(picture.hasAttribute("data-thumb")).toBe(true);
    fireEvent.click(picture);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Zamknij obrazek" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(picture);
  });

  it("closes on close and on a tap anywhere on the sheet", () => {
    draw();
    const picture = screen.getByRole("button", { name: "Powiększ obrazek: Morze" });
    fireEvent.click(picture);
    fireEvent.click(screen.getByRole("button", { name: "Zamknij obrazek" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(picture);
    fireEvent.click(picture);
    fireEvent.click(must(screen.getByRole("dialog").querySelector("img")));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
