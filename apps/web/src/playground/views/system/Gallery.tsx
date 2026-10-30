/**
 * The System page's components (dl-uukj.29.30): every part a lesson draws, in every state the design
 * system names, rendered by the very parts lessons use. Nothing here is a mock-up: a change to a
 * part or to styles/foundation.css shows here as it shows in a lesson. Each kind of part leads with
 * one you can use (pick, type, place, play the stage through), then its states side by side. The
 * interface words follow the page's language switch; the maths and the Polish words stay as written.
 */

import { copy } from "@jadwigo/copy";
import type { Clock, Feedback, Instant, Tone } from "@jadwigo/lesson-kit";
import {
  browserClock,
  ChoiceGroup,
  type ChoiceItem,
  ChoiceStatic,
  EMPTY_ENTRY,
  Entry,
  type EntryState,
  Grip,
  HelpLadder,
  LessonTheme,
  press,
  STATUS,
  Stem,
  StepFrame,
  StepShell,
  TileBank,
  Tooltip,
} from "@jadwigo/lesson-kit";
import { Button, Spinner } from "@jadwigo/ui";
import { ArrowUp, Calculator, Delete, RotateCcw, Turtle, Volume2, X } from "lucide-react";
import { type ComponentProps, type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { useExamples } from "../../examples/index.ts";
import { Sub } from "./Foundations.tsx";
import { useSystemLanguage } from "./lang.ts";
import { type StageQuestion, stageExample, stageQuestion } from "./question.ts";

const NOOP = { onPointerDown: () => {}, onClick: () => {} };

/** A clock that never moves, for the frozen states: nothing on them is timed. */
const STILL_CLOCK: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-10-18T00:00:00.000Z" }) };

/** One labelled specimen. */
function Spec({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <figure
      className={wide ? "flex min-w-0 flex-col gap-2 md:col-span-2" : "flex min-w-0 flex-col gap-2"}
    >
      <figcaption className="text-sm text-muted-foreground">{label}</figcaption>
      <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
    </figure>
  );
}

function Panel({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }): JSX.Element {
  const grid = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 xl:grid-cols-4" }[
    cols
  ];
  return (
    <div className={`grid gap-6 rounded-2xl border-2 border-border bg-background p-6 ${grid}`}>
      {children}
    </div>
  );
}

/** The part to try, set apart from its states by the pick's edge. */
function Live({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <figure
      className="flex min-w-0 flex-col gap-3 rounded-2xl border-2 border-dashed border-jw-pick-edge bg-background p-6"
      data-system-live
    >
      <figcaption className="text-sm font-bold text-jw-pick-ink">{label}</figcaption>
      {children}
    </figure>
  );
}

