/**
 * One drawn batch of the conformance page checked, failing closed (dl-a38n.32.1): an item the page
 * never mounted, or whose view threw, is `render-unplayable`; every picture in the batch loads or
 * fails before the render rules run, and one still loading when the wait runs out counts as not
 * loaded. Without this a picture still in flight read as no finding (`pictureMissing` skips it), so
 * an item whose picture never arrives passed.
 */

import type { Finding } from "@jadwigo/lesson-import/file";
import { renderFindings } from "../lesson/render/rules.ts";

/** How long a batch's pictures get to load or fail before the ones left count as not loaded. */
const PICTURE_WAIT_MS = 10_000;

/** The attribute an item's error boundary leaves when its view threw, holding the error. */
export const THREW = "data-conformance-threw";

/** An item that does not draw: an error, since a copy of it would not draw either. */
export function unplayable(item_id: string, reason: string): Finding {
  return {
    step_id: item_id,
    path: "",
    level: "error",
    rule: "render-unplayable",
    text: `The item does not draw: ${reason}`,
    fix: "Convert the item to a question its family draws (its question type, data and key), or leave it out of the bank.",
  };
}

/** A picture still loading when the wait ran out: the same rule as one that failed. */
function stillLoading(item_id: string, img: HTMLImageElement, waitMs: number): Finding {
  const src = img.getAttribute("src") ?? "";
  return {
    step_id: item_id,
    path: "spec",
    level: "error",
    rule: "render-picture-missing",
    text: `A picture did not load in ${waitMs / 1000} s: ${src.length > 40 ? `${src.slice(0, 39)}…` : src}.`,
    fix: "The media pipeline must serve the picture's ref (<sha>.<ext>) at the media URL; check VITE_MEDIA_URL and that the ref was uploaded.",
  };
}

/** One frame drawn. */
const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()));

/** Every picture under `roots` loaded or failed, or the wait ran out: the ones still loading. */
export async function settle(
  roots: readonly Element[],
  waitMs: number = PICTURE_WAIT_MS,
): Promise<HTMLImageElement[]> {
  const pending = roots.flatMap((r) => [...r.querySelectorAll("img")]).filter((i) => !i.complete);
  if (pending.length === 0) return [];
  const each = pending.map(
    (img) =>
      new Promise<void>((done) => {
        img.addEventListener("load", () => done(), { once: true });
        img.addEventListener("error", () => done(), { once: true });
      }),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = new Promise<void>((done) => {
    timer = setTimeout(done, waitMs);
  });
  await Promise.race([Promise.all(each), wait]);
  clearTimeout(timer);
  return pending.filter((img) => !img.complete);
}

/**
 * Each item's findings, in `ids` order: the batch is laid out, its pictures settle, one more frame
 * draws what they changed, and the render rules run on each mounted item.
 */
export async function checkBatch(
  ids: readonly string[],
  roots: ReadonlyMap<string, Element>,
  waitMs: number = PICTURE_WAIT_MS,
): Promise<Map<string, Finding[]>> {
  await frame();
  await frame();
  const mounted = ids.flatMap((id) => {
    const root = roots.get(id);
    return root === undefined ? [] : [root];
  });
  const loading = new Set(await settle(mounted, waitMs));
  await frame();
  const out = new Map<string, Finding[]>();
  for (const id of ids) {
    const root = roots.get(id);
    if (root === undefined) {
      out.set(id, [unplayable(id, "the page never mounted it.")]);
      continue;
    }
    const threw = root.querySelector(`[${THREW}]`)?.getAttribute(THREW);
    if (threw !== undefined && threw !== null) {
      out.set(id, [unplayable(id, `its view threw: ${threw}`)]);
      continue;
    }
    const stuck = [...root.querySelectorAll("img")].filter((img) => loading.has(img));
    out.set(id, [
      ...renderFindings(root, { step_id: id, path: "spec" }),
      ...stuck.map((img) => stillLoading(id, img, waitMs)),
    ]);
  }
  return out;
}
