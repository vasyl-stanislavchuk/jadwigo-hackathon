/**
 * The turn spine, one state at a time (dl-uukj.47.71.3; handoff D1-D3, D5, D7, S9-S15, §4.1,
 * §4.2): queued, thinking, a tool with the plan, slow, stalled, waiting, failed, stopped, and done
 * folded and opened. The spines are built by hand on the shape lane A's fold gives (spine/types.ts),
 * so every state is drawn here before the fold lands. Every word is a copy key: no ids, no JSON, no
 * "Szczegóły".
 */

import { type CopyKey, copy } from "@jadwigo/copy";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TurnSpine as Spine } from "./spine/types.ts";
import { TurnSpine } from "./TurnSpine.tsx";
import { TurnSummary } from "./TurnSummary.tsx";

afterEach(cleanup);

const T0 = Date.parse("2026-11-03T10:00:00.000Z");
type Stage = Spine["stages"][number];
type Line = Stage["lines"][number];

const words = (copyKey: CopyKey, values: Record<string, string | number> = {}) => ({
  copyKey,
  values,
});
const say = (text: string): Line => ({ kind: "done", ...words("chat_line_say", { text }) });
const now = (text: string, startedAt: number): Line => ({
  kind: "now",
  startedAt,
  ...words("chat_line_say", { text }),
});

const SEARCH: Stage = {
  id: "0",
  name: "Szukanie zadań",
  status: "done",
  visit: 1,
  summary: words("chat_line_say", { text: "4 zestawy w klasie 2" }),
  lines: [
    {
      kind: "done",
      ...words("chat_line_search", { query: "mnożenie przez 2 i 5", grade: 2, n: 7 }),
      tags: Array.from({ length: 7 }, (_, i) => ({
        id: `set-${i}`,
        ...words("chat_line_say", { text: `Zestaw ${i + 1}` }),
      })),
    },
    say("Wybrałam 2 zestawy"),
  ],
};
const DRAFT = (status: Stage["status"], lines: Line[] = []): Stage => ({
  id: "1",
  name: "Układanie lekcji",
  status,
  visit: 1,
  lines,
});
const CHECK: Stage = { id: "2", name: "Sprawdzanie lekcji", status: "todo", visit: 1, lines: [] };

const spine = (over: Partial<Spine>): Spine => ({
  phase: "tool",
  title: { text: "Szykuję lekcję mnożenia dla drugiej klasy" },
  startedAt: T0,
  stepCount: 0,
  stages: [],
  looseLines: [],
  ...over,
});

function draw(s: Spine, at = T0, actions = {}) {
  return render(<TurnSpine spine={s} now={at} language="pl" actions={actions} />);
}

const card = () => document.querySelector("[data-spine]") as HTMLElement;
const title = () => card().querySelector("[data-title]")?.textContent;
const meta = () => card().querySelector("[data-meta]")?.textContent;
const mark = () =>
  card().querySelector("[data-spine-header] [data-mark]")?.getAttribute("data-mark");

