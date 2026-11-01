// @vitest-environment happy-dom
/**
 * The shadcn/ui primitives new blocks build on (dl-0ax3 foundation), held to the kid layer:
 * every tappable control takes its size from --kid-tap-min (or the larger --kid-commit-height
 * and --kid-key-size), which kidUx.test.ts holds at 56 px and up. Same pattern as
 * blocks/tapTargets.test.tsx: happy-dom loads no stylesheet, so the class names are the
 * contract. The source checks keep the primitives off PostHog's colour names (which mean
 * something else in posthog-theme.config.cjs) and away from red.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button";
import { Input } from "./input";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { Toggle } from "./toggle";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

afterEach(cleanup);

const KID_SIZE = /(^|\s)min-h-kid-(tap|commit|key)(\s|$)/;
const KID_WIDTH = /(^|\s)(min-w|w|size)-kid-(tap|commit|key)(\s|$)|(^|\s)w-full(\s|$)/;
const LITERAL_SIZE = /(^|\s)(min-)?[hw]-(\d|\[\d)|(^|\s)size-(\d|\[\d)/;

function expectKidSized(el: HTMLElement): void {
  expect(el.className).toMatch(KID_SIZE);
  expect(el.className).toMatch(KID_WIDTH);
  expect(el.className, "no literal height or width beside the kid size").not.toMatch(LITERAL_SIZE);
}

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("not rendered");
  return value;
}

describe("Button tap target", () => {
  const variants = ["default", "secondary", "outline", "ghost"] as const;
  const sizes = ["default", "commit", "icon"] as const;

  it.each(variants.flatMap((v) => sizes.map((s) => [v, s] as const)))(
    "%s / %s is sized from the kid layer",
    (variant, size) => {
      const { getByRole } = render(
        <Button variant={variant} size={size}>
          7
        </Button>,
      );
      expectKidSized(getByRole("button"));
    },
  );

  it("makes the commit size at least the commit height", () => {
    const { getByRole } = render(<Button size="commit">Dalej</Button>);
    expect(getByRole("button").className).toMatch(/(^|\s)min-h-kid-commit(\s|$)/);
  });

  // A settings or navigation control on an app page is 48, not the kid 56 (dl-og82, dl-uukj.32.3).
  it("makes the control size 48, from --jw-control-height", () => {
    const { getByRole } = render(<Button size="control">Zapisz</Button>);
    const button = getByRole("button", { name: "Zapisz" });
    expect(button.getAttribute("data-size")).toBe("control");
    expect(button.className).toMatch(/(^|\s)min-h-jw-control(\s|$)/);
    expect(button.className).not.toMatch(KID_SIZE);
    expect(button.className, "no literal height or width").not.toMatch(LITERAL_SIZE);
  });
});

// The default variant is Zeszyt's action on every page, not only under [data-lesson-theme], so the
// parent's "Wyślij kod" is the action blue, not Grape's purple (dl-uukj.32.3). Disabled, it goes quiet.
describe("Button default is the action", () => {
  const ACT = ["bg-jw-act", "text-jw-on-act", "shadow-jw-act"];

  it("wears the action outside any lesson theme", () => {
    const { getByRole } = render(<Button>Wyślij kod</Button>);
    const button = getByRole("button", { name: "Wyślij kod" });
    expect(button.closest("[data-lesson-theme]")).toBeNull();
    expect(button.getAttribute("data-variant")).toBe("default");
    for (const c of ACT) expect(button.classList.contains(c), c).toBe(true);
    expect(button.className).not.toMatch(/(^|\s)bg-primary(\s|$)/);
  });

  it.each(["secondary", "outline", "ghost"] as const)(
    "leaves the %s variant without it",
    (variant) => {
      const { getByRole } = render(<Button variant={variant}>Wróć</Button>);
      const button = getByRole("button", { name: "Wróć" });
      for (const c of ACT) expect(button.classList.contains(c), c).toBe(false);
    },
  );

  it("goes quiet when disabled, natively or by aria, with no edge", () => {
    const { getByRole } = render(
      <>
        <Button disabled>Wysyłam</Button>
        <Button aria-disabled="true">Sprawdź</Button>
      </>,
    );
    const native = getByRole("button", { name: "Wysyłam" });
    const aria = getByRole("button", { name: "Sprawdź" });
    for (const c of [
      "disabled:bg-jw-act-quiet",
      "disabled:text-jw-on-act-quiet",
      "disabled:shadow-none",
      // full opacity outside a lesson; in one foundation.css decides, as before
      "not-in-data-[lesson-theme=zeszyt]:disabled:opacity-100",
    ])
      expect(native.classList.contains(c), c).toBe(true);
    for (const c of [
      "aria-disabled:bg-jw-act-quiet",
      "aria-disabled:text-jw-on-act-quiet",
      "aria-disabled:shadow-none",
      "aria-disabled:opacity-100",
    ])
      expect(aria.classList.contains(c), c).toBe(true);
  });
});

describe("ToggleGroup tap target", () => {
  it.each(["default", "key"] as const)("every %s item is sized from the kid layer", (size) => {
    const { getAllByRole } = render(
      <ToggleGroup type="single" size={size} aria-label="Tak czy nie?">
        <ToggleGroupItem value="tak">Tak</ToggleGroupItem>
        <ToggleGroupItem value="nie">Nie</ToggleGroupItem>
      </ToggleGroup>,
    );
    const items = getAllByRole("radio");
    expect(items).toHaveLength(2);
    for (const item of items) expectKidSized(item);
  });

  it("spaces the items by the kid choice gap", () => {
    const { container } = render(
      <ToggleGroup type="single" aria-label="Tak czy nie?">
        <ToggleGroupItem value="tak">Tak</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(
      must(container.querySelector<HTMLElement>('[data-slot="toggle-group"]')).className,
    ).toMatch(/(^|\s)gap-kid-choice(\s|$)/);
  });
});

// dl-kh8l: every primitive a child presses or types into is rendered here. Badge and Progress
// are labels, not controls, and Card is a container; they carry no tap target.
describe("Toggle tap target", () => {
  it.each(["default", "key"] as const)(
    "a standalone %s toggle is sized from the kid layer",
    (size) => {
      const { getByRole } = render(
        <Toggle size={size} aria-label="Tak">
          Tak
        </Toggle>,
      );
      expectKidSized(getByRole("button"));
    },
  );
});

describe("Switch tap target", () => {
  it("is one kid-sized row: its words and the track turn it on and off", () => {
    const { getByRole } = render(<Switch defaultChecked>Dźwięk</Switch>);
    const row = getByRole("switch", { name: "Dźwięk" });
    expectKidSized(row);
    expect(row.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(row);
    expect(row.getAttribute("aria-checked")).toBe("false");
  });
});

describe("Input tap target", () => {
  it("is sized from the kid layer, with tabular digits, by default", () => {
    const { getByRole } = render(<Input inputMode="numeric" aria-label="Wynik" />);
    const input = getByRole("textbox", { name: "Wynik" });
    expectKidSized(input);
    expect(input.getAttribute("data-kind")).toBe("number");
    expect(input.className).toMatch(/(^|\s)tabular-nums(\s|$)/);
  });

  // An adult's field on an app page (dl-uukj.32.3): 48 at the body size, proportional digits.
  it("is 48 at the body size with proportional digits as kind text", () => {
    const { getByRole } = render(<Input kind="text" type="email" aria-label="E-mail" />);
    const input = getByRole("textbox", { name: "E-mail" });
    expect(input.getAttribute("data-kind")).toBe("text");
    expect(input.className).toMatch(/(^|\s)min-h-jw-control(\s|$)/);
    expect(input.className).toMatch(/(^|\s)text-jw-body(\s|$)/);
    expect(input.className).toMatch(/(^|\s)proportional-nums(\s|$)/);
    expect(input.className).not.toMatch(KID_SIZE);
    expect(input.className).not.toMatch(/tabular-nums|text-kid-answer/);
  });
});

describe("Slider tap target", () => {
  function renderSlider() {
    return render(
      <Slider defaultValue={[3]} min={0} max={10} step={1} aria-label="Gdzie jest 3?" />,
    );
  }

  it("makes the whole row at least --kid-tap-min high", () => {
    const { container } = renderSlider();
    expectKidSized(must(container.querySelector<HTMLElement>('[data-slot="slider"]')));
  });

  it("gives the thumb a hit area tied to --kid-tap-min through its ::after", () => {
    const { container } = renderSlider();
    const thumb = must(container.querySelector<HTMLElement>('[data-slot="slider-thumb"]'));
    // The hit area is the kid tap size itself, centred on the face, whatever the face measures.
    for (const c of [
      "after:size-kid-tap",
      "after:absolute",
      "after:top-1/2",
      "after:left-1/2",
      "after:-translate-x-1/2",
      "after:-translate-y-1/2",
    ])
      expect(thumb.classList.contains(c), c).toBe(true);
    // The face: 2.5rem is size-10, smaller than the hit area around it.
    expect(thumb.className).toMatch(/(^|\s)size-10(\s|$)/);
  });
});

describe("primitive sources", () => {
  const dir = import.meta.dirname;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
    .map((name) => ({ name, source: readFileSync(join(dir, name), "utf-8") }));

  it("holds the primitives the blocks and screens need, and nothing else", () => {
    expect(files.map((f) => f.name).sort()).toEqual(
      [
        "badge.tsx",
        "breadcrumb.tsx",
        "button.tsx",
        "card.tsx",
        "dialog.tsx",
        "disc.tsx",
        "input.tsx",
        "panel-toggle.tsx",
        "popover.tsx",
        "progress.tsx",
        "radio-group.tsx",
        "segmented-control.tsx",
        "sheet.tsx",
        "side-menu.tsx",
        "slider.tsx",
        "spinner.tsx",
        "switch.tsx",
        "table.tsx",
        "tabs.tsx",
        "toggle-group.tsx",
        "toggle.tsx",
      ].sort(), // popover: the chosen-gap menu (dl-w3.37.16); switch: the pause sheet's Dźwięk (dl-uukj.29.55); sheet and table: the lesson overview's question sheet and heatmap (dl-uukj.30.4); radio-group, segmented-control, tabs and side-menu: the settings and navigation controls (dl-uukj.32.3); breadcrumb, dialog, disc and panel-toggle: the parent app frame (dl-uukj.47.1)
    );
  });

  // Colours come only from the theme (styles/tailwind.css): no literal colour, no arbitrary
  // colour value, and none of PostHog's old names (surface-*, fill-*), which no longer resolve.
  const RAW_COLOUR =
    /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch)a?\(|-\[(?:#|rgb|hsl|var\(--color-)|(?<![\w-])(?:bg|text|border)-(?:surface|fill)-/i;

  it.each(files.map((f) => [f.name, f.source] as const))(
    "%s takes its colours only from the theme",
    (_, source) => {
      expect(source.match(RAW_COLOUR)?.[0] ?? null).toBeNull();
    },
  );

  // A literal height or width on a control would undercut --kid-tap-min. Icon sizes inside a
  // control ([&_svg…]:size-7) are not targets. The slider's track and thumb face are drawn
  // inside a row that is itself tap-min high; each is listed with its reason.
  const LABELS = new Set(["badge.tsx", "progress.tsx", "card.tsx", "spinner.tsx", "disc.tsx"]);
  const DRAWN: Record<string, string[]> = {
    "radio-group.tsx": [
      "min-w-0", // lets the wrapper of legend and rows shrink in a flex row; the rows are the targets
      "size-6", // the ring inside the 48 row that is the target
      "size-3", // the dot inside the ring
    ],
    "segmented-control.tsx": [
      "min-w-0", // lets the wrapper of legend and track shrink in a flex row; the track is the target
    ],
    "breadcrumb.tsx": [
      "min-w-0", // lets a long page name truncate in the top bar's flex row
    ],
    "panel-toggle.tsx": [
      "size-4.5", // the panel icon inside the control-sized button
    ],
    "tabs.tsx": [
      "min-w-0", // lets the tabs and their panel shrink in a flex row; each tab is a target
    ],
    "side-menu.tsx": [
      "w-6", // the icon column inside a 48 or 44 row
      "size-4", // the fold chevron inside a category row
    ],
    "switch.tsx": [
      "h-8", // the track, drawn inside the tap-min row that is the switch
      "w-14", // the same
      "size-6", // the knob inside the track
    ],
    "slider.tsx": [
      "data-horizontal:h-3", // the track's thickness, inside the tap-min row
      "data-vertical:w-3", // the same, vertical
      "data-vertical:min-h-40", // a vertical slider's length, not its target
      "size-10", // the thumb face; its ::after hit area is --kid-tap-min (test above)
    ],
  };
  const LITERAL = /^(?:[\w-]+:)*(?:min-|max-)?(?:h|w|size)-(?:\d|\[\d)/;

  it.each(files.filter((f) => !LABELS.has(f.name)).map((f) => [f.name, f.source] as const))(
    "%s sets no literal height or width on a control",
    (name, source) => {
      const tokens = [...source.matchAll(/(['"`])((?:(?!\1).)*)\1/g)].flatMap((m) =>
        (m[2] ?? "").split(/\s+/),
      );
      const literal = tokens.filter(
        (t) => !t.startsWith("[&") && LITERAL.test(t) && !(DRAWN[name] ?? []).includes(t),
      );
      expect(literal).toEqual([]);
    },
  );

  it.each(files.map((f) => [f.name, f.source] as const))(
    "%s carries no red and no destructive variant",
    (_, source) => {
      expect(source).not.toMatch(/destructive|\bred-\d|color-error|--danger/);
    },
  );

  it.each(files.map((f) => [f.name, f.source] as const))(
    "%s takes cn from ../lib/utils.ts",
    (_, source) => {
      if (!/\bcn\(/.test(source)) return;
      expect(source).toMatch(/import \{ cn \} from "\.\.\/lib\/utils\.ts"/);
    },
  );
});
