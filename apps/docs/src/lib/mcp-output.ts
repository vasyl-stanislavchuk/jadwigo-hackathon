import { FamilyQuestion, Need, SearchEnvelope } from "@jadwigo/contracts";
import type { McpOutput } from "./mcp.ts";

/**
 * What each MCP tool returns. The server's own output schema says only "an object", so each
 * tool's shape is written here by hand, with the contracts schema it follows where there is one.
 * mcp-output.test.ts fails while a tool in mcp-tools.json has no line here.
 */
export const MCP_OUTPUT: Readonly<Record<string, McpOutput>> = {
  question_search: {
    says: "The bank's search envelope: question sets ranked best first in `rows`, and in `state` one row per arm saying how it answered.",
    schema: { name: "SearchEnvelope", covers: "the whole result", schema: SearchEnvelope },
  },
  question_show: {
    says: "One question set's public page, as the bank writes it: `id`, `subject`, `grade`, `languages`, `titles`, `description`, the problem and question types, the `families` its items play in, the `items` and the `enrichment` a pass added. It carries no key.",
  },
  question_gaps: {
    says: "`version` 1, and in `needs` one row per need asked: the `need`, a `verdict` (`found`, `gap` or `degraded`), `rows` (how many sets came back), `top` (the first 3 set ids) and `state` (the arms that were asked). `gaps` and `degraded` count the rows with that verdict. A need is `degraded` when no arm could be asked, which is not a gap.",
    schema: { name: "Need", covers: "the shape of each row's `need`", schema: Need },
  },
  question_item: {
    says: "One item, the composer's view: `id`, `language`, `family`, `problem_type`, `question_type`, the `say` line, the `question` (its family's `data` and `key`, and the item's `help`), the `credit`, `based_on` (`khan:<id>`) and the `course` titles it sits under. It carries the key, so never show it to a child.",
    schema: {
      name: "FamilyQuestion",
      covers: "the shape of `question` without its `help`",
      schema: FamilyQuestion,
    },
  },
  lesson_draft: {
    says: "The draft: the `request` with names replaced, the `need` sent to the bank, `grade`, `language`, `kind`, the draw `rule` and `rule_settled` (false while the draw rules are provisional), the drawn `questions` each with an empty `help` for you to write, `left_out` with a reason for each set or item not used, and the `lesson_file_skeleton`. Fill every question's `help` and pass the whole draft to `lesson_check`.",
  },
  lesson_check: {
    says: "With `ok` true: the `card` a parent reads (per question its prompt, key, rungs, twin, source, licence and why it was drawn, and what was left out), the `lesson_file` path, `play_path`, `lesson_id` and `questions`. With `ok` false: `errors`, each a `step_id` and a `message`, and the `lesson_file` path when the file was written.",
  },
};
