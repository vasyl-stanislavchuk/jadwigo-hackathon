/**
 * The System page (dl-uukj.29.30): /playground/system shows the whole Jadwigo design system, Zeszyt,
 * as the owner reviewed it in Claude Design (docs/plan/design-system/claude-design/), in the
 * components lessons actually use. Every swatch, specimen and part reads the real tokens of
 * styles/foundation.css and styles/stage.css: a value changed there shows here at once, and a part
 * changed in code shows here as in a lesson.
 *
 * Two scopes (dl-uukj.32.12). The page's [theme] root declares Zeszyt's aliases over the
 * playground's neutral chrome. The lesson's scope, [data-lesson-theme='zeszyt'], wraps every
 * section but App pages, as `display: contents`: its rules and type reach the parts, while
 * lesson.css's ground padding and corners, which are for a lesson's card, draw no box here. App
 * pages sits outside it, as a parent's page does.
 *
 * Sections: the foundations (metaphor, colour, font, space and shape, motion), the components in
 * every state, tiles and still answers, the lesson frame (its rules, frames, footer and band, a
 * step's life, help, the tray and tools, scrolling, media, progress, pause and the end:
 * system/frame/, dl-uukj.29.46), the lesson screen (its zones and six states, drawn from a written
 * example), app pages, the interface words, the rules and the gaps for the owner. Nothing on it
 * plays or links a lesson.
 */

import { type CopyKey, copy, type Language, TABLES } from "@jadwigo/copy";
import { Tooltip } from "@jadwigo/lesson-kit";
import {
  Button,
  cn,
  type MenuEntry,
  type MenuItem,
  SegmentedControl,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SideMenu,
  Switch,
} from "@jadwigo/ui";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useContext, useEffect, useState } from "react";
import { AppPages } from "./AppPages.tsx";
import { DESIGN_LINES, METAPHOR, ZONES } from "./data.ts";
import { Colour, Motion, SpaceAndShape, Sub, subId, Type } from "./Foundations.tsx";
import { FRAME_SECTIONS, FrameSection } from "./frame/sections.tsx";
import { Actions, Bands, Fields, Help, Icons, KeyboardFocus, Options, Tiles } from "./Gallery.tsx";
import { SystemLanguage } from "./lang.ts";
import { OwnerGaps, TilesAndStillAnswers } from "./Outcomes.tsx";
import { Settings } from "./SettingsDemo.tsx";

type Mode = "light" | "dark";
/** The page's sections in the menu's groups. Names are plain names, as the export groups them. */
/** A page of the menu: its label and the anchor it jumps to. */
const page = (label: string, anchor: string): MenuItem => ({
  id: anchor,
  label,
  href: `#${anchor}`,
});
/** A category's first page jumps to the section, so its lead is read before its first part. */
const sub = (label: string, section?: string): MenuItem => page(label, section ?? subId(label));

/** The menu as the export's SideMenu draws it: section headings, categories that fold, pages. */
export const MENU: readonly MenuEntry[] = [
  { heading: "Foundations" },
  page("Metaphor", "metaphor"),
  {
    id: "colour-group",
    label: "Colour",
    items: [page("Rules", "principles"), page("Roles", "colour")],
  },
  page("Font", "font"),
  {
    id: "shape-group",
    label: "Space and shape",
    items: [sub("Spacing", "shape"), sub("Shape"), sub("Tap targets")],
  },
  page("Motion", "motion"),
  { heading: "Components" },
  sub("Actions", "components"),
  sub("Keyboard focus"),
  sub("Options"),
  sub("Typed answers"),
  sub("Tiles"),
  sub("Icons"),
  page("Help ladder", "help"),
  page("Tiles and still answers", "still-answers"),
  {
    id: "settings-group",
    label: "Settings controls",
    items: [
      sub("Radio group", "settings"),
      sub("Switch"),
      sub("Segmented control"),
      sub("Tabs"),
      sub("Side menu"),
    ],
  },
  { heading: "Lesson frame" },
  ...FRAME_SECTIONS.map((f) => page(f.label, f.id)),
  { heading: "Screens" },
  {
    id: "stage-group",
    label: "Lesson screen",
    items: [sub("Six zones", "stage"), page("Six states", subId("The stage in six states"))],
  },
  page("App pages", "app-pages"),
  { heading: "Words" },
  page("Interface words", "lines"),
  {
    id: "rules-group",
    label: "Rules",
    items: [
      page("The rules", "rules"),
      page("Where we differ", subId("Where we differ from the export")),
    ],
  },
  { heading: "For the owner" },
  page("Gaps for the owner", "gaps"),
];

