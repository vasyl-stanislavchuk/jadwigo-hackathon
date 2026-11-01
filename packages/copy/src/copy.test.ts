import { describe, expect, it } from "vitest";
import { harshWordsIn } from "./harsh.ts";
import { CATEGORY_TABLES, copy, copyAt, lookup, mistakeCopyKey, TABLES } from "./index.ts";
import {
  COPY_KEYS,
  type CopyEntry,
  type CopyKey,
  LIST_KEYS,
  MISTAKE_CLASSES,
  type PartialCopyTable,
} from "./types.ts";

function entries(value: CopyEntry | CopyEntry[]): CopyEntry[] {
  return Array.isArray(value) ? value : [value];
}

describe("copy tables", () => {
  it("have the same keys in pl and en, and exactly COPY_KEYS", () => {
    const want = [...COPY_KEYS].sort();
    for (const table of Object.values(TABLES)) {
      expect(Object.keys(table).sort()).toEqual(want);
    }
  });

  // A pl line may ship reviewed: the owner sets the flags, and an unreviewed line is listed by
  // tools/src/check-copy.ts, never a failure (owner, 2026-11-01, dl-5ssh.125).
  it("hold lists exactly for the list keys", () => {
    for (const table of Object.values(TABLES)) {
      for (const key of COPY_KEYS) {
        const isList = (LIST_KEYS as readonly string[]).includes(key);
        expect(Array.isArray(table[key]), key).toBe(isList);
      }
    }
  });

  it('never use a bare "wrong" or "źle"', () => {
    for (const table of Object.values(TABLES)) {
      for (const value of Object.values(table)) {
        for (const entry of entries(value)) {
          expect(entry.text).not.toMatch(/\bwrong\b|źle/i);
        }
      }
    }
  });

  it("hold no harsh word from any language, in any line or plural form (dl-dm9)", () => {
    for (const [language, table] of Object.entries(TABLES)) {
      for (const [key, value] of Object.entries(table)) {
        for (const entry of entries(value)) {
          const forms = Object.values(entry.plural ?? {}).flatMap((p) => Object.values(p.forms));
          for (const text of [entry.text, ...forms]) {
            expect(harshWordsIn(text), `${language}.${key}: ${text}`).toEqual([]);
          }
        }
      }
    }
  });
});

describe("harshWordsIn", () => {
  it.each([
    ["To jest błąd.", "błąd"],
    ["Nie  tak!", "nie tak"],
    ["BŁĘDNIE", "błędnie"],
    ["That was wrong.", "wrong"],
    ["Incorrect, try again", "incorrect"],
  ])("catches a planted harsh line: %s", (text, word) => {
    expect(harshWordsIn(text)).toContain(word);
  });

  it.each(["Złoty medal", "Zbuduj prostokąt", "Jeszcze nie wiem — dalej", "badge", "failsafe"])(
    "matches whole words only: %s",
    (text) => {
      expect(harshWordsIn(text)).toEqual([]);
    },
  );
});

describe("copy()", () => {
  it("fills placeholders", () => {
    expect(copy("pl", "dims", { rows: 7, cols: 8 })).toBe("7 na 8");
    expect(copy("en", "table_row", { row: 9 })).toBe("Times table: the 9s");
  });

  it("gives each counted noun its own plural rule (pl)", () => {
    expect(copy("pl", "array_label", { a: 7, b: 8 })).toBe("7 rzędów po 8 kropek");
    expect(copy("pl", "array_label", { a: 2, b: 3 })).toBe("2 rzędy po 3 kropki");
    expect(copy("pl", "array_label", { a: 1, b: 5 })).toBe("1 rząd po 5 kropek");
    expect(copy("pl", "array_label", { a: 5, b: 2 })).toBe("5 rzędów po 2 kropki");
    expect(copy("pl", "array_label", { a: 12, b: 1 })).toBe("12 rzędów po 1 kropce");
    expect(copy("pl", "number_line_label", { a: 7, b: 3 })).toBe("3 skoki po 7");
    expect(copy("pl", "number_line_label", { a: 7, b: 8 })).toBe("8 skoków po 7");
  });

  it("gives each counted noun its own plural rule (en)", () => {
    expect(copy("en", "array_label", { a: 1, b: 8 })).toBe("1 row of 8 dots");
    expect(copy("en", "number_line_label", { a: 7, b: 1 })).toBe("1 jump of 7");
  });

  it("cycles list keys", () => {
    expect(copyAt("pl", "praise", 0)).toBe("Tak, właśnie tak!");
    expect(copyAt("pl", "praise", 3)).toBe("Tak, właśnie tak!");
    expect(copyAt("pl", "try_again", 1)).toBe("Pomyśl jeszcze chwilę — dasz radę.");
  });
});