export function Actions(): JSX.Element {
  const LANG = useSystemLanguage();
  return (
    <Sub
      title="Actions"
      lead="One action can be pressed at a time. It rests until there is an answer, then stands on its edge. The quiet ways out read as links. Hover on a mouse darkens a line or lifts a fill, a press sinks, and Tab shows the frame (Keyboard focus, below)."
    >
      <Panel cols={3}>
        <Spec label="Main: Sprawdź, ready (press it)">
          <Button size="commit" className="text-2xl">
            {copy(LANG, "check")}
          </Button>
        </Spec>
        <Spec label="At rest, with its tooltip (mouse and keyboard only)">
          {/* Room above for the open bubble, so it never covers the caption. */}
          <span className="h-12 w-full" aria-hidden />
          <Tooltip text={copy(LANG, "ds_wait_hint")} open>
            <Button size="commit" className="text-2xl" data-check aria-disabled>
              {copy(LANG, "check")}
            </Button>
          </Tooltip>
        </Spec>
        <Spec label="Soft: a listen button, a tool beside an answer">
          <Button variant="outline" size="icon" aria-label="Posłuchaj">
            <Volume2 aria-hidden />
          </Button>
        </Spec>
        <Spec label="Link: the quiet ways out">
          <Button variant="ghost" className="kid-quiet kid-move-on">
            {copy(LANG, "dont_know_yet")}
          </Button>
        </Spec>
        <Spec label="The close control, with its tooltip">
          <Tooltip text={copy(LANG, "ds_close_tip")} open placement="bottom" align="start">
            <Button variant="ghost" size="icon" aria-label={copy(LANG, "ds_close_tip")}>
              <X aria-hidden />
            </Button>
          </Tooltip>
        </Spec>
        <Spec label="Sound: play, slow (its tooltip names it), and playing, 40 % through">
          <span className="h-12 w-full" aria-hidden />
          <Button variant="secondary" size="icon" aria-label={copy(LANG, "play_clip")}>
            <Volume2 aria-hidden />
          </Button>
          <Tooltip text={copy(LANG, "ds_slow")} open>
            <Button variant="secondary" size="icon" aria-label={copy(LANG, "ds_slow")}>
              <Turtle aria-hidden />
            </Button>
          </Tooltip>
          <Button
            variant="secondary"
            size="icon"
            aria-label={copy(LANG, "play_clip")}
            aria-pressed
            data-playing
            style={{ "--jw-play": 0.4 } as CSSProperties}
          >
            <Volume2 aria-hidden />
          </Button>
        </Spec>
        <Spec label="The help note’s two actions: more help, and the way to the solution" wide>
          <aside data-help data-help-ladder className="flex w-full flex-col gap-3 p-4">
            <Button variant="outline" data-help-more className="text-jw-body">
              <HelpIcon aria-hidden /> {copy(LANG, "help_more")}
            </Button>
            <Button variant="ghost" className="kid-quiet kid-move-on">
              {copy(LANG, "dont_know_yet")}
            </Button>
          </aside>
        </Spec>
      </Panel>
    </Sub>
  );
}

/** Keyboard focus (owner, 2026-10-26, dl-uukj.29.93): no button or option draws one. The section
 * stays so its link still lands, and says what a lesson does instead. */
export function KeyboardFocus(): JSX.Element {
  return (
    <Sub
      title="Keyboard focus"
      lead="No focus is drawn on a button, an option, a tile, a key or the sound button. Tab, the arrows and the number keys still move the focus and pick, and Enter checks and continues. The pick’s colour shows where the child is. A typed field keeps its active look: the pick’s fill inside an ink edge. Help’s “look here” ring is no focus and stays."
    >
      {null}
    </Sub>
  );
}

const item = (
  id: string,
  content: string,
  tone: Tone,
  extra: Partial<ChoiceItem> = {},
): ChoiceItem => ({ id, content, tone, ...extra });

const ANSWERS = [
  item("a", "20", "idle"),
  item("b", "24", "idle"),
  item("c", "28", "idle"),
  item("d", "46", "idle"),
];

function LiveOptions(): JSX.Element {
  const [chosen, setChosen] = useState<string[]>([]);
  return (
    <Live label="Try it: tap an option, or Tab in and use the arrow keys">
      {/* The step's frame, as in a lesson: the options' radio group lives inside it. */}
      <StepFrame stepId="system-live-options">
        <ChoiceGroup
          label="Odpowiedzi"
          items={ANSWERS}
          select="one"
          layout="grid"
          chosen={chosen}
          locked={false}
          clock={browserClock}
          onToggle={(id) => setChosen([id])}
        />
      </StepFrame>
    </Live>
  );
}

