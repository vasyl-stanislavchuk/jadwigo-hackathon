// @vitest-environment happy-dom
// Search opened before Pagefind builds its box (src/styles/search-focus.ts).
import { afterEach, describe, expect, it } from "vitest";
import { focusSearchWhenReady, SEARCH_FOCUS } from "./styles/search-focus.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function page(): HTMLDialogElement {
  document.body.innerHTML =
    "<site-search><dialog><div id='starlight__search'></div></dialog></site-search>";
  return document.querySelector("dialog") as HTMLDialogElement;
}

describe("focusSearchWhenReady", () => {
  it("focuses the box Pagefind adds after the dialog opened", async () => {
    const dialog = page();
    focusSearchWhenReady(document);
    dialog.setAttribute("open", "");
    await tick();
    dialog.querySelector("#starlight__search")?.append(document.createElement("input"));
    await tick();
    expect(document.activeElement?.tagName).toBe("INPUT");
  });

  it("leaves the focus alone while the dialog is closed", async () => {
    const dialog = page();
    focusSearchWhenReady(document);
    dialog.querySelector("#starlight__search")?.append(document.createElement("input"));
    await tick();
    expect(document.activeElement?.tagName).not.toBe("INPUT");
  });

  it("does nothing on a page without search", () => {
    document.body.innerHTML = "<main></main>";
    expect(() => focusSearchWhenReady(document)()).not.toThrow();
  });
});

describe("SEARCH_FOCUS", () => {
  it("is a script that parses", () => {
    expect(() => new Function(SEARCH_FOCUS)).not.toThrow();
  });
});
