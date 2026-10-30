// @vitest-environment happy-dom
// The register (dl-uukj.32.17): every part that reads it, drawn on an app page (Page width="prose")
// and on the learner's page (Page width="kid"). The app page reads the adult scale and the page's
// focus outline; the learner's page keeps exactly the classes it had before, since the child's home,
// results and review stand on it. happy-dom loads no stylesheet, so the class names are the contract.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Minus } from "lucide-react";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Field } from "../parts/field.tsx";
import { Heading } from "../parts/heading.tsx";
import { Label } from "../parts/label.tsx";
import { Link } from "../parts/link.tsx";
import { Notice } from "../parts/notice.tsx";
import { OutcomeTile } from "../parts/outcome-tile.tsx";
import { Page } from "../parts/page.tsx";
import { Button } from "../primitives/button.tsx";
import { Card } from "../primitives/card.tsx";
import { Input } from "../primitives/input.tsx";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../primitives/sheet.tsx";
import { RegisterProvider, useRegister } from "./register.tsx";

afterEach(cleanup);

type Width = "prose" | "kid";

function on(width: Width, ui: ReactNode): void {
  render(<Page width={width}>{ui}</Page>);
}

function expectClasses(el: Element, present: readonly string[], absent: readonly string[]): void {
  for (const c of present) expect(el.classList.contains(c), `has ${c}`).toBe(true);
  for (const c of absent) expect(el.classList.contains(c), `lacks ${c}`).toBe(false);
}

const PAGE_OUTLINE = [
  "focus-visible:outline-3",
  "focus-visible:outline-offset-3",
  "focus-visible:outline-jw-focus",
];
const SOFT_RING = [
  "outline-none",
  "not-in-data-[lesson-theme=zeszyt]:focus-visible:ring-4",
  "focus-visible:ring-ring/50",
];

function Probe(): ReactElement {
  return <output>{useRegister()}</output>;
}

