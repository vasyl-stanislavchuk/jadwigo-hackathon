/**
 * Where the verbs read questions from (Lead decision 10): `question_search` asks it for sets,
 * `lesson_draft` for the questions it copies whole into a draft, and `question_types` for the
 * kinds of question it holds. The runner never calls it. `apiBank` (bank-api.ts) is the real bank;
 * `fixtureBank` is the dev page's and the tests'.
 */
import { familyOf, PROPOSED_SKILL_MARK, QuestionType } from "@jadwigo/contracts";

export type BankLanguage = "pl" | "uk" | "en";

export interface BankQuery {
  /** The bare grade number, "1". */
  grade: string;
  /** The need in plain words, in `language`. */
  words: string | null;
  language: BankLanguage;
  skills: readonly string[];
  limit: number;
  /**
   * Keep only questions of these types (dl-hin8.24): `family.type`, a glob such as `group.*`, a
   * bare family (`choose`) or a bare type (`multi_select`), as jw's `lesson draft --question-type`.
   */
  question_types?: readonly string[];
  /** Draw only from these sets, by id, with no search (jw's `--set`, dl-u1y5.37). */
  sets?: readonly string[];
}

/** One question type the bank holds for a grade and language. */
interface BankTypeCount {
  question_type: string;
  family: string;
  /** How many sets hold a lesson-ready question of it. */
  sets: number;
  /** How many lesson-ready questions are of it. */
  ready: number;
}

/**
 * Whether a question of `type` is kept by `patterns`: no pattern keeps everything; otherwise one
 * that matches `family.type` as a glob, or names the family or the type alone. The same rule as
 * jw's `_type_kept` (apps/cli/src/jw/lesson.py), so both draw the same questions.
 */
export function typeKept(type: string, patterns: readonly string[] | undefined): boolean {
  if (patterns === undefined || patterns.length === 0) return true;
  const parsed = QuestionType.safeParse(type);
  const family = parsed.success ? familyOf(parsed.data) : "";
  const full = `${family}.${type}`;
  return patterns.some((p) => p === family || p === type || glob(p).test(full));
}