export function Options(): JSX.Element {
  const LANG = useSystemLanguage();
  const states: readonly { label: string; items: ChoiceItem[]; chosen: string[] }[] = [
    { label: "Waiting", items: [item("a", "24", "idle")], chosen: [] },
    { label: "Picked: chosen, not judged", items: [item("a", "24", "idle")], chosen: ["a"] },
    {
      label: "A miss: dashed, with a word",
      items: [item("a", "20", "amber", { note: "sprawdzone" })],
      chosen: ["a"],
    },
    { label: "Right", items: [item("a", "24", "green")], chosen: ["a"] },
    { label: "Missing: what Check found empty", items: [item("a", "24", "missing")], chosen: [] },
    {
      label: "Help rung 1: look here",
      items: [item("a", "24", "idle", { focus: true })],
      chosen: [],
    },
    {
      label: "Help rung 2: taken away",
      items: [item("a", "46", "idle", { removed: true })],
      chosen: [],
    },
  ];
  return (
    <Sub
      title="Options"
      lead="A picked option changes colour, never size or weight, so nothing moves under a finger."
    >
      <LiveOptions />
      <Panel cols={4}>
        {states.map((s) => (
          <Spec key={s.label} label={s.label}>
            <ChoiceStatic
              label={s.label}
              items={s.items}
              layout="list"
              chosen={s.chosen}
              className="w-full"
            />
          </Spec>
        ))}
        <Spec label="The solution, after “Jeszcze nie wiem”">
          <div
            data-solution
            className="flex min-h-18 w-full items-center justify-between rounded-jw-control px-5 text-jw-option font-bold"
          >
            24
            <span data-solution-label className="flex items-center gap-1.5 font-normal">
              <SolutionIcon aria-hidden className="size-4.5" /> {copy(LANG, "ds_solution_label")}
            </span>
          </div>
        </Spec>
        <Spec label="Lettered, as A to E" wide>
          <ChoiceStatic
            label="Lettered"
            layout="lettered"
            chosen={["b"]}
            className="w-full"
            items={[
              item("a", "10", "idle", { letter: "A" }),
              item("b", "24", "idle", { letter: "B" }),
              item("c", "28", "idle", { letter: "C" }),
            ]}
          />
        </Spec>
      </Panel>
    </Sub>
  );
}

function Field({ text, tone, label }: { text: string; tone: Tone; label: string }): JSX.Element {
  const LANG = useSystemLanguage();
  return (
    <Spec label={label}>
      <div className="w-full">
        <Entry
          language={LANG}
          clock={STILL_CLOCK}
          input="text"
          entry="keyboard"
          max={12}
          state={{ ...EMPTY_ENTRY, text }}
          tone={tone}
          locked={tone === "green"}
          label={label}
          onChange={() => {}}
          onSubmit={() => {}}
          check={false}
        />
      </div>
    </Spec>
  );
}

function LiveFields(): JSX.Element {
  const LANG = useSystemLanguage();
  const [word, setWord] = useState<EntryState>(EMPTY_ENTRY);
  const [sum, setSum] = useState<EntryState>(EMPTY_ENTRY);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Live label="Try it: type a word, or tap a Polish letter under the field">
        <Entry
          language={LANG}
          clock={browserClock}
          input="text"
          entry="keyboard"
          max={16}
          state={word}
          tone="idle"
          locked={false}
          label="Słowo"
          letters
          onChange={(next) => setWord(next)}
          onSubmit={() => {}}
          check={false}
        />
      </Live>
      <Live label="Try it: the keypad, by tap or by the number keys">
        <Entry
          language={LANG}
          clock={browserClock}
          input="number"
          entry="keypad"
          max={4}
          state={sum}
          tone="idle"
          locked={false}
          label="8 × 9"
          onChange={(next) => setSum(next)}
          onSubmit={() => {}}
        />
      </Live>
    </div>
  );
}

