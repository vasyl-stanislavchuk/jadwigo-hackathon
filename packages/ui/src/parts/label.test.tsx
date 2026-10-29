// @vitest-environment happy-dom
// Label (dl-uukj.32.3): names its control, at the body size, bold.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Label } from "./label.tsx";

afterEach(cleanup);

describe("Label", () => {
  it("names the control it points at", () => {
    render(
      <>
        <Label htmlFor="email">E-mail</Label>
        <input id="email" />
      </>,
    );
    const input = screen.getByRole("textbox", { name: "E-mail" });
    expect(input.id).toBe("email");
    const label = screen.getByText("E-mail");
    expect(label.classList.contains("text-jw-body")).toBe(true);
    expect(label.classList.contains("font-bold")).toBe(true);
  });
});
