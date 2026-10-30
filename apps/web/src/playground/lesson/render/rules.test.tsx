import { LESSON_FILES } from "@jadwigo/testing";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LessonBuilderScreen } from "../LessonBuilderScreen.tsx";
import { renderFindings } from "./rules.ts";

afterEach(cleanup);

const step = { step_id: "q1", path: "script.parts[0].steps[1]" };

/** A step root holding `html`, in the document so computed styles apply. */
function root(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.append(el);
  return el;
}

const rules = (html: string) => renderFindings(root(html), step).map((f) => f.rule);

describe("renderFindings", () => {
  it("finds TeX drawn as its source, and not KaTeX's own copy or code", () => {
    expect(rules("<p>Ile to jest $2 \\times 3$?</p>")).toEqual(["render-raw-tex"]);
    expect(rules("<p>Policz \\frac{1}{2} tortu.</p>")).toEqual(["render-raw-tex"]);
    expect(rules('<p>Ile to <span class="katex"><annotation>$2$</annotation></span>?</p>')).toEqual(
      [],
    );
    expect(rules("<p>Wpisz <code>$x$</code>.</p>")).toEqual([]);
  });

  it("finds a sentence whose runs are items of a flex host, the live run's bug", () => {
    expect(
      rules(
        '<span style="display: flex; flex-direction: column">Na stole są <span data-formula>2</span> talerze.</span>',
      ),
    ).toEqual(["render-split-inline"]);
    expect(
      rules(
        '<span style="display: flex"><span>Na stole są <span data-formula>2</span> talerze.</span></span>',
      ),
    ).toEqual([]);
  });

  it("finds a picture with no address, and one that failed to load", () => {
    expect(rules('<img alt="" src="">')).toEqual(["render-picture-missing"]);
    const r = root('<img alt="" src="/media/missing.png">');
    const img = r.querySelector("img") as HTMLImageElement;
    Object.defineProperty(img, "complete", { value: true });
    Object.defineProperty(img, "naturalWidth", { value: 0 });
    expect(renderFindings(r, step).map((f) => f.rule)).toEqual(["render-picture-missing"]);
  });

  it("finds an option with nothing in it, its key badge aside", () => {
    expect(
      rules('<ul><li data-still-option="o1"><span data-key-badge>1</span><span></span></li></ul>'),
    ).toEqual(["render-empty-option"]);
    expect(rules('<ul><li data-still-option="o1"><span>Tak</span></li></ul>')).toEqual([]);
    expect(
      rules(
        '<ul><li data-still-option="o2"><span role="img" aria-label="3 by 2"></span></li></ul>',
      ),
    ).toEqual([]);
  });

  it("names the step, its path and a fix on every finding", () => {
    const [found] = renderFindings(root("<p>Ile to $2?</p><p>$3$</p>"), step);
    expect(found).toMatchObject({
      step_id: "q1",
      path: "script.parts[0].steps[1]",
      level: "error",
      rule: "render-raw-tex",
    });
    expect(found?.fix).not.toBe("");
  });

  it("finds nothing in a step the kit draws right, and raw TeX in one with a stray $", () => {
    const raw = structuredClone(
      LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups"),
    ) as { script: { parts: { steps: { id: string; say?: { pl: string } }[] }[] } };
    const s05 = raw.script.parts[2]?.steps.find((s) => s.id === "s05");
    if (s05?.say === undefined) throw new Error("the fixture's s05 changed");
    s05.say.pl = "Ile to jest $3 \\times 4? Napisz albo powiedz.";
    render(
      <LessonBuilderScreen
        initial={{
          dir: "/drafts",
          drafts: [{ draft_id: "x", title: "", mtime: 0 }],
          draft_id: "x",
          draft: raw,
          check: null,
          render: null,
          error: null,
        }}
      />,
    );
    const drawn = (id: string) =>
      document.querySelector(`[data-step='${id}'] .kid-step`) as HTMLElement;
    expect(renderFindings(drawn("s02"), { step_id: "s02", path: "p" })).toEqual([]);
    expect(renderFindings(drawn("s05"), { step_id: "s05", path: "p" }).map((f) => f.rule)).toEqual([
      "render-raw-tex",
    ]);
  });
});
