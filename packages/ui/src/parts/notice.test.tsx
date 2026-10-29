// @vitest-environment happy-dom
// Notice (dl-uukj.32.3): a status a screen reader says when it is free, or an alert said at once.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Notice } from "./notice.tsx";

afterEach(cleanup);

describe("Notice", () => {
  it("is a status by default", () => {
    render(<Notice>Wysłaliśmy kod na twój e-mail.</Notice>);
    expect(screen.getByRole("status").textContent).toBe("Wysłaliśmy kod na twój e-mail.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("is an alert when what it says stops the adult", () => {
    render(
      <Notice role="alert" icon={<svg aria-hidden="true" data-mark />}>
        Kod nie dotarł. Spróbuj jeszcze raz.
      </Notice>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Kod nie dotarł. Spróbuj jeszcze raz.");
    expect(alert.querySelector("[data-mark]")).not.toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("wears neither the right's green nor the miss's red", () => {
    render(
      <>
        <Notice>a</Notice>
        <Notice role="alert">b</Notice>
      </>,
    );
    for (const el of [screen.getByRole("status"), screen.getByRole("alert")])
      expect(el.className).not.toMatch(/kid-correct|kid-try-again|jw-right|jw-miss/);
  });
});
