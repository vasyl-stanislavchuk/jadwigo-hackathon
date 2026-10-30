import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { checkBatch, settle } from "./batch.ts";
import { ItemBoundary } from "./ItemBoundary.tsx";

// Made-up drawings, never bank items (AGENTS.md fence 8).
function root(html: string): HTMLElement {
  const el = document.createElement("section");
  el.innerHTML = html;
  document.body.append(el);
  return el;
}

const rules = (findings: Map<string, { rule: string }[]>, id: string): string[] =>
  (findings.get(id) ?? []).map((f) => f.rule);

function Throws(): never {
  throw new Error("no data.options");
}

describe("a conformance batch, failing closed", () => {
  it("finds a picture whose ref no media URL serves", async () => {
    // happy-dom loads no picture: one with an address ends complete with no width, as a 404 does.
    const found = await checkBatch(
      ["item-bad-ref"],
      new Map([
        [
          "item-bad-ref",
          root('<p>Ile?</p><img alt="" src="/0123456789abcdef0123456789abcdef01234567.png">'),
        ],
      ]),
    );
    expect(rules(found, "item-bad-ref")).toEqual(["render-picture-missing"]);
  });

  it("gives an item the page never mounted render-unplayable, and checks the rest", async () => {
    const found = await checkBatch(
      ["item-drawn", "item-never-mounted"],
      new Map([["item-drawn", root("<p>Ile to 2 + 2?</p>")]]),
    );
    expect([...found.keys()]).toEqual(["item-drawn", "item-never-mounted"]);
    expect(rules(found, "item-drawn")).toEqual([]);
    expect(rules(found, "item-never-mounted")).toEqual(["render-unplayable"]);
    expect(found.get("item-never-mounted")?.[0]?.text).toContain("never mounted");
  });

  it("counts a picture still loading when the wait runs out as not loaded", async () => {
    const el = root('<img alt="" src="https://media.invalid/slow.png">');
    const img = el.querySelector("img") as HTMLImageElement;
    Object.defineProperty(img, "complete", { value: false });
    expect(await settle([el], 5)).toEqual([img]);
    const found = await checkBatch(["item-slow"], new Map([["item-slow", el]]), 5);
    expect(rules(found, "item-slow")).toEqual(["render-picture-missing"]);
    expect(found.get("item-slow")?.[0]?.text).toContain("still loading after");
  });

  it("waits for a picture that loads, and finds nothing", async () => {
    const el = root('<img alt="" src="https://media.invalid/ok.png">');
    const img = el.querySelector("img") as HTMLImageElement;
    let complete = false;
    Object.defineProperty(img, "complete", { get: () => complete });
    Object.defineProperty(img, "naturalWidth", { get: () => (complete ? 10 : 0) });
    setTimeout(() => {
      complete = true;
      img.dispatchEvent(new Event("load"));
    }, 1);
    expect(await settle([el], 1_000)).toEqual([]);
  });

  it("gives an item whose view threw render-unplayable with the error", async () => {
    // React reports the caught error on the console; the boundary is what is under test.
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { container } = render(
      <ItemBoundary>
        <Throws />
      </ItemBoundary>,
    );
    const found = await checkBatch(["item-throws"], new Map([["item-throws", container]]));
    expect(rules(found, "item-throws")).toEqual(["render-unplayable"]);
    expect(found.get("item-throws")?.[0]?.text).toContain("no data.options");
    quiet.mockRestore();
  });

  it("waits for a picture that mounts while another loads", async () => {
    const el = root('<img alt="" src="https://media.invalid/first.png">');
    const first = el.querySelector("img") as HTMLImageElement;
    let firstDone = false;
    Object.defineProperty(first, "complete", { get: () => firstDone });
    const late = document.createElement("img");
    let lateDone = false;
    Object.defineProperty(late, "complete", { get: () => lateDone });
    Object.defineProperty(late, "naturalWidth", { get: () => (lateDone ? 10 : 0) });
    setTimeout(() => {
      // The first one fails as a second mounts, still loading; it arrives a little later.
      el.append(late);
      firstDone = true;
      first.dispatchEvent(new Event("error"));
      setTimeout(() => {
        lateDone = true;
        late.dispatchEvent(new Event("load"));
      }, 20);
    }, 1);
    expect(await settle([el], 1_000)).toEqual([]);
    expect(lateDone).toBe(true);
  });

  it("judges a picture by how it stands when the rules run: one finding each, never a stale one", async () => {
    // Failed outright: the render rule's one finding, not a second for still loading.
    const failed = root('<img alt="" src="https://media.invalid/gone.png">');
    // Still loading through the whole wait: not loaded.
    const slow = root('<img alt="" src="https://media.invalid/slow.png">');
    Object.defineProperty(slow.querySelector("img") as HTMLImageElement, "complete", {
      value: false,
    });
    const found = await checkBatch(
      ["item-failed", "item-slow"],
      new Map([
        ["item-failed", failed],
        ["item-slow", slow],
      ]),
      5,
    );
    expect(rules(found, "item-failed")).toEqual(["render-picture-missing"]);
    expect(found.get("item-failed")?.[0]?.text).toContain("did not load:");
    expect(rules(found, "item-slow")).toEqual(["render-picture-missing"]);
    expect(found.get("item-slow")?.[0]?.text).toContain("still loading after");
  });
});