/** Nothing of the old thread, and nothing a parent should never read (S3, handoff §14). */
function clean() {
  const text = document.body.textContent ?? "";
  expect(text).not.toContain("Szczegóły");
  expect(text).not.toMatch(/[a-z_]+\(|\{|"[a-z_]+":|s\d{2}\b/);
  for (const old of ["[data-tool-group]", "[data-plan]", "[data-activity]", "[role='alert']"])
    expect(document.querySelector(old)).toBeNull();
}

describe("the spine, one state at a time", () => {
  it("queued (s01): 'W kolejce · 0 s' and 'Zacznę za chwilę.' at send", () => {
    draw(spine({ phase: "queued", title: words("chat_phase_queued") }));
    expect(card().getAttribute("data-spine")).toBe("queued");
    expect(mark()).toBe("running");
    expect(title()).toBe("W kolejce");
    expect(meta()).toBe("0 s");
    expect(card().textContent).toContain("Zacznę za chwilę.");
    clean();
  });

  it("thinking (s02): the phase words and the seconds count, no shimmer", () => {
    draw(spine({ phase: "thinking", title: words("chat_phase_thinking_lesson") }), T0 + 7_000);
    expect(title()).toBe("Zastanawiam się nad lekcją");
    expect(meta()).toBe("7 s");
    expect(document.querySelector("[data-shimmer]")).toBeNull();
    clean();
  });

  it("a tool with the plan (s03): done stage folded, the active one open with its now line, todo hollow", () => {
    draw(
      spine({
        stages: [SEARCH, DRAFT("active", [now("Układam 4 zadania", T0 + 20_000)]), CHECK],
      }),
      T0 + 84_000,
    );
    expect(meta()).toBe("1 min 24 s");
    const stages = [...document.querySelectorAll("[data-stage]")];
    expect(stages.map((s) => s.getAttribute("data-stage"))).toEqual(["done", "active", "todo"]);
    // Done: a button, folded, its summary beside the name.
    const done = stages[0]?.querySelector("button") as HTMLButtonElement;
    expect(done.getAttribute("aria-expanded")).toBe("false");
    expect(done.textContent).toContain("4 zestawy w klasie 2");
    // Active: open, not a button (S4), its now line in ink with its own seconds.
    expect(stages[1]?.querySelector("button")).toBeNull();
    const line = stages[1]?.querySelector("[data-line='now']") as HTMLElement;
    expect(line.textContent).toBe("Układam 4 zadania" + "1 min 04 s");
    // Todo: hollow, no lines.
    expect(stages[2]?.querySelector("[data-mark='todo']")).not.toBeNull();
    expect(stages[2]?.querySelector("[data-lines]")).toBeNull();
    clean();
  });

  it("slow (s04): the open stage says it takes longer, and still no foot", () => {
    draw(
      spine({
        phase: "slow",
        stages: [
          SEARCH,
          DRAFT("active", [
            now("Układam 4 zadania", T0),
            { kind: "slow", ...words("chat_slow_line") },
          ]),
          CHECK,
        ],
      }),
      T0 + 25_000,
    );
    expect(card().querySelector("[data-line='slow']")?.textContent).toBe(
      "To trwa dłużej niż zwykle. Pracuję dalej.",
    );
    expect(document.querySelector("[data-foot]")).toBeNull();
  });

  it("stalled (s05): the foot offers Spróbuj ponownie and Czekaj dalej, which hides it", () => {
    const onRetry = vi.fn();
    draw(
      spine({
        phase: "stalled",
        stages: [SEARCH, DRAFT("active", [now("Układam 4 zadania", T0)]), CHECK],
        foot: { kind: "stalled" },
      }),
      T0 + 65_000,
      { onRetry },
    );
    const foot = document.querySelector("[data-foot='stalled']") as HTMLElement;
    expect(foot.textContent).toContain("Nic się nie dzieje od minuty.");
    fireEvent.click(within(foot).getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onRetry).toHaveBeenCalledOnce();
    fireEvent.click(within(foot).getByRole("button", { name: "Czekaj dalej" }));
    expect(document.querySelector("[data-foot]")).toBeNull();
    clean();
  });

  it("waiting (s10): the person mark, 'czeka na Ciebie', and the waiting line", () => {
    draw(
      spine({
        phase: "awaiting_input",
        stages: [
          SEARCH,
          DRAFT("waiting", [{ kind: "wait", ...words("chat_line_waiting") }]),
          CHECK,
        ],
      }),
      T0 + 30_000,
    );
    expect(mark()).toBe("waiting");
    expect(meta()).toBe("czeka na Ciebie");
    expect(document.querySelector("[data-stage='waiting'] [data-mark='waiting']")).not.toBeNull();
    expect(card().textContent).toContain("Czekam na Twoją odpowiedź poniżej");
  });

  it("failed (s13): the stage takes the alert, the rest stay hollow, the foot retries and copies", () => {
    const onRetry = vi.fn();
    const onCopyDetails = vi.fn();
    draw(
      spine({
        phase: "failed",
        endedAt: T0 + 130_000,
        stages: [
          SEARCH,
          {
            ...DRAFT("failed", [
              { kind: "retry", ...words("chat_line_retry", { stage: "Układanie lekcji" }) },
            ]),
            summary: words("chat_stage_failed_sum", { n: 3 }),
          },
          CHECK,
        ],
        foot: { kind: "failed", tries: 3 },
      }),
      T0 + 500_000,
      { onRetry, onCopyDetails },
    );
    expect(mark()).toBe("failed");
    expect(meta()).toBe("przerwane · 2 min 10 s");
    expect(document.querySelector("[data-stage='failed'] [data-stage-note]")?.textContent).toBe(
      "nie wyszło po 3 próbach",
    );
    const foot = document.querySelector("[data-foot='failed']") as HTMLElement;
    expect(foot.textContent).toContain("Nie udało się ułożyć lekcji.");
    fireEvent.click(within(foot).getByRole("button", { name: "Spróbuj ponownie" }));
    fireEvent.click(within(foot).getByRole("button", { name: "Kopiuj szczegóły dla pomocy" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onCopyDetails).toHaveBeenCalledOnce();
    // No red, no green: the marks are ink and primary only (DS S3).
    expect(card().innerHTML).not.toMatch(/jw-(miss|right)/);
    clean();
  });

  it("stopped (s14): the square, 'zatrzymane · {t}', and the foot says the lesson is unchanged, with no version", () => {
    draw(
      spine({
        phase: "cancelled",
        endedAt: T0 + 31_000,
        stages: [SEARCH, { ...DRAFT("stopped"), summary: words("chat_stage_stopped_sum") }, CHECK],
        foot: { kind: "stopped", changed: false },
      }),
      T0 + 90_000,
    );
    expect(mark()).toBe("stopped");
    expect(meta()).toBe("zatrzymane · 31 s");
    expect(document.querySelector("[data-foot='stopped']")?.textContent).toBe(
      "Zatrzymane. Lekcja została bez zmian.",
    );
    clean();
  });
});

describe("the open stage (D3) and the search tags (S14)", () => {
  const five = DRAFT("active", ["jeden", "dwa", "trzy", "cztery"].map(say).concat(now("pięć", T0)));

  it("shows the last 3 lines and folds the older ones under '{n} wcześniej'", () => {
    draw(spine({ stages: [SEARCH, five, CHECK] }));
    const stage = document.querySelector("[data-stage='active']") as HTMLElement;
    const shown = () => [...stage.querySelectorAll("[data-line]")].map((l) => l.textContent);
    expect(shown()).toEqual(["trzy", "cztery", "pięć0 s"]);
    const earlier = stage.querySelector("[data-earlier]") as HTMLButtonElement;
    expect(earlier.tagName).toBe("BUTTON");
    expect(earlier.textContent).toBe("2 wcześniej");
    fireEvent.click(earlier);
    expect(shown()).toEqual(["jeden", "dwa", "trzy", "cztery", "pięć0 s"]);
  });

  it("a done stage opens on its row (a button with aria-expanded) and folds again", () => {
    draw(spine({ stages: [SEARCH, five, CHECK] }));
    const row = document.querySelector("[data-stage='done'] button") as HTMLButtonElement;
    expect(row.tagName).toBe("BUTTON");
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector("[data-stage='done'] [data-lines]")).not.toBeNull();
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows 4 tags then '+3 więcej', opens to 'Zwiń', and is closed again when the stage reopens", () => {
    draw(spine({ stages: [SEARCH, five, CHECK] }));
    const row = document.querySelector("[data-stage='done'] button") as HTMLButtonElement;
    fireEvent.click(row);
    const tags = () => document.querySelectorAll("[data-tag]").length;
    const chip = () => document.querySelector("[data-tags-more]") as HTMLButtonElement;
    expect(tags()).toBe(4);
    expect(chip().textContent).toBe("+3 więcej");
    expect(chip().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(chip());
    expect(tags()).toBe(7);
    expect(chip().textContent).toBe("Zwiń");
    fireEvent.click(row);
    fireEvent.click(row);
    expect(tags()).toBe(4);
    expect(chip().textContent).toBe("+3 więcej");
  });

  it("says a second visit 'drugi raz' beside the stage name (D1)", () => {
    draw(spine({ stages: [SEARCH, { ...five, visit: 2 }, CHECK] }));
    expect(document.querySelector("[data-stage='active'] [data-stage-note]")?.textContent).toBe(
      copy("pl", "chat_stage_again_2", {}, "adult"),
    );
  });

  it("draws a steer as its label above the parent's words in quotes (S17)", () => {
    draw(
      spine({
        stages: [
          SEARCH,
          DRAFT("active", [
            {
              kind: "steer",
              steerLabel: true,
              quote: "Dodaj jedno z dzieleniem",
              ...words("chat_steer_label"),
            },
          ]),
          CHECK,
        ],
      }),
    );
    expect(document.querySelector("[data-line='steer']")?.textContent).toBe(
      "Dopisane w trakcie" + "„Dodaj jedno z dzieleniem”",
    );
  });

  it("draws a lesson edit made after the turn ended without the label", () => {
    draw(
      spine({
        stages: [
          SEARCH,
          DRAFT("active", [{ kind: "steer", afterTurn: true, ...words("chat_steered_edit") }]),
          CHECK,
        ],
      }),
    );
    expect(document.querySelector("[data-line='steer']")?.textContent).toBe(
      "Twoja zmiana w lekcji",
    );
  });
});

describe("the folded summary row (D5, §4.2)", () => {
  const done = spine({
    phase: "done",
    endedAt: T0 + 41_000,
    stepCount: 9,
    stages: [
      { ...SEARCH },
      {
        ...DRAFT("done", [say("Ułożyłam 4 zadania")]),
        summary: words("chat_line_say", { text: "4 zadania" }),
      },
      { ...CHECK, status: "done", lines: [say("Wszystko w porządku")] },
    ],
  });

  function Folding() {
    const [open, setOpen] = useState(false);
    return (
      <TurnSummary
        spine={done}
        now={T0 + 99_000}
        language="pl"
        open={open}
        onOpenChange={setOpen}
      />
    );
  }

  it("done folded (s07): one row, 'Zrobione w 3 etapach' and '9 kroków · 41 s', no stages", () => {
    render(<Folding />);
    const row = document.querySelector("[data-summary-row]") as HTMLButtonElement;
    expect(row.tagName).toBe("BUTTON");
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(row.querySelector("[data-title]")?.textContent).toBe("Zrobione w 3 etapach");
    expect(row.querySelector("[data-meta]")?.textContent).toBe("9 kroków · 41 s");
    expect(document.querySelector("[data-stage]")).toBeNull();
    clean();
  });

  it("done opened (s09): the row opens to the stages, each done stage still folded", () => {
    render(<Folding />);
    const row = document.querySelector("[data-summary-row]") as HTMLButtonElement;
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    const stages = [...document.querySelectorAll("[data-stage]")];
    expect(stages).toHaveLength(3);
    for (const stage of stages)
      expect(stage.querySelector("button")?.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Szukanie zadań")).toBeNull();
    clean();
  });
});