export function Fields(): JSX.Element {
  return (
    <Sub
      title="Typed answers"
      lead="Click into a field to see the active field: the pick’s fill inside an ink-blue line at the same width, and a 3 px ink caret that breathes. No glow. Selected letters take the pick’s blue. After a check the field keeps the child’s answer: dashed red for a miss, green for right."
    >
      <LiveFields />
      <Panel cols={3}>
        <Field text="" tone="idle" label="Empty" />
        <Field text="żółw" tone="idle" label="Written (click in, select a letter)" />
        <Field text="" tone="missing" label="Missing: Check found it empty" />
        <Field text="żułw" tone="amber" label="A miss: the answer stays" />
        <Field text="żółw" tone="green" label="Right" />
        <Spec label="A miss in a word marks only the letters to fix">
          <span className="text-jw-option font-bold tracking-wide">
            ż
            <span data-mark="miss" className="px-0.5">
              u
            </span>
            łw
          </span>
        </Spec>
        <Spec label="The placeholder colour (--jw-placeholder), 4.5:1 on a card">
          <span className="text-jw-option text-jw-placeholder">Napisz słowo</span>
        </Spec>
      </Panel>
    </Sub>
  );
}

const TILES = [
  { id: "t1", content: "82", text: "82" },
  { id: "t2", content: "208", text: "208" },
  { id: "t3", content: "280", text: "280" },
];

function Bank({
  label,
  placed,
  tone,
  missing = false,
  onPlace,
}: {
  label: string;
  placed: (string | null)[];
  tone: Tone;
  missing?: boolean;
  onPlace?: (place: number, tile: string | null) => void;
}): JSX.Element {
  const LANG = useSystemLanguage();
  return (
    <TileBank
      language={LANG}
      label={label}
      tiles={TILES}
      places={placed.map((tile, i) => ({
        id: `s${i + 1}`,
        tile,
        missing: missing && tile === null,
      }))}
      firstLabel="najmniejsza"
      lastLabel="największa"
      tone={tone}
      locked={tone === "green" || onPlace === undefined}
      clock={onPlace ? browserClock : STILL_CLOCK}
      onPlace={(place, tile) => onPlace?.(place, tile)}
    />
  );
}

function LiveTiles(): JSX.Element {
  const [placed, setPlaced] = useState<(string | null)[]>([null, null, null]);
  // A tile sits in one place at a time: putting it somewhere takes it from where it was.
  const place = (at: number, tile: string | null) =>
    setPlaced((now) => now.map((t, i) => (i === at ? tile : t === tile ? null : t)));
  return (
    <Live label="Try it: tap a tile, then a place, or drag it">
      <Bank label="Od najmniejszej do największej" placed={placed} tone="idle" onPlace={place} />
      <Button
        variant="outline"
        className="self-start"
        onClick={() => setPlaced([null, null, null])}
        disabled={placed.every((t) => t === null)}
      >
        <RotateCcw aria-hidden /> Start again
      </Button>
    </Live>
  );
}

const BANKS = [
  { label: "Waiting", placed: [null, null, null], tone: "idle", missing: false },
  { label: "Half built", placed: ["t1", null, null], tone: "idle", missing: false },
  {
    label: "Missing: Check found places empty",
    placed: ["t1", null, null],
    tone: "idle",
    missing: true,
  },
  { label: "A miss", placed: ["t1", "t3", "t2"], tone: "amber", missing: false },
  { label: "Right", placed: ["t1", "t2", "t3"], tone: "green", missing: false },
] as const satisfies readonly {
  label: string;
  placed: readonly (string | null)[];
  tone: Tone;
  missing: boolean;
}[];

export function Tiles(): JSX.Element {
  return (
    <Sub
      title="Tiles"
      lead="A tile in the bank, placed in the row, or the hollow it leaves behind."
    >
      <LiveTiles />
      <Panel cols={2}>
        {BANKS.map((b) => (
          <Spec key={b.label} label={b.label} wide>
            <div className="w-full">
              <Bank label={b.label} placed={[...b.placed]} tone={b.tone} missing={b.missing} />
            </div>
          </Spec>
        ))}
      </Panel>
    </Sub>
  );
}

export type BandState = "waiting" | "answered" | "miss" | "help" | "right" | "solution";

