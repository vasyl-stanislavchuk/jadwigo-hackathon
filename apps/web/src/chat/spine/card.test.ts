import { RunEvent } from "@jadwigo/contracts/run";
import { copy } from "@jadwigo/copy";
import { check } from "@jadwigo/lesson-import/check";
import { LESSON_FILES, RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { cardStateOf, cardStatesOf, RULE_WORDS } from "./card.ts";
import { plainPrompt } from "./lessonFile.ts";
import { checkOf } from "./lines.ts";
import { append, complete } from "./logs.test-helpers.ts";

const parsed = (name: string): RunEvent[] => {
  const log = RUN_LOGS.find((l) => l.name === name);
  if (log === undefined) throw new Error(`no golden log ${name}`);
  return log.events.map((e) => RunEvent.parse(e));
};

/** A golden log's events up to and including `seq` (all of them without one). */
const upTo = (name: string, seq?: number): RunEvent[] =>
  parsed(name).filter((e) => seq === undefined || e.seq <= seq);

describe("cardStateOf (S16)", () => {
  it("is ready when the last check passed and the lesson has questions (s15)", () => {
    expect(cardStateOf(upTo("happy-turn"))).toMatchObject({
      kind: "ready",
      version: 2,
      title: "Równe grupy",
      count: 4,
    });
    const preview = (
      cardStateOf(upTo("happy-turn")) as { preview: readonly { prompt: string }[] }
    ).preview.map((row) => row.prompt);
    // The first 3 prompts as the child reads them (lesson card delta C3).
    expect(preview).toHaveLength(3);
    for (const prompt of preview) expect(prompt).not.toMatch(/[*`$\\{}]|\n/);
    expect(cardStateOf(upTo("long-turn"))).toMatchObject({ kind: "ready", version: 12 });
  });

  it("is fix with the check's findings by step place when the check failed (s16)", () => {
    const card = cardStateOf(complete(upTo("long-turn", 36)));
    expect(card).toMatchObject({ kind: "fix", version: 5 });
    // empty-rung has its own words; this log's say-format is no rule the check emits, so it falls
    // back to its level's word (dl-uukj.47.71.31).
    // Numbered as the preview modal numbers its rows, questions only (dl-uukj.47.71.32): this
    // revision's questions are s04 and s05, so s05 is question 2, and s03, no question here, reads
    // unnumbered and first.
    expect(card?.kind === "fix" ? card.findings : null).toEqual([
      { step: null, words: { copyKey: "chat_check_level_error", values: {} } },
      { step: 2, words: { copyKey: "chat_finding_empty_rung", values: {} } },
    ]);
  });

  it("is fix when the lesson changed after its check, or was never checked", () => {
    expect(cardStateOf(complete(upTo("long-turn", 49)))).toMatchObject({
      kind: "fix",
      findings: [],
    });
    expect(cardStateOf(complete(upTo("happy-turn", 7)))).toMatchObject({ kind: "fix" });
  });

  it("is fix, never '0 zadań', when no step can be shown (dl-uukj.47.69)", () => {
    const empty = parsed("happy-turn").map((e) =>
      e.type === "lesson_revision"
        ? ({
            ...e,
            payload: { ...e.payload, lesson_file: { id: "x", title: "T", script: { parts: [] } } },
          } as RunEvent)
        : e,
    );
    expect(cardStateOf(empty)).toMatchObject({ kind: "fix", count: 0 });
  });

  it("is working while its turn is open (s06)", () => {
    expect(cardStateOf(upTo("long-turn", 70))).toMatchObject({
      kind: "working",
      version: 8,
    });
    expect(cardStateOf(upTo("long-turn", 70))).not.toHaveProperty("nextVersion");
  });

  it("is null for a turn that wrote no lesson", () => {
    expect(cardStateOf(upTo("plan-and-cite"))).toBeNull();
    expect(cardStateOf(upTo("failed-turn"))).toBeNull();
  });

  it("is never ready over a failed check or 0 steps, on any golden log at any seq", () => {
    for (const log of RUN_LOGS) {
      const events = parsed(log.name);
      for (const e of events) {
        const prefix = complete(events.filter((x) => x.seq <= e.seq));
        const card = cardStateOf(prefix);
        if (card?.kind !== "ready") continue;
        expect(card.count).toBeGreaterThan(0);
        const check = prefix.findLast(
          (x): x is Extract<RunEvent, { type: "tool_result" }> =>
            x.type === "tool_result" && x.payload.verb === "lesson_check",
        );
        expect(checkOf(check?.payload.output)?.publishable).toBe(true);
      }
    }
  });
});

describe("cardStatesOf (S7)", () => {
  it("keeps one living card, in the newest turn with the latest revision", () => {
    const states = cardStatesOf([upTo("happy-turn"), upTo("long-turn")]);
    expect(states.map((s) => s?.kind)).toEqual(["superseded", "ready"]);
  });

  it("makes the living card working while a later turn is open", () => {
    const states = cardStatesOf([upTo("long-turn"), upTo("plan-and-cite", 6)]);
    expect(states.map((s) => s?.kind)).toEqual(["working", undefined]);
    expect(states[0]).toMatchObject({ version: 12, kind: "working" });
  });

  it("leaves the newest card living, and not ready, when a later turn holds only the parent's patch", () => {
    const patched: RunEvent[] = parsed("happy-turn").map((e) =>
      e.type === "lesson_revision"
        ? ({ ...e, payload: { ...e.payload, revision: 3 } } as RunEvent)
        : e,
    );
    const onlyPatch = patched.filter((e) => e.type !== "tool_call" && e.type !== "tool_result");
    const states = cardStatesOf([upTo("happy-turn"), onlyPatch]);
    // The lesson changed after its check, so the living card is fix, never ready (dl-uukj.47.71.15).
    expect(states.map((s) => s?.kind)).toEqual(["fix", undefined]);
    expect(states[0]).toMatchObject({ version: 2, findings: [] });
  });
});

describe("plainPrompt (delta C3)", () => {
  it("reads a prompt as plain text: no marks, signs as signs, a gap as …, one line", () => {
    expect(plainPrompt("Ile to $2 \\times 3$?")).toBe("Ile to 2 × 3?");
    expect(plainPrompt("**Uzupełnij**: 2, 4, 6, {g1}")).toBe("Uzupełnij: 2, 4, 6, …");
    expect(plainPrompt("Policz *jabłka*\nna `stole`.")).toBe("Policz jabłka na stole.");
    expect(plainPrompt("Co to [suma](def: wynik dodawania)? ![kot](kot.png)")).toBe("Co to suma?");
    expect(plainPrompt("$12 \\div 4 = \\square$")).toBe("12 ÷ 4 = …");
    expect(plainPrompt("liczba_parzysta")).toBe("liczba_parzysta");
  });
});

/** A lesson file with real faults planted, as lesson-import's own check test plants them. */
function faulty(): Record<string, unknown> {
  const file = structuredClone(
    LESSON_FILES.find((f) => (f as { id: string }).id === "multiplication-times-four"),
  ) as { script: { parts: { steps: Record<string, unknown>[] }[] } };
  const steps = file.script.parts.flatMap((p) => p.steps);
  const step = (id: string) => steps.find((s) => s["id"] === id) as Record<string, unknown>;
  const help = (id: string) =>
    (step(id)["question"] as Record<string, unknown>)["help"] as Record<string, unknown>;
  help("s02")["boost"] = { text: "" };
  help("s03")["boost_by_mistake"] = { off_by_ten: { text: "Policz jeszcze raz." } };
  step("s06")["say"] = "Ile jest kwiatków razem? To 28.";
  return file as unknown as Record<string, unknown>;
}

/** happy-turn with its lesson swapped for `file` and its check's output for the real check's. */
function checkedTurn(file: Record<string, unknown>): RunEvent[] {
  const result = check(file);
  return parsed("happy-turn").map((e) => {
    if (e.type === "lesson_revision")
      return { ...e, payload: { ...e.payload, lesson_file: file } } as RunEvent;
    if (e.type === "tool_result" && e.payload.verb === "lesson_check")
      return {
        ...e,
        payload: {
          ...e.payload,
          output: { publishable: result.ok, findings: result.findings },
        },
      } as RunEvent;
    return e;
  });
}

describe("a finding in plain words by its rule (dl-uukj.47.71.31)", () => {
  it("reads the real check's findings by rule, at each question's place", () => {
    const card = cardStateOf(checkedTurn(faulty()));
    expect(card?.kind).toBe("fix");
    const findings = card?.kind === "fix" ? card.findings : [];
    expect(findings.map((f) => f.words.copyKey).sort()).toEqual(
      [
        "chat_finding_empty_rung",
        "chat_finding_key_in_say",
        "chat_finding_unknown_mistake_class",
      ].sort(),
    );
    for (const f of findings) expect(f.step).toBeGreaterThan(0);
    // In the lesson's order, as a parent reads it.
    const places = findings.map((f) => f.step ?? 0);
    expect(places).toEqual([...places].sort((a, b) => a - b));
  });

  it("has words in pl and en for every rule the check emits, never the rule's name or English", () => {
    for (const [rule, key] of Object.entries(RULE_WORDS)) {
      for (const language of ["pl", "en"] as const) {
        const words = copy(language, key, {}, "adult");
        expect(words, `${rule} ${language}`).not.toBe("");
        expect(words).not.toContain(rule);
        expect(words).not.toBe(key);
      }
      expect(copy("pl", key, {}, "adult")).not.toBe(copy("en", key, {}, "adult"));
    }
  });

  it("falls back to the level's word for an unknown rule, and keeps a lesson-wide finding unnumbered", () => {
    const file = faulty();
    const result = check(file);
    const events = checkedTurn(file).map((e) =>
      e.type === "tool_result" && e.payload.verb === "lesson_check"
        ? ({
            ...e,
            payload: {
              ...e.payload,
              output: {
                publishable: false,
                findings: [
                  ...result.findings,
                  { step_id: null, path: "", level: "error", rule: "json", text: "x", fix: "y" },
                  {
                    step_id: "s02",
                    path: "",
                    level: "warn",
                    rule: "brand-new",
                    text: "x",
                    fix: "y",
                  },
                ],
              },
            },
          } as RunEvent)
        : e,
    );
    const card = cardStateOf(events);
    const findings = card?.kind === "fix" ? card.findings : [];
    expect(findings).toContainEqual({
      step: null,
      words: { copyKey: "chat_finding_json", values: {} },
    });
    // The unknown rule's finding sits at s02's place, as the real empty-rung finding on s02 does.
    const s02 = findings.find((f) => f.words.copyKey === "chat_finding_empty_rung")?.step;
    expect(findings.find((f) => f.words.copyKey === "chat_check_level_warning")?.step).toBe(s02);
  });
});

describe("a lesson the engine checked by itself (dl-uukj.47.71.48)", () => {
  const checked = (publishable: boolean) =>
    [
      {
        type: "tool_call",
        payload: { call_id: "made-up-steer", verb: "lesson_check", input: {} },
      },
      {
        type: "tool_result",
        payload: {
          call_id: "made-up-steer",
          verb: "lesson_check",
          output: { publishable, findings: [] },
          error: null,
        },
      },
    ] as const;

  /** A finished turn with its lesson, and the parent's edit of it as a turn of its own. */
  function editedTurns(publishable: boolean) {
    const first = complete(upTo("happy-turn"));
    const latest = first.findLast((e) => e.type === "lesson_revision");
    if (latest?.type !== "lesson_revision") throw new Error("no revision");
    // As the engine writes it: the check, then the revision it stands for, under the steer's id.
    const edit = append([], ...checked(publishable), {
      type: "lesson_revision",
      payload: {
        revision: latest.payload.revision + 1,
        call_id: "made-up-steer",
        lesson_file: latest.payload.lesson_file,
      },
    });
    return cardStatesOf([first, complete(edit)]);
  }

  it("shows the parent's edit as ready when its check passed", () => {
    expect(editedTurns(true).map((c) => c?.kind)).toEqual(["superseded", "ready"]);
  });

  it("shows it as needing a fix when its check did not pass", () => {
    expect(editedTurns(false).map((c) => c?.kind)).toEqual(["superseded", "fix"]);
  });
});
