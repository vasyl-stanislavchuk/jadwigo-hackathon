// @vitest-environment happy-dom
// Field (dl-uukj.32.3): a label tied to its control, and while there is a problem, an alert the
// control points at and an invalid mark on the control.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Input } from "../primitives/input.tsx";
import { Field } from "./field.tsx";

afterEach(cleanup);

describe("Field", () => {
  it("ties the label to the control, with no alert while the value is fine", () => {
    render(
      <Field label="E-mail">
        <Input kind="text" type="email" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "E-mail" });
    expect(input.id).not.toBe("");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says the problem in an alert the control is described by, and marks it invalid", () => {
    render(
      <Field label="Kod" problem="Ten kod już nie działa.">
        <Input kind="text" inputMode="numeric" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Kod" });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Ten kod już nie działa.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("keeps the control's own id and description, adding the problem to it", () => {
    render(
      <>
        <p id="hint">6 cyfr z e-maila</p>
        <Field label="Kod" problem="Za krótki.">
          <Input kind="text" id="code" aria-describedby="hint" />
        </Field>
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Kod" });
    expect(input.id).toBe("code");
    expect(input.getAttribute("aria-describedby")).toBe(`hint ${screen.getByRole("alert").id}`);
  });

  it("treats an empty problem as none: no alert, and the control stays valid", () => {
    render(
      <Field label="Kod" problem="">
        <Input kind="text" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Kod" });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(input.hasAttribute("aria-describedby")).toBe(false);
  });

  it("gives two fields on one page different ids", () => {
    render(
      <>
        <Field label="Imię">
          <Input kind="text" />
        </Field>
        <Field label="Nazwisko">
          <Input kind="text" />
        </Field>
      </>,
    );
    const first = screen.getByRole("textbox", { name: "Imię" });
    const second = screen.getByRole("textbox", { name: "Nazwisko" });
    expect(first.id).not.toBe(second.id);
  });
});