describe("the register", () => {
  it("is the lesson outside any Page, and what a provider says inside one", () => {
    render(
      <>
        <Probe />
        <RegisterProvider value="app">
          <Probe />
        </RegisterProvider>
      </>,
    );
    expect(screen.getAllByRole("status").map((o) => o.textContent)).toEqual(["lesson", "app"]);
  });

  it("is the app on a prose page and the lesson on a kid page, a kid page inside one included", () => {
    render(
      <Page width="prose" aria-label="Rodzic">
        <Probe />
        <Page width="kid" aria-label="Uczeń">
          <Probe />
        </Page>
      </Page>,
    );
    const [app, lesson] = screen.getAllByRole("status");
    expect(app?.textContent).toBe("app");
    expect(lesson?.textContent).toBe("lesson");
  });

  it("follows a sheet through its portal, so the parent's question sheet stays on the app page", () => {
    on(
      "prose",
      <Sheet>
        <SheetTrigger>Pytanie 3</SheetTrigger>
        <SheetContent side="bottom">
          <SheetTitle>Pytanie 3</SheetTitle>
          <Heading level={2}>Odpowiedzi</Heading>
        </SheetContent>
      </Sheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pytanie 3" }));
    const dialog = screen.getByRole("dialog", { name: "Pytanie 3" });
    expect(dialog.closest("main"), "drawn outside the page's DOM").toBeNull();
    const heading = screen.getByRole("heading", { level: 2, name: "Odpowiedzi" });
    expectClasses(heading, ["text-jw-page-h2"], ["text-jw-instruction"]);
  });
});

describe("Heading", () => {
  it.each([
    [1, "text-jw-page-h1"],
    [2, "text-jw-page-h2"],
    [3, "text-jw-page-body"],
  ] as const)("level %i on an app page reads %s at leading-tight", (level, size) => {
    on("prose", <Heading level={level}>Twoje dzieci</Heading>);
    const heading = screen.getByRole("heading", { level, name: "Twoje dzieci" });
    expectClasses(
      heading,
      [size, "leading-tight", "font-bold"],
      ["text-jw-prompt", "text-jw-instruction", "text-jw-body"],
    );
  });

  it.each([
    [1, ["text-jw-prompt", "leading-tight"]],
    [2, ["text-jw-instruction", "leading-snug"]],
    [3, ["text-jw-body"]],
  ] as const)("level %i on the learner's page keeps %s", (level, today) => {
    on("kid", <Heading level={level}>Brawo</Heading>);
    const heading = screen.getByRole("heading", { level, name: "Brawo" });
    expectClasses(
      heading,
      [...today, "font-bold"],
      ["text-jw-page-h1", "text-jw-page-h2", "text-jw-page-body"],
    );
  });
});

// Each of these reads the page body on an app page and the body on the learner's page.
const BODY_PARTS: ReadonlyArray<readonly [string, () => ReactNode, () => HTMLElement]> = [
  [
    "Label",
    () => (
      <>
        <Label htmlFor="email">E-mail</Label>
        <input id="email" />
      </>
    ),
    () => screen.getByText("E-mail"),
  ],
  [
    "Field's problem line",
    () => (
      <Field label="Kod" problem="Za krótki.">
        <Input kind="text" />
      </Field>
    ),
    () => screen.getByRole("alert"),
  ],
  ["Notice", () => <Notice>Wysłaliśmy kod.</Notice>, () => screen.getByRole("status")],
  [
    "Link at size body",
    () => <Link href="/parent">Wróć</Link>,
    () => screen.getByRole("link", { name: "Wróć" }),
  ],
  [
    "Card compact",
    () => (
      <Card size="compact" aria-label="Lekcja">
        Dodawanie
      </Card>
    ),
    () => screen.getByLabelText("Lekcja"),
  ],
  [
    "Input kind text",
    () => <Input kind="text" aria-label="E-mail" />,
    () => screen.getByRole("textbox", { name: "E-mail" }),
  ],
];

describe.each(BODY_PARTS)("%s", (_name, ui, find) => {
  it("reads the page body on an app page", () => {
    on("prose", ui());
    expectClasses(find(), ["text-jw-page-body"], ["text-jw-body"]);
  });

  it("keeps the body on the learner's page", () => {
    on("kid", ui());
    expectClasses(find(), ["text-jw-body"], ["text-jw-page-body"]);
  });
});

describe("Field's label", () => {
  it.each([
    ["prose", "text-jw-page-body", "text-jw-body"],
    ["kid", "text-jw-body", "text-jw-page-body"],
  ] as const)("on a %s page reads %s", (width, size, other) => {
    on(
      width,
      <Field label="Kod">
        <Input kind="text" />
      </Field>,
    );
    expectClasses(screen.getByText("Kod"), [size, "font-bold"], [other]);
  });
});

describe("Link at size small", () => {
  it.each(["prose", "kid"] as const)("stays small on a %s page", (width) => {
    on(width, <Link size="small">Wyloguj</Link>);
    expectClasses(screen.getByText("Wyloguj"), ["text-jw-small"], ["text-jw-page-body"]);
  });
});

describe("Input focus", () => {
  it("as kind text on an app page has no ring: its edge turning the focus ink is the focus", () => {
    on("prose", <Input kind="text" aria-label="E-mail" />);
    expectClasses(
      screen.getByRole("textbox", { name: "E-mail" }),
      ["focus-visible:border-jw-focus"],
      ["focus-visible:ring-4", "focus-visible:ring-ring/50"],
    );
  });

  it("as kind text on the learner's page keeps the ring", () => {
    on("kid", <Input kind="text" aria-label="E-mail" />);
    expectClasses(
      screen.getByRole("textbox", { name: "E-mail" }),
      ["focus-visible:border-jw-focus", "focus-visible:ring-4", "focus-visible:ring-ring/50"],
      [],
    );
  });

  it.each(["prose", "kid"] as const)("as a number keeps the ring on a %s page", (width) => {
    on(width, <Input inputMode="numeric" aria-label="Wynik" />);
    expectClasses(
      screen.getByRole("textbox", { name: "Wynik" }),
      ["focus-visible:ring-4", "focus-visible:ring-ring/50", "text-kid-answer"],
      ["text-jw-page-body"],
    );
  });
});

describe("Button", () => {
  it("outside a lesson focuses with the page's outline, not the soft ring", () => {
    on("prose", <Button>Wyślij kod</Button>);
    expectClasses(screen.getByRole("button", { name: "Wyślij kod" }), PAGE_OUTLINE, SOFT_RING);
  });

  it("keeps the action, its edge and its press on an app page", () => {
    on("prose", <Button>Wyślij kod</Button>);
    expectClasses(
      screen.getByRole("button", { name: "Wyślij kod" }),
      ["bg-jw-act", "text-jw-on-act", "shadow-jw-act", "active:translate-y-px"],
      [],
    );
  });

  it("hands the page's outline to a link with asChild", () => {
    on(
      "prose",
      <Button asChild variant="outline" size="control">
        <a href="/parent/children/new">Dodaj dziecko</a>
      </Button>,
    );
    expectClasses(screen.getByRole("link", { name: "Dodaj dziecko" }), PAGE_OUTLINE, SOFT_RING);
  });

  it("at size control on an app page is the page body, bold, 24 px in", () => {
    on("prose", <Button size="control">Zapisz</Button>);
    expectClasses(
      screen.getByRole("button", { name: "Zapisz" }),
      ["min-h-jw-control", "text-jw-page-body", "font-bold", "px-6"],
      ["text-jw-body", "px-5", "font-semibold"],
    );
  });

  it("as outline on an app page is paper on Zeszyt's line in the ink", () => {
    on("prose", <Button variant="outline">Wyloguj się</Button>);
    expectClasses(
      screen.getByRole("button", { name: "Wyloguj się" }),
      ["bg-jw-card", "border-jw-line", "text-jw-ink"],
      ["bg-background", "border-border", "text-foreground"],
    );
  });

  it("on the learner's page keeps the soft ring and no outline", () => {
    on("kid", <Button>Dalej</Button>);
    expectClasses(screen.getByRole("button", { name: "Dalej" }), SOFT_RING, PAGE_OUTLINE);
  });

  it("on the learner's page keeps today's control and outline", () => {
    on(
      "kid",
      <>
        <Button size="control">Zapisz</Button>
        <Button variant="outline">Wróć</Button>
      </>,
    );
    expectClasses(
      screen.getByRole("button", { name: "Zapisz" }),
      ["text-jw-body", "px-5"],
      ["text-jw-page-body", "px-6"],
    );
    expectClasses(
      screen.getByRole("button", { name: "Wróć" }),
      ["bg-background", "border-border", "text-foreground"],
      ["bg-jw-card", "border-jw-line", "text-jw-ink"],
    );
  });

  it("draws the same on the learner's page as outside any Page", () => {
    render(<Button variant="outline">Poza</Button>);
    const outside = screen.getByRole("button", { name: "Poza" }).className;
    cleanup();
    on("kid", <Button variant="outline">Poza</Button>);
    expect(screen.getByRole("button", { name: "Poza" }).className).toBe(outside);
  });
});

describe("OutcomeTile", () => {
  // The app's NavLink, which brings the href and nothing else; the tile gives it its name.
  function RouterLink(props: ComponentProps<"a">): ReactElement {
    return <a data-router {...props} />;
  }

  function Tile({ asChild }: { asChild: boolean }): ReactElement {
    return asChild ? (
      <OutcomeTile asChild tone="miss" icon={<Minus aria-hidden="true" />} label="Pytanie 2">
        <RouterLink href="/parent/attempts/1#q2" />
      </OutcomeTile>
    ) : (
      <OutcomeTile tone="miss" icon={<Minus aria-hidden="true" />} label="Pytanie 2" />
    );
  }

  it("as a link on an app page focuses with the page's outline", () => {
    on("prose", <Tile asChild />);
    expectClasses(screen.getByRole("link", { name: "Pytanie 2" }), PAGE_OUTLINE, []);
  });

  it("as a link on the learner's page draws no outline of its own", () => {
    on("kid", <Tile asChild />);
    expectClasses(screen.getByRole("link", { name: "Pytanie 2" }), [], PAGE_OUTLINE);
  });

  it("as an image takes no focus on an app page", () => {
    on("prose", <Tile asChild={false} />);
    expectClasses(screen.getByRole("img", { name: "Pytanie 2" }), [], PAGE_OUTLINE);
  });
});