/** Every page's anchor, in the order they sit on the page. */
export const PAGE_IDS = MENU.flatMap((e) =>
  "heading" in e ? [] : (e.items ?? [e]).map((p) => p.id),
);

/** The page being read: the last one whose top has passed the upper third of the window. */
function useActiveSection(): string {
  const [active, setActive] = useState<string>(PAGE_IDS[0] ?? "");
  useEffect(() => {
    const pick = () => {
      const line = window.innerHeight / 3;
      let current = PAGE_IDS[0] ?? "";
      for (const id of PAGE_IDS) {
        const el = document.getElementById(id);
        if (el !== null && el.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom the last page is the one being read, however short it is.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
        current = PAGE_IDS.at(-1) ?? current;
      setActive(current);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, []);
  return active;
}

/** The menu: the export's SideMenu, the page being read wearing the pick and its category open. */
function SectionMenu({
  active,
  onPick,
}: {
  active: string;
  onPick?: (() => void) | undefined;
}): JSX.Element {
  return <SideMenu label="Sections" framed={false} current={active} onPick={onPick} items={MENU} />;
}

const LANGUAGES = [
  { value: "pl", label: "PL" },
  { value: "en", label: "EN" },
] as const;

/** The lesson's scope, drawing no box of its own: its rules, type and aliases reach what is inside,
 * and lesson.css's ground padding and corners, a lesson card's, have nothing to draw on. */
function LessonScope({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div data-lesson-theme="zeszyt" className="contents">
      {children}
    </div>
  );
}

/** `app` keeps the section's parts out of the lesson's scope, as a parent's page is; its title
 * still reads like every other section's. */
function Section({
  id,
  title,
  lead,
  app = false,
  children,
}: {
  id: string;
  title: string;
  lead: string;
  app?: boolean;
  children: ReactNode;
}): JSX.Element {
  const head = (
    <div className="flex flex-col gap-2">
      <h2 id={`${id}-title`} className="text-3xl">
        {title}
      </h2>
      <p className="text-lg text-muted-foreground">{lead}</p>
    </div>
  );
  return (
    <section
      id={id}
      className="flex scroll-mt-6 flex-col gap-6 border-t-2 border-border pt-8"
      aria-labelledby={`${id}-title`}
    >
      {app ? <LessonScope>{head}</LessonScope> : head}
      {children}
    </section>
  );
}

function Anatomy(): JSX.Element {
  return (
    <Sub
      title="Six zones"
      lead="One centred column of 720 px at 1280 (16 px margins on a phone). Zones 2 to 6 and the footer’s action keep to its edges."
    >
      <ol className="grid gap-3 md:grid-cols-3">
        {ZONES.map((z, i) => (
          <li key={z.title} className="flex gap-3 rounded-2xl border-2 border-border bg-card p-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-jw-pick-edge text-sm text-jw-card">
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-lg">{z.title}</span>
              <span className="text-sm">{z.what}</span>
              <span className="text-xs text-muted-foreground">{z.size}</span>
            </div>
          </li>
        ))}
      </ol>
    </Sub>
  );
}

/** Whether a parent has read a line: every entry of it marked reviewed. */
/** The export's fixed action words (claude-design/readme.md), then its newer lines. */
const WORDS = [
  "check",
  "continue",
  "help_me",
  "dont_know_yet",
  "help_more",
  ...DESIGN_LINES,
] as const satisfies readonly CopyKey[];

const COLUMNS = [
  ["pl", "Polish"],
  ["en", "English"],
] as const;

function reviewed(key: CopyKey): boolean {
  const entry = TABLES.pl[key];
  return (Array.isArray(entry) ? entry : [entry]).every((e) => e?.reviewed === true);
}

/** Every interface word in both languages: a table on a laptop, one card per word on a phone. */
function Lines(): JSX.Element {
  const language = useContext(SystemLanguage);
  return (
    <div className="rounded-2xl border-2 border-border bg-card">
      <div className="hidden grid-cols-[1fr_1fr_8rem] gap-4 border-b-2 border-border p-3 text-sm text-muted-foreground md:grid">
        {COLUMNS.map(([code, name]) => (
          <span key={code} className={code === language ? "font-bold text-foreground" : undefined}>
            {name}
          </span>
        ))}
        <span>Read by a parent</span>
      </div>
      <ul>
        {WORDS.map((key) => (
          <li
            key={key}
            className="grid gap-1 border-b border-border p-3 last:border-0 md:grid-cols-[1fr_1fr_8rem] md:gap-4"
            data-line={key}
          >
            {COLUMNS.map(([code, name]) => (
              <span key={code} className={code === language ? "font-bold" : undefined}>
                <span className="text-sm text-muted-foreground md:hidden">{name}: </span>
                {copy(code, key)}
              </span>
            ))}
            <span className="text-sm text-muted-foreground">
              <span className="md:hidden">Read by a parent: </span>
              {reviewed(key) ? "yes" : "not yet"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const RULES = [
  "A miss stays on the step. The answer stays, the parts to look at again are marked in red, and help offers a smaller step.",
  "Red means a miss and nothing else; green means right. The main action is neither.",
  "The solution shows only once the step ends, beside the child’s own answer.",
  "No score, points, hearts, streak, clock, countdown or loss framing. The one progress bar is the lesson’s step bar, which moves only when a step ends (dl-5jwu).",
  "Every text pair reaches 4.5:1, by day and by night.",
  "Tap targets of 56 px or more, with room between them.",
  "Andika carries every Polish letter, capitals too.",
  "Voice is additive: everything plays by tap and by keyboard. Enter checks, and Enter continues.",
  "Nothing moves under a finger: a pick changes colour, never size or weight.",
];

const CHANGES = [
  "In a lesson, tap targets stay at 56 px; the export says 48 to 52. The letter row draws the export’s tiles 6 px apart inside 56 px keys. Settings controls take the export’s own 48 px and 44 px.",
  "A missed part keeps a dashed edge (docs/17 §2f rule 4), as the lesson frame now draws it too.",
  "On a phone the prompt stays at 28 px and the instruction at 20; the lesson frame draws 26 and 19.",
  "The help counter reads “n z m”, m being the hints the step really has; the frame’s “3” was its sample.",
  "Lessons keep today’s reviewed lines; the export’s lines wait for a parent (Interface words).",
  "A field’s placeholder stays at our 4.5:1 tone, not the export’s 3.0:1.",
  "At night the solution’s band keeps its own tone, a step lighter than the flat page, so it still stands apart.",
  "No button or option draws a keyboard focus (owner, 2026-10-26), where the export draws a 2 px frame 7 px inside. Links keep the 3 px ink outline, 3 px out.",
  "Help’s “look here” ring is help’s yellow; the export has no such mark.",
  "The settings controls (radio group, switch, segmented control, tabs, side menu) live in @jadwigo/ui, for app pages and settings, never inside a lesson.",
];

/** Whether the sidebar is open, remembered in this browser only. */
function useSidebar(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem("system-sidebar") !== "closed";
    } catch {
      return true;
    }
  });
  const set = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem("system-sidebar", next ? "open" : "closed");
    } catch {
      // A private window keeps no storage: the choice lasts this visit.
    }
  };
  return [open, set];
}

/** A jump to a section glides, unless the reader asked for less motion, and lands below the
 * sticky header. Set on the document while this page is open, and put back after. */
function useSmoothJumps(): void {
  useEffect(() => {
    const root = document.documentElement.style;
    const before = { behavior: root.scrollBehavior, padding: root.scrollPaddingTop };
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      root.scrollBehavior = "smooth";
    root.scrollPaddingTop = "4.5rem";
    return () => {
      root.scrollBehavior = before.behavior;
      root.scrollPaddingTop = before.padding;
    };
  }, []);
}

export function SystemPage(): JSX.Element {
  const [mode, setMode] = useState<Mode>(() =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  const [language, setLanguage] = useState<Language>("pl");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebar, setSidebar] = useSidebar();
  const active = useActiveSection();
  useSmoothJumps();
  return (
    <SystemLanguage.Provider value={language}>
      {/* [theme] declares Zeszyt's aliases over the neutral chrome. This page is not a lesson, so the
          lesson's scope draws no box (LessonScope): the header sits flush at the top and its line
          runs edge to edge. */}
      <div
        {...{ theme: mode }}
        lang={language}
        className="min-h-svh bg-background text-foreground [--system-bar:4.125rem]"
        data-system-page
      >
        <LessonScope>
          {/* --system-bar: the header's height, 64 px and its 2 px line, which the sidebar sits under. */}
          <div className="sticky top-0 z-30 border-b-2 border-border bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-384 items-center gap-3 px-4 sm:px-8">
              <Button
                variant="outline"
                className="min-h-11 px-3 text-base lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
              >
                <Menu aria-hidden />
                <span className="sr-only sm:not-sr-only">Sections</span>
              </Button>
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent
                  side="left"
                  closeLabel="Close"
                  data-lesson-theme="zeszyt"
                  className="overflow-y-auto bg-background p-4"
                >
                  <SheetTitle className="px-3">Sections</SheetTitle>
                  <SheetDescription className="sr-only">
                    Jump to a section of the design system.
                  </SheetDescription>
                  <SectionMenu active={active} onPick={() => setMenuOpen(false)} />
                </SheetContent>
              </Sheet>
              <Tooltip
                text={sidebar ? "Hide sections" : "Show sections"}
                placement="bottom"
                align="start"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden size-11 min-h-11 min-w-11 lg:inline-flex"
                  aria-label={sidebar ? "Hide sections" : "Show sections"}
                  aria-expanded={sidebar}
                  aria-controls="system-sidebar"
                  onClick={() => setSidebar(!sidebar)}
                  data-system-sidebar-toggle
                >
                  {sidebar ? <PanelLeftClose aria-hidden /> : <PanelLeftOpen aria-hidden />}
                </Button>
              </Tooltip>
              <a
                href="/playground"
                className="hidden text-muted-foreground underline underline-offset-4 sm:inline"
              >
                Playground
              </a>
              <span className="ml-auto" />
              <SegmentedControl
                label="Language"
                hideLabel
                size="sm"
                options={LANGUAGES}
                value={language}
                onChange={(v) => setLanguage(v as Language)}
              />
              <div data-system-mode={mode}>
                <Switch
                  size="sm"
                  checked={mode === "dark"}
                  onCheckedChange={(on) => setMode(on ? "dark" : "light")}
                >
                  <span className="hidden sm:inline">Dark</span>
                  <span className="sr-only sm:hidden">Dark</span>
                </Switch>
              </div>
            </div>
          </div>
        </LessonScope>
        <div className="mx-auto flex max-w-384">
          <LessonScope>
            {/* The notebook's margin: a full-height column under the header with a line on its right,
                sliding shut to nothing. Its inner box keeps its width, so the menu never rewraps. */}
            <aside
              id="system-sidebar"
              aria-label="Sections"
              data-open={sidebar}
              {...(sidebar ? {} : { inert: "" })}
              className={cn(
                "sticky top-[var(--system-bar)] hidden h-[calc(100svh-var(--system-bar))] shrink-0 self-start overflow-hidden transition-[width,border-color] duration-jw-step ease-jw-out lg:block",
                sidebar ? "w-64 border-r-2 border-jw-line" : "w-0 border-r-0",
              )}
            >
              <div className="h-full w-64 overflow-y-auto overscroll-contain py-6 pr-3 pl-4 [scrollbar-color:var(--jw-line)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] sm:pl-8">
                <SectionMenu active={active} />
              </div>
            </aside>
          </LessonScope>
          <main className="flex min-w-0 flex-1 flex-col gap-12 px-4 py-8 sm:px-8 lg:pl-10">
            <LessonScope>
              <header className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Jadwigo · styles/foundation.css, styles/stage.css
                </p>
                <h1 className="text-4xl">Zeszyt: the design system</h1>
                <p className="text-xl">
                  The lesson screen as a Polish school exercise book: white paper, blue ink for the
                  one thing to press, a clear blue for what the child picked, warm yellow for help,
                  green for right and red pen for a miss.
                </p>
                <p className="text-lg text-muted-foreground">
                  Everything below is drawn by the parts lessons use, from the live tokens. The
                  source is the export in docs/plan/design-system/claude-design/.
                </p>
              </header>

              <Section
                id="metaphor"
                title="Metaphor"
                lead="Every lesson looks like a page in the child’s own school notebook. Polish children write sums and dictation in a squared zeszyt every day, so the screen feels familiar and calm, not like a game or a test. If something would look out of place in a tidy notebook, it does not belong on the lesson screen."
              >
                <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,18rem),1fr))]">
                  {METAPHOR.map((m) => (
                    <li
                      key={m.thing}
                      className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-5"
                    >
                      <span className="flex items-center gap-2 text-xl">
                        {m.role && (
                          <span
                            aria-hidden
                            className="size-4 shrink-0 rounded-full border-2 border-border"
                            style={{ background: `var(--jw-${m.role})` }}
                          />
                        )}
                        {m.thing}
                      </span>
                      <span className="text-muted-foreground">{m.means}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section
                id="principles"
                title="Colour rules"
                lead="The page spends colour in four places only. Everything else is paper and ink."
              >
                <ol className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,14rem),1fr))]">
                  {[
                    [
                      "The page is paper.",
                      "The ground and every card stay quiet. Nothing on them asks for attention.",
                    ],
                    [
                      "A pick is clear blue.",
                      "A chosen option wears the pick: chosen, not yet judged.",
                    ],
                    [
                      "Blue ink means press.",
                      "Only the action that can be pressed now stands on its edge. Sprawdź rests until there is an answer.",
                    ],
                    [
                      "One band says the verdict.",
                      "After a check, one band in green or red holds the verdict and its one action.",
                    ],
                  ].map(([title, body], i) => (
                    <li
                      key={title}
                      className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-5"
                    >
                      <span className="text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="text-xl">{title}</span>
                      <span className="text-muted-foreground">{body}</span>
                    </li>
                  ))}
                </ol>
              </Section>

              <Section
                id="colour"
                title="Colour roles"
                lead="Every role is named for what it means. By day and by night side by side, each with the ink it carries and that pair’s ratio, worked out from the live tokens."
              >
                <Colour />
              </Section>

              <Section
                id="font"
                title="Font"
                lead="One face, Andika, at a child’s scale, with numbers that line up."
              >
                <Type />
              </Section>

              <Section
                id="shape"
                title="Space and shape"
                lead="A 4 px spacing step, soft corners, a 2 px line and a 4 px pressed edge."
              >
                <SpaceAndShape />
              </Section>

              <Section
                id="motion"
                title="Motion"
                lead="Calm and short. Nothing shakes, nothing counts."
              >
                <Motion />
              </Section>

              <Section
                id="components"
                title="Components"
                lead="Every part a lesson draws, in every state, from the parts themselves."
              >
                <Actions />
                <KeyboardFocus />
                <Options />
                <Fields />
                <Tiles />
                <Icons />
              </Section>

              <Section id="help" title="Help" lead="The help ladder in its three drawings, live.">
                <Help />
              </Section>

              <Section
                id="still-answers"
                title="Tiles and still answers"
                lead="The readout a task shows, the tile an app page marks an outcome with, and the parts the kit has still to export."
              >
                <TilesAndStillAnswers />
              </Section>

              <Section
                id="settings"
                title="Settings controls"
                lead="For settings and topic screens, never inside a lesson: a radio group, a switch, a segmented control, notebook tabs and a side menu. Chosen wears the pick, hover on a mouse is a quiet fill, and Tab shows the ink outline."
              >
                <Settings />
              </Section>

              {FRAME_SECTIONS.map((f) => (
                <Section key={f.id} id={f.id} title={f.title} lead={f.lead}>
                  <FrameSection id={f.id} />
                </Section>
              ))}

              <Section
                id="stage"
                title="Lesson screen"
                lead="The one frame every question type sits in."
              >
                <Anatomy />
                <Bands />
              </Section>
            </LessonScope>

            <Section
              id="app-pages"
              title="App pages"
              lead="A parent's pages, drawn by @jadwigo/ui's parts outside the lesson's scope, as the app draws them, on the adult's type scale: the home with a lesson card of small outcome tiles, then a finished lesson with Page, Heading 1 to 3, Field with a text Input, a compact Card, the action Button at the control height, a Notice, a Link and the outcome tile. Beside them, the register's values, read live."
              app
            >
              <AppPages mode={mode} />
            </Section>

            <LessonScope>
              <Section
                id="lines"
                title="Interface words"
                lead="The fixed action words and the design’s newer lines, in Polish and English. The column in bold is the page’s language. Lessons keep today’s reviewed lines until a parent reads these (dl-uukj.29.28)."
              >
                <Lines />
              </Section>

              <Section
                id="rules"
                title="Rules"
                lead="Every direction keeps these, and where we differ from the export, it says so."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Sub title="The rules">
                    <ul className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-5">
                      {RULES.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </Sub>
                  <Sub title="Where we differ from the export">
                    <ul className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-5">
                      {CHANGES.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </Sub>
                </div>
              </Section>

              <Section
                id="gaps"
                title="Gaps for the owner"
                lead="What making Zeszyt every page's look left open (dl-uukj.32.7). The owner answered all four on 2026-10-30: the app-page scale, the outcomes and the readout are built above, and one answer waits on purpose."
              >
                <OwnerGaps mode={mode} />
              </Section>
            </LessonScope>
          </main>
        </div>
      </div>
    </SystemLanguage.Provider>
  );
}