export const BAND_STATES: readonly { id: BandState; title: string }[] = [
  { id: "waiting", title: "Waiting" },
  { id: "answered", title: "Answered, ready to check" },
  { id: "miss", title: "A miss: “Pomóż mi” in the band" },
  { id: "help", title: "After help: the yellow note, the plain footer" },
  { id: "right", title: "Right: Dalej in green" },
  { id: "solution", title: "The solution, after “Jeszcze nie wiem”" },
];

/** A help card as the stage takes it (StepShell's `ladder.help`). */
type PageHelp = NonNullable<NonNullable<ComponentProps<typeof StepShell>["ladder"]>["help"]>;

const rung = (q: StageQuestion, n: number): PageHelp => ({
  rung: n,
  card: { text: q.rungs[n - 1] ?? "" },
  focus: null,
  given: null,
  worked: null,
  twin: null,
  more: n < q.rungs.length,
});

/** The options as a state draws them: the child's pick, toned by its written scenario's marks, and
 * the written right one once the step shows its solution. */
function options(q: StageQuestion, state: BandState, picked: string | null): ChoiceItem[] {
  const marks = picked === null ? [] : (q.outcomeOf(picked)?.marks ?? []);
  return q.options.map((o) => {
    const mark = marks.find((m) => m.id === o.id);
    const marked = state === "miss" || state === "help" || state === "right";
    const tone: Tone =
      state === "solution" && o.id === q.right
        ? "green"
        : marked && mark !== undefined
          ? mark.correct
            ? "green"
            : "amber"
          : state === "right" && o.id === picked
            ? "green"
            : "idle";
    return item(o.id, o.content, tone);
  });
}

function feedbackOf(state: BandState): Feedback | null {
  if (state === "miss" || state === "help") return { kind: "try_again", index: 0 };
  if (state === "right") return { kind: "praise", index: 0 };
  if (state === "solution") return { kind: "moved_on", index: 0 };
  return null;
}

/** The written question in the page's language, once the examples are read (null until then). */
function useStageQuestion(): StageQuestion | null {
  const LANG = useSystemLanguage();
  const loaded = useExamples(LANG);
  return useMemo(() => {
    if (loaded.kind !== "ready") return null;
    return stageQuestion(stageExample(loaded.examples), LANG);
  }, [loaded, LANG]);
}

/** Where the stage stands while its question is read. */
function StageWaiting(): JSX.Element {
  const LANG = useSystemLanguage();
  return <Spinner label={copy(LANG, "loading")} />;
}

/** The stage as a lesson plays it: pick, Sprawdź, the band, help, and on. Sprawdź shows the written
 * scenario of the pick: its outcome sets the band, its marks the options. */
function LiveStage(): JSX.Element {
  const q = useStageQuestion();
  return q === null ? <StageWaiting /> : <LiveStageOn q={q} />;
}