describe("voice and closed-session lines (dl-w2.4)", () => {
  const KEYS = [
    "voice_resting",
    "voice_waking",
    "voice_listening",
    "voice_speaking",
    "tap_to_hear",
    "session_finished",
    "start_again",
  ] as const;

  // Whether a line is reviewed is the review sidecars' and check-copy's to say, not this test's
  // (dl-9t2o.10): English lines pass the AI reviewer only
  // (jadwigo-question-bank/decisions/2026-11-01-english-text-is-checked-by-the-ai-reviewer-only-with-an-english),
  // Polish lines the AI skill against its checklist
  // (decision 2026-10-04-polish-lines-are-reviewed-by-an-ai-skill-against-a-cited-checkli).
  it("exist in every language", () => {
    for (const [language, table] of Object.entries(TABLES)) {
      for (const key of KEYS) {
        const entry = table[key] as CopyEntry;
        expect(entry?.text, `${language}.${key}`).toBeTruthy();
      }
    }
  });

  it('say "finished" and "again", never lateness, loss or expiry (charter: struggle-not-pressure)', () => {
    const loss = /too late|lost|expired|missed|za późno|stracon|przepad|wygas/i;
    for (const table of Object.values(TABLES)) {
      for (const key of ["session_finished", "start_again"] as const) {
        expect((table[key] as CopyEntry).text).not.toMatch(loss);
      }
    }
  });
});

// dl-i952.17 (owner 2026-10-07): copy adapts to the learner's category. The child tables are TABLES;
// a category table holds only the keys whose child line does not fit, and falls back to the child's.
const CATEGORY_TABLE_LIST: [string, PartialCopyTable][] = Object.entries(CATEGORY_TABLES).flatMap(
  ([category, byLanguage]) =>
    Object.entries(byLanguage ?? {}).map(([language, table]): [string, PartialCopyTable] => [
      `${category}.${language}`,
      table ?? {},
    ]),
);

// The keys shown by the surfaces that pass the category to copy() (DropScreen, StartScreen,
// ClosedScreen, CanDoCard, Runner, VoiceIndicator). A block gets `category` in its props and passes it
// once one of its keys needs a category line; add the key here in the same change.
const CATEGORY_AWARE_KEYS: readonly CopyKey[] = [
  "loading",
  "load_failed",
  "finished",
  "start",
  "mic_check",
  "no_voice_today",
  "session_finished",
  "start_again",
  "can_do_heading",
  "praise",
  "try_again",
  "moved_on",
  "move_on",
  "connection_trouble",
  "voice_resting",
  "voice_waking",
  "voice_listening",
  "voice_speaking",
  "tutor_resting",
  "tap_to_hear",
  // the parent's review and end list (dl-uukj.32 wave 2): ReviewStep, ReviewList, AttemptReview
  "play_ended_correct",
  "play_ended_missed",
  "play_ended_skipped",
  "play_ended_done",
  "play_ended_open",
  "review_no_answer",
  "review_praise",
];

