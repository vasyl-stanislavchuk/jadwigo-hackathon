/**
 * The System page's foundations (dl-uukj.29.30): the colour roles by day and by night, the type, the
 * spacing, the shape and the motion. Every value is read live from styles/foundation.css through the
 * element it sits on, so the page never holds a copy that could drift.
 */

import { Button } from "@jadwigo/ui";
import { RotateCcw } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { contrast } from "./contrast.ts";
import { ROLE_GROUPS, type Role } from "./data.ts";

/** The anchor of a part of a section, from its title: the System page's menu links to it. */
export const subId = (title: string): string =>
  `sub-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

/** A heading and a lead for one part of a section. */
export function Sub({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div id={subId(title)} className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl">{title}</h3>
        {lead && <p className="text-muted-foreground">{lead}</p>}
      </div>
      {children}
    </div>
  );
}

/** The value of each --jw- role as the element under `root` resolves it. */
function useRoles(
  root: React.RefObject<HTMLElement>,
  names: readonly string[],
): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({});
  useLayoutEffect(() => {
    const el = root.current;
    if (el === null) return;
    const style = getComputedStyle(el);
    setValues(
      Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--jw-${n}`).trim()])),
    );
    // The names are fixed for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);
  return values;
}

const ALL_NAMES = [
  ...new Set(
    ROLE_GROUPS.flatMap((g) =>
      g.roles.flatMap((r) => [r.name, r.ink].filter((n): n is string => n !== undefined)),
    ),
  ),
];

function Swatch({ role, values }: { role: Role; values: Record<string, string> }): JSX.Element {
  const bg = values[role.name] ?? "";
  const ink = role.ink ? (values[role.ink] ?? "") : "";
  const ratio = bg !== "" && ink !== "" ? contrast(ink, bg) : null;
  return (
    <div className="flex items-stretch gap-3" data-role={role.name}>
      <div
        className="grid w-28 shrink-0 place-items-center rounded-[var(--jw-radius-small)] border-2 border-border text-lg"
        style={{
          background: `var(--jw-${role.name})`,
          color: role.ink ? `var(--jw-${role.ink})` : "transparent",
          minHeight: "4rem",
        }}
      >
        {role.ink ? "Aa 7×8" : ""}
      </div>
      <div className="flex min-w-0 flex-col justify-center gap-0.5">
        <code className="text-sm">--jw-{role.name}</code>
        <span className="text-sm text-muted-foreground">{role.means}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {bg}
          {ratio !== null && ` · ${ratio.toFixed(1)}:1 with --jw-${role.ink}`}
        </span>
      </div>
    </div>
  );
}

/** One mode's column of roles, inside its own scope so it resolves that mode's values. */
function ModeColumn({ mode }: { mode: "light" | "dark" }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const values = useRoles(root, ALL_NAMES);
  const scope = (
    <div
      ref={root}
      data-lesson-theme="zeszyt"
      className="flex flex-col gap-6 rounded-2xl border-2 border-border bg-background p-5 text-foreground"
    >
      <p className="text-sm text-muted-foreground">{mode === "light" ? "By day" : "By night"}</p>
      {ROLE_GROUPS.map((g) => (
        <div key={g.title} className="flex flex-col gap-3">
          <h4 className="text-lg">{g.title}</h4>
          {g.roles.map((r) => (
            <Swatch key={r.name} role={r} values={values} />
          ))}
        </div>
      ))}
    </div>
  );
  // A wrapper that names the mode, so the dark roles resolve whatever the page's own mode.
  return <div {...{ theme: mode }}>{scope}</div>;
}