function LiveStageOn({ q }: { q: StageQuestion }): JSX.Element {
  const LANG = useSystemLanguage();
  const [state, setState] = useState<BandState>("waiting");
  const [picked, setPicked] = useState<string | null>(null);
  const [help, setHelp] = useState(0);
  // A new verdict object per check, so the stage hears a fresh one (StepShell's `edited`).
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const ended = state === "right" || state === "solution";
  const reset = () => {
    setState("waiting");
    setPicked(null);
    setHelp(0);
    setFeedback(null);
  };
  const check = press(browserClock, () => {
    if (picked === null || ended) return;
    const written = q.outcomeOf(picked);
    if (written === null) return;
    const next: BandState = written.outcome === "correct" ? "right" : "miss";
    setState(next);
    setFeedback(feedbackOf(next));
  });
  const ask = press(browserClock, () => {
    setHelp((n) => Math.min(q.rungs.length, n + 1));
    setState("help");
  });
  const giveUp = press(browserClock, () => {
    setState("solution");
    setFeedback(feedbackOf("solution"));
  });
  return (
    <Live label="Try it: play one written question through. Each pick shows its written scenario.">
      <div className="kid-step rounded-2xl border-2 border-border bg-background p-4">
        <LessonTheme>
          <StepFrame stepId="system-live-stage">
            <StepShell
              language={LANG}
              category="child"
              feedback={feedback}
              stem={<Stem say={q.say} stem={q.stem} language={LANG} />}
              answer={
                <ChoiceGroup
                  label="Odpowiedzi"
                  items={options(q, state, picked)}
                  select="one"
                  layout="grid"
                  chosen={picked === null ? [] : [picked]}
                  locked={ended}
                  clock={browserClock}
                  onToggle={(id) => {
                    setPicked(id);
                    if (state === "waiting") setState("answered");
                  }}
                />
              }
              action={{ ready: picked !== null, press: check }}
              ladder={
                ended
                  ? null
                  : {
                      help: help > 0 ? rung(q, help) : null,
                      ask: { enabled: help < q.rungs.length, press: ask },
                      refused: false,
                    }
              }
              moveOn={ended ? null : { enabled: true, press: giveUp }}
              next={ended ? { press: press(browserClock, reset) } : null}
            />
          </StepFrame>
        </LessonTheme>
      </div>
      <Button
        variant="outline"
        className="self-start"
        onClick={reset}
        disabled={state === "waiting" && picked === null}
      >
        <RotateCcw aria-hidden /> Start again
      </Button>
    </Live>
  );
}

/** One of the six states, frozen, in the step frame a lesson uses and in Zeszyt's theme (its ink
 * caret and keyboard frame too): the written miss in a miss and after help, the written right
 * answer when right. */
export function Shell({ state }: { state: BandState }): JSX.Element {
  const q = useStageQuestion();
  return q === null ? <StageWaiting /> : <ShellOn state={state} q={q} />;
}

function ShellOn({ state, q }: { state: BandState; q: StageQuestion }): JSX.Element {
  const LANG = useSystemLanguage();
  const picked =
    state === "waiting" ? null : state === "right" || state === "answered" ? q.right : q.miss;
  const ended = state === "right" || state === "solution";
  return (
    <LessonTheme>
      <StepFrame stepId={`system-band-${state}`}>
        <StepShell
          language={LANG}
          category="child"
          feedback={feedbackOf(state)}
          stem={<Stem say={q.say} stem={q.stem} language={LANG} />}
          answer={
            <ChoiceStatic
              label="Odpowiedzi"
              layout="grid"
              chosen={picked === null ? [] : [picked]}
              items={options(q, state, picked)}
            />
          }
          action={{ ready: state !== "waiting", press: NOOP }}
          ladder={
            ended
              ? null
              : {
                  help: state === "help" ? rung(q, 1) : null,
                  ask: { enabled: true, press: NOOP },
                  refused: false,
                }
          }
          moveOn={ended ? null : { enabled: true, press: NOOP }}
          next={ended ? { press: NOOP } : null}
        />
      </StepFrame>
    </LessonTheme>
  );
}

export function Bands(): JSX.Element {
  return (
    <Sub
      title="The stage in six states"
      lead="The real step layout every question type renders through: the instruction, the prompt card, the answer, help under it, and the footer that becomes the band. In a lesson the footer is fixed to the bottom of the screen and runs edge to edge."
    >
      <LiveStage />
      <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,24rem),1fr))]">
        {BAND_STATES.map((s) => (
          <figure key={s.id} className="flex min-w-0 flex-col gap-2" data-system-band={s.id}>
            <figcaption className="text-sm text-muted-foreground">{s.title}</figcaption>
            <div className="kid-step rounded-2xl border-2 border-border bg-background p-4">
              <Shell state={s.id} />
            </div>
          </figure>
        ))}
      </div>
    </Sub>
  );
}

