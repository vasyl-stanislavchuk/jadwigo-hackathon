/**
 * Where the verbs read questions from (Lead decision 10): `question_search` asks it for sets, and
 * `lesson_draft` for the questions it copies whole into a draft. The runner never calls it. The
 * real bank's adapter waits on the bank's service; wave 1 runs `fixtureBank`.
 */

export type BankLanguage = "pl" | "uk" | "en";

export interface BankQuery {
  /** The bare grade number, "1". */
  grade: string;
  /** The need in plain words, in `language`. */
  words: string | null;
  language: BankLanguage;
  skills: readonly string[];
  limit: number;
}

/** One question set as a search row: what the model reads to choose. */
interface BankSet {
  set_id: string;
  title: string;
  grades: readonly string[];
  skills: readonly string[];
  questions: number;
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
  /** The questions of the set that best meets the query, at most `query.limit`, in set order. */
  sources(query: BankQuery): Promise<readonly BankQuestion[]>;
}

// The fixture: made-up questions only. No bank content, no Khan item, no name (fences 8 and 9).

type Op = "+" | "-";

interface FixtureSet {
  set_id: string;
  op: Op;
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
    skill: "math.sub.within-20",
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
  return {
    source: `authored:${set.set_id.replace(/^set_/, "")}-${index + 1}`,
    set_id: set.set_id,
    subject: "math",
    question_type: "production",
    skill_ids: [set.skill],
    say: lines.ask(expression),
    question: {
      ...enter(expression, answer),
      help: {
        look: { text: lines.look },
        boost: { text: lines.boost(a, b, set.op) },
        almost: [lines.step(a, b, set.op), `${expression} = □`],
        worked: [lines.step(a, b, set.op), `${expression} = ${answer}`],
        twin: { say: lines.ask(twinExpression), ...enter(twinExpression, twinAnswer) },
      },
    },
  };
}

/** How well a set meets a query: its words found in the need, and its skills asked for. */
function score(set: FixtureSet, query: BankQuery): number {
  const need = (query.words ?? "").toLowerCase();
  const words = set.words.filter((w) => need.includes(w)).length;
  const skills = query.skills.filter((s) => s === set.skill).length;
  const grade = set.grades.includes(query.grade) ? 1 : 0;
  return 2 * (words + 2 * skills) + grade;
}

function ranked(query: BankQuery): FixtureSet[] {
  return SETS.map((set, order) => ({ set, order, score: score(set, query) }))
    .sort((x, y) => y.score - x.score || x.order - y.order)
    .map((r) => r.set);
}

/**
 * A bank of made-up questions for the dev page and the tests: 2 sets, adding and subtracting
 * within 20, for grades 1 and 2, in pl, uk and en. A need or a grade it cannot place still gets a
 * set, the adding one first, so the dev page always has a lesson to show; `why_found` says so.
 */
export function fixtureBank(): BankPort {
  return {
    search: (query) =>
      Promise.resolve({
        sets: ranked(query)
          .slice(0, query.limit)
          .map((set) => ({
            set_id: set.set_id,
            title: set.title[query.language],
            grades: set.grades,
            skills: [set.skill],
            questions: set.pairs.length,
            why_found:
              score(set, query) > 1
                ? "its words or skill meet the need"
                : "the fixture bank's default: nothing in it meets the need better",
          })),
      }),
    sources: (query) => {
      const best = ranked(query)[0];
      if (best === undefined) return Promise.resolve([]);
      const count = Math.min(query.limit, best.pairs.length);
      const questions = Array.from({ length: count }, (_, i) =>
        questionOf(best, i, query.language),
      ).filter((q): q is BankQuestion => q !== null);
      return Promise.resolve(questions);
    },
  };
}
