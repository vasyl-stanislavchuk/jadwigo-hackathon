// @vitest-environment happy-dom
// The left sidebar's hide and show (src/styles/sidebar-toggle.ts, src/components/SiteTitle.astro).
import { afterEach, describe, expect, it } from "vitest";
import { isCollapsed, SIDEBAR_KEY, SIDEBAR_STATE, toggleSidebar } from "./styles/sidebar-toggle.ts";

const root = document.documentElement;

afterEach(() => {
  root.removeAttribute("data-sidebar");
  localStorage.clear();
});

describe("SIDEBAR_STATE", () => {
  it("hides the sidebar before the first paint when the reader left it hidden", () => {
    localStorage.setItem(SIDEBAR_KEY, "collapsed");
    new Function(SIDEBAR_STATE)();
    expect(isCollapsed(root)).toBe(true);
  });

  it("leaves it shown otherwise", () => {
    new Function(SIDEBAR_STATE)();
    expect(isCollapsed(root)).toBe(false);
  });
});

describe("toggleSidebar", () => {
  it("hides, then shows, and remembers each", () => {
    expect(toggleSidebar(root, localStorage)).toBe(true);
    expect(root.getAttribute("data-sidebar")).toBe("collapsed");
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe("collapsed");
    expect(toggleSidebar(root, localStorage)).toBe(false);
    expect(root.hasAttribute("data-sidebar")).toBe(false);
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe("open");
  });

  it("still toggles when storage refuses the write or is missing", () => {
    const refusing = {
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(toggleSidebar(root, refusing)).toBe(true);
    expect(toggleSidebar(root, null)).toBe(false);
  });
});

describe("the right-hand contents", () => {
  afterEach(() => {
    root.removeAttribute("data-toc");
  });

  it("hides and shows apart from the left sidebar, and is restored before the first paint", () => {
    expect(toggleSidebar(root, localStorage, "toc")).toBe(true);
    expect(root.getAttribute("data-toc")).toBe("collapsed");
    expect(isCollapsed(root, "sidebar")).toBe(false);
    root.removeAttribute("data-toc");
    new Function(SIDEBAR_STATE)();
    expect(isCollapsed(root, "toc")).toBe(true);
    expect(isCollapsed(root, "sidebar")).toBe(false);
  });
});
