/**
 * The System page's Lesson frame group (dl-uukj.29.46): the frame every step sits in, from the
 * lesson-frame README's rules and measurements and paper-behaviour's event tables (decision
 * dl-j2lo), each section drawn from live parts. A frozen state is the very StepShell a lesson
 * renders. No lesson plays here: the steps to play through live in the playground's question types.
 */

import { DotArray, PictureView, RichText } from "@jadwigo/lesson-kit";
import { cn } from "@jadwigo/ui";
import { Sub } from "../Foundations.tsx";
import { BAND_STATES, Shell } from "../Gallery.tsx";
import { useSystemLanguage } from "../lang.ts";
import {
  EVENTS,
  type EventRow,
  FRAME_KINDS,
  FRAME_RULES,
  MEASURES,
  PHASES,
  TRANSITIONS,
  UNDER_EVERYTHING,
} from "./data.ts";

const CARD = "rounded-2xl border-2 border-border bg-card";

/** One event table: a table on a laptop, one card per event on a phone. */
function EventTable({ title, rows }: { title: string; rows: readonly EventRow[] }): JSX.Element {
  return (
    <div className={CARD} data-system-events={title}>
      <h4 className="border-b-2 border-border p-3 text-lg">{title}</h4>
      <dl>
        {rows.map((r) => (
          <div
            key={r.event}
            className="grid gap-1 border-b border-border p-3 last:border-0 md:grid-cols-[14rem_1fr] md:gap-4"
          >
            <dt className="font-bold">{r.event}</dt>
            <dd>{r.what}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function FrameRules(): JSX.Element {
  return (
    <>
      <Sub
        title="Five rules under everything"
        lead="From the behaviour handoff (paper-behaviour/README.md §3.1). Every event table below keeps them."
      >
        <ol className={cn(CARD, "flex list-decimal flex-col gap-2 p-5 pl-10")}>
          {UNDER_EVERYTHING.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </Sub>
      <Sub
        title="The 18 rules"
        lead="The lesson frame’s decisions (lesson-frame/README.md §1). Rules 3 and 4 read as the behaviour handoff amends them. Each links to where it can be tried on this page."
      >
        <ol className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
          {FRAME_RULES.map((r, i) => (
            <li
              key={r.title}
              className={cn(CARD, "flex flex-col gap-2 p-4")}
              data-frame-rule={i + 1}
            >
              <span className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="text-lg font-bold">{r.title}</span>
                {r.amended && <span className="text-sm text-muted-foreground">amended</span>}
              </span>
              <span>{r.body}</span>
              <a
                href={`#${r.see}`}
                className="mt-auto self-start text-sm underline underline-offset-4"
              >
                Try it
              </a>
            </li>
          ))}
        </ol>
      </Sub>
    </>
  );
}

export function Frames(): JSX.Element {
  return (
    <>
      <Sub
        title="The five frames"
        lead="A step picks its frame from the window’s shape and the input, not width alone (components/parts/frame.ts). Under 600 px it is the phone. With a real keyboard and pointer it is the laptop. On touch, a window on its side under 500 tall is the phone sideways, a taller one the tablet sideways, and an upright one the tablet."
      >
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,14rem),1fr))]">
          {FRAME_KINDS.map((f) => (
            <li
              key={f.id}
              className={cn(CARD, "flex flex-col gap-1 p-4", !f.built && "border-dashed")}
              data-frame-kind={f.id}
              data-built={f.built}
            >
              <span className="text-lg font-bold">{f.label}</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {f.width} × {f.height}
              </span>
              <span>{f.when}</span>
              <span className="text-sm text-muted-foreground">
                {f.built ? (f.touch ? "Drawn on touch" : "Drawn") : "Not built yet"}
              </span>
            </li>
          ))}
        </ul>
      </Sub>
      <Sub
        title="Measurements"
        lead="CSS px at 1×, from the frame’s handoff (lesson-frame/README.md §2)."
      >
        <div className={cn(CARD, "overflow-x-auto")}>
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="p-3" />
                {FRAME_KINDS.map((f) => (
                  <th key={f.id} scope="col" className="p-3">
                    {f.label}
                    <span className="block font-normal text-muted-foreground tabular-nums">
                      {f.width} × {f.height}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEASURES.map((m) => (
                <tr key={m.thing} className="border-b border-border last:border-0">
                  <th scope="row" className="p-3">
                    {m.thing}
                  </th>
                  {FRAME_KINDS.map((f) => (
                    <td key={f.id} className="p-3 align-top">
                      {m.cells[f.id]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sub>
    </>
  );
}

export function FooterAndBand(): JSX.Element {
  return (
    <Sub
      title="Every state, phone and laptop"
      lead="The 96 px footer and the band it becomes, frozen in the step frame a lesson uses. Each column names its frame (data-frame-preview), so a phone’s and a laptop’s footer sit side by side in one window. On a narrow screen the laptop column scrolls sideways."
    >
      <div className="flex flex-col gap-6">
        {BAND_STATES.map((s) => (
          <figure key={s.id} className="flex min-w-0 flex-col gap-2" data-system-footer={s.id}>
            <figcaption className="text-sm text-muted-foreground">{s.title}</figcaption>
            <div className="flex flex-wrap items-start gap-4">
              <div
                className="kid-step w-[24.375rem] max-w-full shrink-0 rounded-2xl border-2 border-border bg-background p-4"
                data-frame-cell="phone"
                data-frame-preview="phone"
              >
                <Shell state={s.id} />
              </div>
              {/* The laptop's column keeps its width, as the laptop's 720 px column. */}
              <div className="max-w-full overflow-x-auto pb-2">
                <div
                  className="kid-step w-[48rem] rounded-2xl border-2 border-border bg-background p-4"
                  data-frame-cell="laptop"
                  data-frame-preview="laptop"
                >
                  <Shell state={s.id} />
                </div>
              </div>
            </div>
          </figure>
        ))}
      </div>
    </Sub>
  );
}

export function StepLife(): JSX.Element {
  return (
    <>
      <Sub
        title="Phases"
        lead="A step is in one phase at a time (paper-behaviour/README.md §4), and these events move it on (lesson-frame/README.md §5)."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <dl className={CARD}>
            {PHASES.map((p) => (
              <div
                key={p.id}
                className="grid gap-1 border-b border-border p-3 last:border-0 md:grid-cols-[7rem_1fr]"
              >
                <dt className="font-bold">{p.id}</dt>
                <dd>{p.what}</dd>
              </div>
            ))}
          </dl>
          <ol className={CARD}>
            {TRANSITIONS.map((t) => (
              <li
                key={t.event}
                className="flex flex-col gap-1 border-b border-border p-3 last:border-0"
                data-transition={t.from}
              >
                <span className="text-sm text-muted-foreground">
                  {t.from} → {t.to}
                </span>
                <span>{t.event}</span>
              </li>
            ))}
          </ol>
        </div>
      </Sub>
      <EventTable {...EVENTS.end} />
    </>
  );
}

export function HelpNoteBehaviour(): JSX.Element {
  return (
    <>
      <p className="text-muted-foreground">
        The note itself, live, is under{" "}
        <a href="#help" className="underline underline-offset-4">
          Help ladder
        </a>
        . Here is what happens around it.
      </p>
      <EventTable {...EVENTS.help} />
    </>
  );
}

export function TrayAndTools(): JSX.Element {
  return (
    <>
      <EventTable {...EVENTS.options} />
      <EventTable {...EVENTS.fields} />
      <EventTable {...EVENTS.missed} />
    </>
  );
}

export function Scrolling(): JSX.Element {
  return <EventTable {...EVENTS.scroll} />;
}

/** A picture of dots, standing in for a question picture. */
function Dots(): JSX.Element {
  return <DotArray rows={3} cols={4} label="3 × 4" className="grid max-w-full gap-2 p-3" />;
}

export function Media(): JSX.Element {
  const LANG = useSystemLanguage();
  return (
    <>
      <p className="text-muted-foreground">
        The sound buttons, playing included, are under{" "}
        <a href="#sub-actions" className="underline underline-offset-4">
          Actions
        </a>
        .
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Sub
          title="The picture sheet"
          lead="A tap opens the picture full screen in the page’s own colour, with no dimming. Esc, a tap or the close returns, the focus back on the picture."
        >
          <div className={cn(CARD, "flex flex-wrap items-end gap-6 p-5")}>
            <figure className="flex flex-col gap-2">
              <PictureView language={LANG} alt="3 × 4">
                <Dots />
              </PictureView>
              <figcaption className="text-sm text-muted-foreground">On the card</figcaption>
            </figure>
            <figure className="flex flex-col gap-2">
              <PictureView language={LANG} alt="3 × 4" thumb>
                <Dots />
              </PictureView>
              <figcaption className="text-sm text-muted-foreground">
                A thumbnail beside sound
              </figcaption>
            </figure>
          </div>
        </Sub>
        <Sub
          title="Formulas"
          lead="× = + − are Andika text and never break across a line. KaTeX draws only fractions, powers and roots, its digits in Andika."
        >
          <div
            className={cn(CARD, "flex flex-col gap-4 p-5 text-[length:var(--jw-size-math)]")}
            data-system-formulas
          >
            <RichText inline text="$4 \times 6 = 24$" />
            <RichText inline text="$\frac{3}{4}$ i $2^{3}$ i $\sqrt{49}$" />
          </div>
        </Sub>
      </div>
    </>
  );
}

export function ProgressPauseEnd(): JSX.Element {
  return (
    <p className="text-muted-foreground">
      The step bar sits in the top bar and moves when a step ends, never on a miss, help or the
      pause. The close control pauses and never quits: the sheet has Dźwięk, Wróć do lekcji and
      Zakończ na dziś. After the last step, Dalej opens the end screen, which asks what next.
    </p>
  );
}

// For the menu and the test: every section of the group, its anchor, its title and its lead.
export const FRAME_SECTIONS = [
  {
    id: "frame-rules",
    label: "Rules",
    title: "The frame’s rules",
    lead: "What every step keeps, whatever the question.",
  },
  {
    id: "frame-frames",
    label: "Frames",
    title: "Frames",
    lead: "Five frames by input and shape, and their measurements.",
  },
  {
    id: "frame-footer",
    label: "Footer and band",
    title: "Footer and band",
    lead: "One footer, one place, every state.",
  },
  {
    id: "frame-life",
    label: "A step’s life",
    title: "A step’s life",
    lead: "Its phases, and how it ends.",
  },
  {
    id: "frame-help",
    label: "Help note",
    title: "Help note",
    lead: "What asking for help does to focus and scroll.",
  },
  {
    id: "frame-tray",
    label: "Answer tray and tools",
    title: "Answer tray and tools",
    lead: "Options, fields, keys, the tray and the sign keys.",
  },
  {
    id: "frame-scroll",
    label: "Scrolling",
    title: "Scrolling",
    lead: "The least scroll that shows the result, and only after the child’s own action.",
  },
  { id: "frame-media", label: "Media", title: "Media", lead: "Sound, pictures and formulas." },
  {
    id: "frame-progress",
    label: "Progress, pause, end",
    title: "Progress, pause and lesson end",
    lead: "The step bar, the pause sheet and the lesson end.",
  },
] as const;

export type FrameSectionId = (typeof FRAME_SECTIONS)[number]["id"];

/** The body of each section, by its anchor. */
export function FrameSection({ id }: { id: FrameSectionId }): JSX.Element {
  switch (id) {
    case "frame-rules":
      return <FrameRules />;
    case "frame-frames":
      return <Frames />;
    case "frame-footer":
      return <FooterAndBand />;
    case "frame-life":
      return <StepLife />;
    case "frame-help":
      return <HelpNoteBehaviour />;
    case "frame-tray":
      return <TrayAndTools />;
    case "frame-scroll":
      return <Scrolling />;
    case "frame-media":
      return <Media />;
    case "frame-progress":
      return <ProgressPauseEnd />;
  }
}