/** fnmatch's `*` and `?`, case-sensitive, anchored; every other character stands for itself. */
function glob(pattern: string): RegExp {
  const body = [...pattern]
    .map((c) => (c === "*" ? ".*" : c === "?" ? "." : c.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${body}$`);
}

/** One question set as a search row: what the model reads to choose. */
interface BankSet {
  set_id: string;
  title: string;
  grades: readonly string[];
  skills: readonly string[];
  questions: number;
  /** The question types of its lesson-ready questions, when the bank says. */
  question_types: readonly string[];
  why_found: string;
}

/** One question, whole, as a lesson file's question step holds it, in the query's language. */
interface BankQuestion {
  /** `authored:<id>` or `bank:<id>`: the step's `based_on.question`. */
  source: string;
  set_id: string;
  subject: "math" | "polish" | "english";
  question_type: string;
  skill_ids: readonly string[];
  say: string;
  question: { family: string; data: unknown; key: unknown; help: Record<string, unknown> };
}

export interface BankPort {
  search(query: BankQuery): Promise<{ sets: readonly BankSet[] }>;
  /**
   * At most `query.limit` questions of the kept types, in set order: from the set that best meets
   * the query, or from `query.sets` in their order when it names any.
   */
  sources(query: BankQuery): Promise<readonly BankQuestion[]>;
  /** Which question types the bank holds for a grade and language, most questions first. */
  types(grade: string, language: BankLanguage): Promise<readonly BankTypeCount[]>;
}

// The fixture: made-up questions only. No bank content, no Khan item, no name (fences 8 and 9).

type Op = "+" | "-";

interface FixtureSet {
  set_id: string;
  op: Op;
  /** `production`: type the answer; `recognition`: pick it from 3 numbers. */
  question_type: "production" | "recognition";
  skill: string;
  grades: readonly string[];
  /** Words a need may use for it, in every language the bank speaks. */
  words: readonly string[];
  title: Record<BankLanguage, string>;
  pairs: readonly (readonly [number, number])[];
}

const SETS: readonly FixtureSet[] = [
  {
    set_id: "set_fixture-add-20",
    op: "+",
    question_type: "production",
    skill: "math.add.within-20",
    grades: ["1", "2"],
    words: ["add", "adding", "addition", "plus", "sum", "dodawanie", "dodaj", "suma", "додавання"],
    title: {
      pl: "Dodawanie do 20 (fikcyjne)",
      uk: "Додавання до 20 (вигадані)",
      en: "Adding within 20 (made up)",
    },
    pairs: [
      [7, 5],
      [8, 6],
      [9, 4],
      [6, 6],
      [12, 5],
      [3, 9],
      [11, 7],
      [5, 8],
    ],
  },
  {
    set_id: "set_fixture-sub-20",
    op: "-",
    question_type: "production",
    // Marked as the prod bank marks a skill its enrichment proposed (dl-hin8.26): a draft drops it.
    skill: "proposed:math.sub.within-20",
    grades: ["1", "2"],
    words: [
      "subtract",
      "subtraction",
      "minus",
      "take away",
      "odejmowanie",
      "odejmij",
      "віднімання",
    ],
    title: {
      pl: "Odejmowanie do 20 (fikcyjne)",
      uk: "Віднімання до 20 (вигадані)",
      en: "Subtracting within 20 (made up)",
    },
    pairs: [
      [12, 5],
      [15, 7],
      [11, 3],
      [18, 9],
      [14, 6],
      [13, 8],
    ],
  },
  {
    set_id: "set_fixture-add-choose-20",
    op: "+",
    question_type: "recognition",
    skill: "math.add.within-20",
    grades: ["1", "2"],
    words: ["add", "adding", "addition", "plus", "sum", "dodawanie", "dodaj", "suma", "додавання"],
    title: {
      pl: "Dodawanie do 20, wybierz wynik (fikcyjne)",
      uk: "Додавання до 20, вибери відповідь (вигадані)",
      en: "Adding within 20, pick the answer (made up)",
    },
    pairs: [
      [6, 7],
      [9, 3],
      [8, 8],
      [4, 9],
      [10, 5],
      [7, 7],
    ],
  },
];

const LINES: Record<
  BankLanguage,
  {
    ask: (e: string) => string;
    look: string;
    boost: (a: number, b: number, op: Op) => string;
    step: (a: number, b: number, op: Op) => string;
  }
> = {
  pl: {
    ask: (e) => `Ile to jest ${e}?`,
    look: "Spójrz jeszcze raz na obie liczby i na znak między nimi.",
    boost: (a, b, op) =>
      op === "+" ? `Zacznij od ${a} i dolicz ${b}.` : `Zacznij od ${a} i odlicz ${b}.`,
    step: (a, b, op) => (op === "+" ? `${a} i jeszcze ${b}.` : `${a} bez ${b}.`),
  },
  uk: {
    ask: (e) => `Скільки буде ${e}?`,
    look: "Подивися ще раз на обидва числа і на знак між ними.",
    boost: (a, b, op) =>
      op === "+" ? `Почни з ${a} і додай ${b}.` : `Почни з ${a} і відлічи ${b}.`,
    step: (a, b, op) => (op === "+" ? `${a} і ще ${b}.` : `${a} без ${b}.`),
  },
  en: {
    ask: (e) => `What is ${e}?`,
    look: "Look again at both numbers and the sign between them.",
    boost: (a, b, op) =>
      op === "+" ? `Start at ${a} and count on ${b}.` : `Start at ${a} and count back ${b}.`,
    step: (a, b, op) => (op === "+" ? `${a} and ${b} more.` : `${a} take away ${b}.`),
  },
};

function enter(expression: string, answer: number) {
  return {
    family: "enter",
    data: {
      input: "number",
      entry: "keypad",
      figure: { kind: "expression", text: `${expression} = ?` },
    },
    key: { accept: [String(answer)] },
  };
}

/** A choose question: the expression, and 3 numbers to pick from, the answer at `at`. */
function choose(expression: string, answer: number, at: number) {
  const others = [answer + 1, answer > 1 ? answer - 1 : answer + 2];
  const numbers = [...others.slice(0, at % 3), answer, ...others.slice(at % 3)];
  const options = numbers.map((n, i) => ({
    id: `o${i + 1}`,
    content: { kind: "number", number: n },
  }));
  return {
    family: "choose",
    data: { stem: { text: `${expression} = ?` }, options, select: "one", layout: "grid" },
    key: { correct: [`o${(at % 3) + 1}`] },
  };
}

function questionOf(set: FixtureSet, index: number, language: BankLanguage): BankQuestion | null {
  const pair = set.pairs[index];
  if (pair === undefined) return null;
  const [a, b] = pair;
  const lines = LINES[language];
  const answer = set.op === "+" ? a + b : a - b;
  const expression = `${a} ${set.op} ${b}`;
  // The twin swaps an addition's numbers, and moves a subtraction's by one: another answer.
  const [ta, tb] = set.op === "+" ? [b, a] : [a + 1, b];
  const twinAnswer = set.op === "+" ? answer : ta - tb;
  const twinExpression = `${ta} ${set.op} ${tb}`;
  const picked = set.question_type === "recognition";
  return {
    source: `authored:${set.set_id.replace(/^set_/, "")}-${index + 1}`,
    set_id: set.set_id,
    subject: "math",
    question_type: set.question_type,
    skill_ids: [set.skill],
    say: lines.ask(expression),
    question: {
      ...(picked ? choose(expression, answer, index) : enter(expression, answer)),
      help: {
        look: { text: lines.look },
        boost: { text: lines.boost(a, b, set.op) },
        almost: [lines.step(a, b, set.op), `${expression} = □`],
        worked: [lines.step(a, b, set.op), `${expression} = ${answer}`],
        twin: {
          say: lines.ask(twinExpression),
          ...(picked
            ? choose(twinExpression, twinAnswer, index + 1)
            : enter(twinExpression, twinAnswer)),
        },
      },
    },
  };
}

/** How well a set meets a query: its words found in the need, and its skills asked for. */
function score(set: FixtureSet, query: BankQuery): number {
  const need = (query.words ?? "").toLowerCase();
  const words = set.words.filter((w) => need.includes(w)).length;
  const bare = (s: string) =>
    s.startsWith(PROPOSED_SKILL_MARK) ? s.slice(PROPOSED_SKILL_MARK.length) : s;
  const skills = query.skills.filter((s) => bare(s) === bare(set.skill)).length;
  const grade = set.grades.includes(query.grade) ? 1 : 0;
  return 2 * (words + 2 * skills) + grade;
}

function ranked(query: BankQuery): FixtureSet[] {
  return SETS.map((set, order) => ({ set, order, score: score(set, query) }))
    .sort((x, y) => y.score - x.score || x.order - y.order)
    .map((r) => r.set);
}

/**
 * A bank of made-up questions for the dev page and the tests: 3 sets, adding and subtracting
 * within 20 typed in (`production`) and adding within 20 picked from 3 numbers (`recognition`), for
 * grades 1 and 2, in pl, uk and en. A need or a grade it cannot place still gets a set, the adding
 * one first, so the dev page always has a lesson to show; `why_found` says so.
 */
export function fixtureBank(): BankPort {
  return {
    search: (query) =>
      Promise.resolve({
        sets: ranked(query)
          .filter((set) => typeKept(set.question_type, query.question_types))
          .slice(0, query.limit)
          .map((set) => ({
            set_id: set.set_id,
            title: set.title[query.language],
            grades: set.grades,
            skills: [set.skill],
            questions: set.pairs.length,
            question_types: [set.question_type],
            why_found:
              score(set, query) > 1
                ? "its words or skill meet the need"
                : "the fixture bank's default: nothing in it meets the need better",
          })),
      }),
    sources: (query) => {
      const kept = (set: FixtureSet) => typeKept(set.question_type, query.question_types);
      const named = query.sets ?? [];
      const from =
        named.length > 0
          ? named.map((id) => SETS.find((set) => set.set_id === id))
          : ranked(query).filter(kept).slice(0, 1);
      const out: BankQuestion[] = [];
      for (const set of from) {
        if (set === undefined) throw new Error("the fixture bank holds no such set");
        if (!kept(set)) continue;
        for (let i = 0; i < set.pairs.length && out.length < query.limit; i += 1) {
          const question = questionOf(set, i, query.language);
          if (question !== null) out.push(question);
        }
      }
      return Promise.resolve(out);
    },
    types: (grade) => {
      const counts = new Map<string, number>();
      const sets = new Map<string, number>();
      for (const set of SETS.filter((s) => s.grades.includes(grade))) {
        counts.set(set.question_type, (counts.get(set.question_type) ?? 0) + set.pairs.length);
        sets.set(set.question_type, (sets.get(set.question_type) ?? 0) + 1);
      }
      return Promise.resolve(
        [...counts]
          .map(([question_type, ready]) => ({
            question_type,
            family: familyOf(QuestionType.parse(question_type)),
            sets: sets.get(question_type) ?? 0,
            ready,
          }))
          .sort((x, y) => y.ready - x.ready),
      );
    },
  };
}
