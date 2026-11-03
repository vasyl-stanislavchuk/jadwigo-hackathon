// @vitest-environment happy-dom
/**
 * The preview's band (chat handoff dl-uukj.47.71 S20, in the modal by the owner's amendment): while
 * a turn writes the lesson, it names the version coming; with no turn writing, there is none.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PreviewDialog } from "./PreviewDialog.tsx";

afterEach(cleanup);

const band = () => document.querySelector("[data-preview-band]");

describe("the preview's band (S20)", () => {
  it("says Jadwigo is changing the lesson and which version comes", () => {
    render(
      <PreviewDialog open onClose={() => {}} title="Lekcja" language="pl" band={3}>
        <p>body</p>
      </PreviewDialog>,
    );
    expect(band()?.textContent).toBe("Jadwigo zmienia tę lekcję. Wersja 3 pojawi się tutaj.");
  });

  it("is not drawn while no turn writes the lesson", () => {
    render(
      <PreviewDialog open onClose={() => {}} title="Lekcja" language="pl">
        <p>body</p>
      </PreviewDialog>,
    );
    expect(band()).toBeNull();
  });
});