export function Colour(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {ROLE_GROUPS.map((g) => (
          <div
            key={g.title}
            className="flex flex-col gap-1 rounded-2xl border-2 border-border bg-card p-4"
          >
            <span className="text-lg">{g.title}</span>
            <span className="text-sm text-muted-foreground">{g.lead}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ModeColumn mode="light" />
        <ModeColumn mode="dark" />
      </div>
    </div>
  );
}

const SCALE: readonly {
  token: string;
  use: string;
  sample: string;
  strong?: boolean;
  math?: boolean;
}[] = [
  { token: "instruction", use: "Instruction", sample: "Napisz albo powiedz wynik.", strong: true },
  { token: "prompt", use: "Prompt", sample: "Ile to jest 8 × 9?", strong: true },
  { token: "option", use: "Options and answers", sample: "żółw · źrebię · 72", strong: true },
  { token: "math", use: "Maths", sample: "347 + 285 = 632", strong: true, math: true },
  { token: "verdict", use: "The band’s verdict", sample: "Tak, właśnie tak!", strong: true },
  {
    token: "body",
    use: "Help, hints, the band’s second line",
    sample: "8 × 9 to tyle co 8 × 10, tylko bez jednej ósemki.",
  },
  { token: "small", use: "Small print", sample: "Zadanie z Khan Academy" },
];

export function Type(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Sub
        title="Andika"
        lead="SIL’s face for children learning to read: a single-storey a and g, a 1, an I and an l told apart, and every Polish letter. 400 and 700 only."
      >
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-border bg-card p-6">
          {SCALE.map((s) => (
            <div key={s.token} className="grid gap-1 md:grid-cols-[14rem_1fr] md:items-baseline">
              <span className="text-sm text-muted-foreground">
                {s.use} · <code>--jw-size-{s.token}</code>
              </span>
              <span
                style={{
                  fontSize: `var(--jw-size-${s.token})`,
                  fontWeight: s.strong ? "var(--jw-weight-strong)" : "var(--jw-weight-text)",
                  lineHeight: 1.25,
                }}
              >
                {s.sample}
              </span>
            </div>
          ))}
        </div>
      </Sub>
      <div className="grid gap-4 md:grid-cols-2">
        <Sub
          title="Numbers"
          lead="Tabular lining figures everywhere: a column sum lines up, an answer never changes width. × is text in the face."
        >
          <div
            className="grid grid-cols-2 gap-4 rounded-2xl border-2 border-border bg-card p-6 tabular-nums"
            style={{ fontSize: "var(--jw-size-math)", fontWeight: "var(--jw-weight-strong)" }}
          >
            <span>1 7 4 9</span>
            <span>I l 1 | 7</span>
            <span>111 + 777</span>
            <span>6 × 7 ÷ 2</span>
          </div>
        </Sub>
        <Sub title="Letters" lead="Every Polish letter, capitals too.">
          <div
            className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-6"
            style={{ fontSize: "var(--jw-size-option)" }}
          >
            <span>ą ć ę ł ń ó ś ź ż</span>
            <span>Ą Ć Ę Ł Ń Ó Ś Ź Ż</span>
            <span>Zażółć gęślą jaźń</span>
          </div>
        </Sub>
      </div>
    </div>
  );
}

const SPACE = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function SpaceAndShape(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <Sub title="Spacing" lead="A 4 px step: 4, 8, 12, 16, 24, 32, 48, 64.">
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-6">
          {SPACE.map((n) => (
            <div key={n} className="flex items-center gap-3">
              <code className="w-28 text-sm">--jw-space-{n}</code>
              <span
                className="h-4 rounded-sm"
                style={{ width: `var(--jw-space-${n})`, background: "var(--jw-pick-edge)" }}
              />
            </div>
          ))}
        </div>
      </Sub>
      <Sub
        title="Shape"
        lead="Corners of 16 px, 10 px on keys and tiles, a 2 px line, and a 4 px pressed edge that tiles and the action stand on. No blurred shadows."
      >
        <div className="flex flex-wrap items-end gap-6 rounded-2xl border-2 border-border bg-card p-6">
          <figure className="flex flex-col items-start gap-2">
            <div
              className="h-20 w-36 border-2 border-border bg-background"
              style={{ borderRadius: "var(--jw-radius-card)" }}
            />
            <figcaption className="text-sm text-muted-foreground">A card, 16 px</figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-2">
            <div
              className="grid h-14 w-14 place-items-center border-2 border-border bg-card text-xl"
              style={{
                borderRadius: "var(--jw-radius-small)",
                boxShadow: "0 var(--jw-press) 0 var(--jw-line)",
              }}
            >
              7
            </div>
            <figcaption className="text-sm text-muted-foreground">
              A key, 10 px, on its edge
            </figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-2">
            <div
              className="grid h-14 w-14 place-items-center border-2 bg-card text-xl"
              style={{
                borderRadius: "var(--jw-radius-small)",
                borderColor: "var(--jw-line)",
                transform: "translateY(var(--jw-press))",
              }}
            >
              7
            </div>
            <figcaption className="text-sm text-muted-foreground">Pressed: sunk by 4 px</figcaption>
          </figure>
        </div>
      </Sub>
      <Sub
        title="Tap targets"
        lead="A child taps less precisely than an adult: 56 px at least, with room between. The design says 48; we keep 56."
      >
        <div className="flex flex-wrap items-end gap-4 rounded-2xl border-2 border-border bg-card p-6">
          <figure className="flex flex-col items-start gap-2">
            <Button variant="outline">Ą</Button>
            <figcaption className="text-sm text-muted-foreground">--kid-tap-min, 56</figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-2">
            <Button
              variant="outline"
              className="min-h-[var(--kid-key-size)] min-w-[var(--kid-key-size)] text-2xl"
            >
              8
            </Button>
            <figcaption className="text-sm text-muted-foreground">--kid-key-size, 72</figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-2">
            <Button size="commit">Sprawdź</Button>
            <figcaption className="text-sm text-muted-foreground">
              --kid-commit-height, 64
            </figcaption>
          </figure>
        </div>
      </Sub>
    </div>
  );
}