describe("category tables (dl-i952.17)", () => {
  it("exist for adult English, with the lines the owner asked to be reworded", () => {
    const adult = CATEGORY_TABLES.adult?.en ?? {};
    for (const key of [
      "load_failed",
      "praise",
      "try_again",
      "move_on",
      "moved_on",
      "start",
      "finished",
      "session_finished",
      "can_do_heading",
      "tutor_resting",
      "mic_check",
    ] as const) {
      expect(adult[key], key).toBeTruthy();
    }
  });

  it("hold only copy keys that a category-aware surface shows, as lists exactly for the list keys", () => {
    for (const [name, table] of CATEGORY_TABLE_LIST) {
      for (const [key, value] of Object.entries(table)) {
        expect(CATEGORY_AWARE_KEYS as readonly string[], `${name}.${key}`).toContain(key);
        expect(Array.isArray(value), `${name}.${key}`).toBe(
          (LIST_KEYS as readonly string[]).includes(key),
        );
      }
    }
  });

  it("hold no harsh word, no em-dash and no score, clock or loss word", () => {
    const pressure =
      /\b(score|points?|seconds?|minutes?|hurry|quick(ly)?|streak|too late|lost|expired|missed|wrong)\b|—/i;
    for (const [name, table] of CATEGORY_TABLE_LIST) {
      for (const [key, value] of Object.entries(table)) {
        for (const entry of entries(value ?? [])) {
          expect(harshWordsIn(entry.text), `${name}.${key}: ${entry.text}`).toEqual([]);
          expect(entry.text, `${name}.${key}`).not.toMatch(pressure);
        }
      }
    }
  });

  // The 14 lines the owner read and approved on 2026-10-07, pinned by key and text: each ships
  // reviewed. A later adult line may ship as a draft (reviewed: false) until it is read.
  const APPROVED_ADULT: readonly [CopyKey, string][] = [
    ["praise", "That's right."],
    ["praise", "Exactly."],
    ["praise", "Good, that works."],
    ["try_again", "Not quite. Have another go."],
    ["try_again", "Take another look and try again."],
    ["move_on", "Skip for now"],
    ["moved_on", "Fine, we'll come back to this one."],
    ["start", "Start the lesson"],
    ["mic_check", "Microphone check (coming soon)"],
    ["tutor_resting", "Practicing without voice today."],
    ["load_failed", "This lesson didn't load. Reload the page to try again."],
    ["finished", "That's the lesson done. Thank you!"],
    ["can_do_heading", "What you can do now"],
    ["session_finished", "This lesson is finished. You can start it again."],
  ];

  it.each(APPROVED_ADULT)('ship the approved adult line %s "%s" reviewed', (key, text) => {
    const entry = entries(CATEGORY_TABLES.adult?.en?.[key] ?? []).find((e) => e.text === text);
    expect(entry?.reviewed).toBe(true);
  });

  it("have the same keys in every language, and ship pl drafts unreviewed", () => {
    const adult = CATEGORY_TABLES.adult ?? {};
    const want = Object.keys(adult.en ?? {}).sort();
    expect(Object.keys(adult.pl ?? {}).sort()).toEqual(want);
    for (const [key, value] of Object.entries(adult.pl ?? {})) {
      for (const entry of entries(value ?? []))
        expect(entry.reviewed, `adult.pl.${key}`).toBe(false);
    }
  });

  it("never ask an adult to find a grown-up, in any language", () => {
    const grownUp = /grown-up|parent|rodzic|dorosł/i;
    for (const [name, table] of CATEGORY_TABLE_LIST.filter(([n]) => n.startsWith("adult."))) {
      for (const [key, value] of Object.entries(table)) {
        for (const entry of entries(value ?? []))
          expect(entry.text, `${name}.${key}`).not.toMatch(grownUp);
      }
    }
    for (const language of ["pl", "en"] as const) {
      expect(copy(language, "load_failed", {}, "adult"), language).not.toMatch(grownUp);
      expect(copy(language, "load_failed"), language).toMatch(grownUp);
    }
  });
});