// The verdict and help icons come from the state table, the one place a step's icons are named
// (docs/17 §2f rule 3); the rest are the controls'.
const stateIcon = (state: keyof typeof STATUS) => {
  const icon = STATUS[state].icon;
  return icon === null || icon === "spinner" ? X : icon;
};

const HelpIcon = stateIcon("boost");
const SolutionIcon = stateIcon("look");

const ICONS = [
  { Icon: X, name: "Close" },
  { Icon: Volume2, name: "Listen" },
  { Icon: stateIcon("boost"), name: "Help" },
  { Icon: stateIcon("look"), name: "Look again" },
  { Icon: stateIcon("right"), name: "Right" },
  { Icon: stateIcon("not_yet"), name: "Not yet" },
  { Icon: stateIcon("moved_on"), name: "Moved on" },
  { Icon: ArrowUp, name: "Capitals" },
  { Icon: Delete, name: "Erase" },
  { Icon: Turtle, name: "Slower" },
  { Icon: Calculator, name: "Tools" },
] as const;

export function Icons(): JSX.Element {
  return (
    <Sub
      title="Icons"
      lead="Lucide, at a 2 px stroke with round caps, used sparingly. No emoji, and maths signs are text. An icon-only button may carry a tooltip that names it, as the turtle does."
    >
      <div className="flex flex-wrap gap-4 rounded-2xl border-2 border-border bg-card p-6">
        {ICONS.map(({ Icon, name }) => (
          <figure key={name} className="flex w-24 flex-col items-center gap-2 text-center">
            <Icon aria-hidden className="size-7" />
            <figcaption className="text-xs text-muted-foreground">{name}</figcaption>
          </figure>
        ))}
        {/* The draggables' 2 × 3 grip is our own part, not a Lucide icon (lesson-frame §6). */}
        <figure className="flex w-24 flex-col items-center gap-2 text-center">
          <span className="grid size-7 place-items-center">
            <Grip />
          </span>
          <figcaption className="text-xs text-muted-foreground">Drag</figcaption>
        </figure>
      </div>
    </Sub>
  );
}

/** The export's sample clues (claude-design/ui_kits/lesson/help-ladder.html), for 347 + 285. */
const CLUES = {
  pl: [
    "Spójrz na dziesiątki: 4 i 8.",
    "4 + 8 = 12. Zapisz 2, a 1 przenieś do setek.",
    "Teraz setki: 3 + 2 i jeszcze ta 1 z przeniesienia.",
  ],
  en: [
    "Look at the tens: 4 and 8.",
    "4 + 8 = 12. Write 2 and carry 1 to the hundreds.",
    "Now the hundreds: 3 + 2, plus the 1 you carried.",
  ],
} as const;

/** The help note grows rung by rung (lesson frame rule 6): Więcej pomocy adds the next clue under
 * the last, the older ones muted, and Jeszcze nie wiem sits at its end. */
export function Help(): JSX.Element {
  const LANG = useSystemLanguage();
  const [shown, setShown] = useState(1);
  const steps = CLUES[LANG];
  const add = (): void => setShown((n) => Math.min(steps.length, n + 1));
  const more = {
    onPointerDown: add,
    onClick: (event: { detail: number }) => event.detail === 0 && add(),
  };
  return (
    <Sub
      title="The help note"
      lead="One note that grows: Więcej pomocy adds the next clue under the last, older clues turn muted, and the counter reads the clues the step has. Jeszcze nie wiem, at its end, is the only way out of a step."
    >
      <div className="flex max-w-180 flex-col gap-3" data-system-ladder="note">
        <HelpLadder
          language={LANG}
          cards={steps.slice(0, shown)}
          of={steps.length}
          more={shown < steps.length ? more : null}
          dontKnow={NOOP}
        />
        <Button
          variant="outline"
          className="self-start"
          onClick={() => setShown(1)}
          disabled={shown === 1}
        >
          <RotateCcw aria-hidden /> Start again
        </Button>
      </div>
    </Sub>
  );
}
