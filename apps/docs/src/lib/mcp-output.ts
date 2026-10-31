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
    says: "`version` 1, and in `needs` one row per need asked: the `need`, a `verdict` (`found`, `gap` or `degraded`), `rows` (how many sets came back), `top` (the first 3 set ids) and `state` (the arms that were asked). `gaps` and `degraded` count the rows with that verdict. A need is `degraded` when no arm could be asked, which is not a gap. A need whose every found set has no lesson-ready item in its language is a gap too, with `reason` (`no item is lesson-ready in <lang>`, then, when the converted files can say, `; most: <cause>, <n> of <m> items (<bead>)`: the cause most of those sets' items share and the bead fixing it) and `not_ready`, the ids of those sets.",
    schema: { name: "Need", covers: "the shape of each row's `need`", schema: Need },
  },
  question_item: {
    says: "One item, the composer's view: `id`, `language`, `family`, `problem_type`, `question_type`, the `say` line, the `question` (its family's `data` and `key`, and the item's `help`), the `credit`, `based_on` (`khan:<id>`) and the `course` titles it sits under. It carries the key, so never show it to a child. Only a lesson-ready item comes back; any other is an error that says why (`renders wrong: <rule>`, `not checked`, `flagged: <reason>` or the converter's own reason).",
    schema: {
      name: "FamilyQuestion",
      covers: "the shape of `question` without its `help`",
      schema: FamilyQuestion,
    },
  },
  lesson_draft: {
    says: "A slim view of the draft, which stays on the server's machine: the `draft_id` to pass to `lesson_check`, the `request` with names replaced, the `need` sent to the bank (its `words` are the topic), `grade`, `language`, `kind`, the draw `rule` and `rule_settled` (false while the draw rules are provisional), the lesson's `title` and `reasoning`, `plays_as_copied` (whether the copy passed the import's check, null when it could not run) with its `copy_errors`, the drawn `questions` (lesson-ready items only), `left_out` with a reason for each set or item not used (`renders wrong: <rule>`, `not checked`, `flagged: <reason>`, the converter's own, or `no item is lesson-ready in <lang>`), and `draft_path`, the lesson file as copied, written in `JADWIGO_DRAFTS_DIR` before the call returns. Each question carries its `step_id`, `prompt`, `data` (pictures without their labels), `key`, `copied_help` (the source's hints as text, with their picture alts), `rungs` (what fills look, boost, almost and worked), `you_write` (what is left for you), `mistake_classes` (the keys `boost_by_mistake` may use, null when unknown) and `why_drawn`.",
  },
  lesson_check: {
    says: "With `ok` true: the `card` a parent reads (per question its prompt, key, rungs, twin, source, licence, the `changes` made to the bank's copy and why it was drawn, what was left out, and `next`, the import step), `findings` (warnings only), the `lesson_file` and `draft_path` paths (the same file, rewritten on every call), the `import_command` to run first, then the `play_path` (which exists only after the import), `lesson_id` and `questions`. Both carry `render`: the page's own findings from drawing the draft, with `rendered_at` and `stale`, or null when no page has drawn it. With `ok` false: `findings`, each a `step_id`, `path`, `level` (`error` or `warn`), `rule`, `text` and `fix`; the old `errors`, each a `step_id` and a `message`, for one release; and both paths.",
  },
  lesson_edit: {
    says: "One step's answer: `ok` (no error finding for this step), `step_id`, `findings` for this step only, `render` (the page's findings for it from its last draw, with `rendered_at` and `stale`, or null), the step's `card` (its prompt, key, rungs, twin, source, licence, changes and why it was drawn), `lesson_ok` (the check's answer for the whole lesson, null when the patch was refused) and `draft_path`. A refused patch changes nothing and comes back as findings with rule `edit`.",
  },
  lesson_show: {
    says: "The draft file as it stands: `draft_id`, `draft_path`, `title`, and `steps`, each the `step` as the lesson file holds it (its `say`, `question` with `data`, `key` and `help`, `based_on` and `credit`) with its `findings` from the last check, and `render`, the page's findings from its last draw or null.",
  },
};