describe("copy() by category (dl-i952.17)", () => {
  it("reads the child table when no category is given, and for a child", () => {
    expect(copy("en", "start")).toBe("Let's start!");
    expect(copy("en", "start", {}, "child")).toBe("Let's start!");
    expect(lookup("pl", "start")).toBe(TABLES.pl.start);
  });

  it("gives an adult the adult line where there is one", () => {
    expect(copy("en", "start", {}, "adult")).toBe("Start the lesson");
    expect(copyAt("en", "praise", 1, {}, "adult")).toBe("Exactly.");
    expect(copyAt("en", "try_again", 2, {}, "adult")).toBe("Not quite. Have another go.");
  });

  it("falls back to the child line for an adult key with no adult line", () => {
    expect(CATEGORY_TABLES.adult?.en?.check).toBeUndefined();
    expect(copy("en", "check", {}, "adult")).toBe(copy("en", "check"));
    expect(copy("en", "table_row", { row: 9 }, "adult")).toBe("Times table: the 9s");
  });

  it("gives an adult the adult line in pl too, and the child line for a key with none", () => {
    expect(copy("pl", "start", {}, "adult")).toBe("Rozpocznij lekcję");
    expect(CATEGORY_TABLES.adult?.pl?.check).toBeUndefined();
    expect(copy("pl", "check", {}, "adult")).toBe(copy("pl", "check"));
  });
});

describe("lesson review (dl-uukj.30)", () => {
  it("names every mistake class in plain words for the parent, in every language", () => {
    for (const language of ["pl", "en"] as const) {
      for (const c of MISTAKE_CLASSES) {
        const key = mistakeCopyKey(c);
        expect(key, c).toBe(`parent_mistake_${c}`);
        const text = copy(language, key as CopyKey);
        expect(text, `${language}.${c}`).not.toContain("_");
        expect(text, `${language}.${c}`).not.toMatch(/\bwrong\b|źle|—/i);
      }
    }
  });

  it("gives no key for no class, and the plain fallback for a class with no line", () => {
    expect(mistakeCopyKey(null)).toBeNull();
    expect(mistakeCopyKey("a_class_nobody_wrote")).toBe("parent_mistake_other");
  });

  it("fills the review step's place and the parent's time", () => {
    expect(copy("pl", "review_title", { n: 3, total: 8 })).toBe("Pytanie 3 z 8");
    expect(copy("en", "review_title", { n: 3, total: 8 })).toBe("Question 3 of 8");
    expect(copy("pl", "parent_review_time", { seconds: 12 })).toBe("Czas: 12 s");
  });
});

describe("the chat page (dl-z5ja.29)", () => {
  const chatKeys = COPY_KEYS.filter((key) => key.startsWith("chat_"));

  it("never names money or tokens: the cost is said in words", () => {
    for (const [language, table] of Object.entries(TABLES)) {
      for (const key of chatKeys) {
        for (const entry of entries(table[key])) {
          expect(entry.text, `${language}.${key}`).not.toMatch(
            /\$|(?<!\p{L})(usd|zł|dolar\p{L}*|dollars?|tokens?|tokenów)(?!\p{L})/iu,
          );
        }
      }
    }
  });

  it("names no verb and no JSON on a line a parent reads", () => {
    for (const [language, table] of Object.entries(TABLES)) {
      for (const key of chatKeys) {
        for (const entry of entries(table[key])) {
          expect(entry.text, `${language}.${key}`).not.toMatch(/lesson_|question_|[{}]\s*"/);
        }
      }
    }
  });

  it("fills a tool line's topic and counts a check's notes in Polish plurals", () => {
    expect(copy("pl", "chat_tool_question_search_about", { topic: "odejmowanie do 20" })).toBe(
      "Szukam zadań o: odejmowanie do 20",
    );
    expect(copy("pl", "chat_check_findings", { n: 1 })).toBe("1 uwaga do poprawy");
    expect(copy("pl", "chat_check_findings", { n: 3 })).toBe("3 uwagi do poprawy");
    expect(copy("pl", "chat_check_findings", { n: 5 })).toBe("5 uwag do poprawy");
    expect(copy("en", "chat_check_findings", { n: 1 })).toBe("1 note to fix");
  });
});