const MOTION: readonly { token: string; what: string; keyframes: string }[] = [
  {
    token: "dur-band",
    what: "The band rises from the bottom after a check: 260 ms, easing out.",
    keyframes: "stage-band-rise",
  },
  {
    token: "dur-mark",
    what: "A miss’s mark fades in where the eye should go: 120 ms, no shake.",
    keyframes: "jw-mark-in",
  },
  {
    token: "dur-tick",
    what: "A right answer’s tick arrives: 400 ms. Nothing is counted.",
    keyframes: "jw-tick-in",
  },
  {
    token: "dur-fast",
    what: "A press sinks by its 4 px edge, a hover, a tooltip: 120 ms.",
    keyframes: "jw-fade-in",
  },
  { token: "dur-step", what: "The next step slides in 24 px: 320 ms.", keyframes: "jw-step-in" },
  {
    token: "dur-scroll",
    what: "A scroll the frame makes, to what is below, the band or a new hint: 320 ms, easing out.",
    keyframes: "jw-fade-in",
  },
  {
    token: "dur-tools",
    what: "Was the laptop’s tools panel, gone with Narzędzia (Enter addendum 4.2): 200 ms, unused.",
    keyframes: "jw-fade-in",
  },
];

export function Motion(): JSX.Element {
  const [round, setRound] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2" key={round}>
        {MOTION.map((m) => (
          <div
            key={m.token}
            className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-5"
          >
            <span
              className="h-12 w-12 shrink-0 rounded-[var(--jw-radius-small)] border-2 border-dashed"
              style={{
                borderColor: "var(--jw-miss-edge)",
                background: "var(--jw-miss)",
                animation: `${m.keyframes} var(--jw-${m.token}) var(--jw-ease-out) both`,
              }}
            />
            <div className="flex flex-col gap-1">
              <code className="text-sm">--jw-{m.token}</code>
              <span className="text-sm text-muted-foreground">{m.what}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground">With reduced motion, every one of these is 0 ms.</p>
      <Button variant="outline" className="self-start" onClick={() => setRound((r) => r + 1)}>
        <RotateCcw aria-hidden /> Play again
      </Button>
    </div>
  );
}
