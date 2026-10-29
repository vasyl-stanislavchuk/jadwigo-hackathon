/**
 * The question the System page's stage draws: the recognition showcase (6 × 8 among four numbers)
 * from the playground's written examples, read from the API in the page's language. Its states come from the
 * example's written scenarios: a pick shows the outcome and marks of the scenario that committed
 * it, so nothing here is judged.
 */

import {
  ChooseData,
  ChooseValue,
  type OptionContent,
  type PartMark,
  Help as WrittenHelp,
} from "@jadwigo/contracts";
import type { Language } from "@jadwigo/copy";
import { examplesFor, type WrittenExample, type WrittenScenario } from "../../examples/index.ts";
import { resolve } from "../../localize.ts";

/** The recognition showcase among the examples read. */
export function stageExample(examples: readonly WrittenExample[]): WrittenExample {
  const example = examplesFor(examples, "recognition")[0];
  if (example === undefined)
    throw new Error("the recognition question type has no written example");
  return example;
}

interface StageOption {
  id: string;
  content: string;
}

/** What a scenario shows once its pick is checked. */
interface StageOutcome {
  outcome: WrittenScenario["outcome"];
  marks: readonly PartMark[];
}

export interface StageQuestion {
  say: string;
  stem: ChooseData["stem"];
  options: readonly StageOption[];
  /** The help cards as written, look then boost. */
  rungs: readonly string[];
  /** The pick of the written right scenario, and of the first written miss. */
  right: string;
  miss: string;
  /** The scenario that committed this pick, or null when none was written for it. */
  outcomeOf(id: string): StageOutcome | null;
}

function shown(content: OptionContent): string {
  switch (content.kind) {
    case "number":
      return String(content.number);
    case "text":
      return content.text;
    default:
      return "";
  }
}

/** The one option a scenario picked. */
const pickOf = (scenario: WrittenScenario): string | null =>
  ChooseValue.parse(scenario.value).chosen[0] ?? null;

export function stageQuestion(example: WrittenExample, language: Language): StageQuestion {
  const { question, scenarios } = example;
  const data = ChooseData.parse(resolve(question.data, language));
  const help = WrittenHelp.parse(resolve(question.help ?? {}, language));
  const played = scenarios.filter((s) => s.only === undefined || s.only.includes(language));
  const right = played.find((s) => s.outcome === "correct");
  const miss = played.find((s) => s.outcome === "incorrect");
  const rightPick = right === undefined ? null : pickOf(right);
  const missPick = miss === undefined ? null : pickOf(miss);
  if (rightPick === null || missPick === null)
    throw new Error(`${example.id} needs a written right and a written miss`);
  return {
    say: resolve<string>(question.say, language),
    stem: data.stem,
    options: data.options.map((o) => ({ id: o.id, content: shown(o.content) })),
    rungs: [help.look?.text, help.boost?.text].filter((t): t is string => t !== undefined),
    right: rightPick,
    miss: missPick,
    outcomeOf: (id) => {
      const s = played.find((p) => pickOf(p) === id);
      return s === undefined ? null : { outcome: s.outcome, marks: s.marks };
    },
  };
}
