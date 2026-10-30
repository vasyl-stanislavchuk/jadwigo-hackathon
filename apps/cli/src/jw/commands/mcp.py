"""jw mcp serve: the question and lesson tools over MCP on stdio (dl-u1y5.23, moved from dl-e8ov.5.2.8).

Eight tools, each calling the function its `--json` verb prints, so a tool's JSON is the verb's
JSON: question_search (`jw question search --json`), question_show (`jw question show --json`),
question_gaps (`jw question gaps --json`), question_item (`jw question item --json`, read
from JW_KHAN_CONVERTED, dl-e8ov.5.38.2), lesson_draft (`jw lesson draft --json`), lesson_check
(`jw lesson check --json`, which runs check.ts in JADWIGO_REPO_DIR, dl-e8ov.5.38.4), and
lesson_edit and lesson_show (`jw lesson edit --json`, `jw lesson show`: one step changed by a JSON
merge patch and checked, or shown as it stands, dl-a38n.29). A draft is
kept on the server's machine under a draft_id, so neither lesson tool sends the whole draft
through the client's tool-result limit (dl-e8ov.5.38.10), and both write it as a lesson file,
<draft_id>.json, with its check, <draft_id>.check.json, into JADWIGO_DRAFTS_DIR on every call
(dl-a38n.16). lesson_check and lesson_edit also return the page's own render findings,
<draft_id>.render.json, when the lesson builder's page has written one (dl-a38n.28). The server
finds the bank the way the verbs do (`jw.settings_keys`: JW_API_URL, then JW_BANK_URL, then
~/.config/jadwigo-bank/bank.env) and reads pages from JADWIGO_BANK_DIR. Registration lines for
Claude Code, Muse Code and Codex are in apps/cli/README.md.

Built on the `mcp` package, 2.x (`mcp.server.mcpserver.MCPServer`, FastMCP's new name).
"""

from __future__ import annotations

from typing import Any

import click

from jw import lesson, lesson_edit
from jw.commands import question
from jw.errors import JwError

TOOLS = (
    "question_search",
    "question_show",
    "question_gaps",
    "question_item",
    "lesson_draft",
    "lesson_check",
    "lesson_edit",
    "lesson_show",
)


def build_server() -> Any:
    """The MCP server with the eight tools. Imported lazily: only `serve` pays for it."""
    from mcp.server.mcpserver import MCPServer
    from mcp.server.mcpserver.exceptions import ToolError

    server = MCPServer(
        name="jadwigo",
        instructions=(
            "Jadwigo's question bank and lesson drafts. To make a lesson from a parent's request: "
            "call lesson_draft, which copies each drawn question whole from the bank, its help "
            "included, keeps the draft under a draft_id and writes it to draft_path. Write only what each question's "
            "you_write lists (the twin, boost_by_mistake for its mistake_classes, a rung the copy "
            "leaves empty), in the lesson's language, and change a copied part only when the "
            "parent asks. Then call lesson_check with the draft_id and those words by step id, and "
            "fix what its findings list by step id until it answers ok with a card and a "
            "lesson_file. Each call rewrites the draft file, so the lesson can be watched as it "
            "is built. To change one step after that, read it with lesson_show and patch it with "
            "lesson_edit, which answers with that step's findings and card. "
            "The lesson plays only after the import the card's next step names. "
            "question_search, question_show, question_gaps and question_item look "
            "into the bank directly: sets that meet a need, one set's page, needs it cannot meet, "
            "one item."
        ),
    )

    def _call(fn: Any, **kwargs: Any) -> dict[str, Any]:
        try:
            result: dict[str, Any] = fn(**kwargs)
        except JwError as exc:
            hint = f" ({exc.hint})" if exc.hint else ""
            # ToolError: the client reads the message; any other exception stays on the server.
            raise ToolError(f"{exc}{hint}") from exc
        return result

    @server.tool(name="question_search")
    def question_search(
        grade: str,
        words: str | None = None,
        words_en: str | None = None,
        skills: list[str] | None = None,
        mistakes: list[str] | None = None,
        language: str = "pl",
        limit: int = 20,
        arm: str | None = None,
        stage: str | None = None,
    ) -> dict[str, Any]:
        """Search the bank for question sets that meet a need; the bank's search envelope.

        grade is the bare grade number ("3"); words is the need in plain words in `language`
        (pl, en or uk). arm and stage reach only the bank's own route (JW_BANK_URL); the /api/v1
        route answers stage final with every arm.
        """
        return _call(
            question.search_envelope,
            grade=grade,
            words=words,
            words_en=words_en,
            skills=skills or [],
            mistakes=mistakes or [],
            language=language,
            limit=limit,
            arm=arm,
            stage=stage,
        )

    @server.tool(name="question_show")
    def question_show(set_id: str) -> dict[str, Any]:
        """One question set page by its id (a `set_...` id from a search row)."""
        return _call(question.show_page, set_id=set_id)

    @server.tool(name="question_gaps")
    def question_gaps(
        grade: str,
        words: list[str] | None = None,
        skills: list[str] | None = None,
        language: str = "pl",
        arm: str | None = None,
    ) -> dict[str, Any]:
        """Search each need once (one per words, one per skill) and say which find nothing."""
        return _call(
            question.gaps_report,
            grade=grade,
            words=words or [],
            skills=skills or [],
            language=language,
            arm=arm,
        )

    @server.tool(name="question_item")
    def question_item(item_id: str, language: str = "pl") -> dict[str, Any]:
        """One converted item by its id: the composer's view, never shown to a child.

        Returns the family step a lesson file's question takes (family, data, key, help), the
        say line, the credit and based_on (`khan:<id>`). The key and help are in it, so use it to
        draft a lesson and never paste it where a child reads. language is the item's language
        (pl by default); an item in another language is an error.
        """
        return _call(question.item_view, item_id=item_id, language=language)

    @server.tool(name="lesson_draft")
    def lesson_draft(
        request: str,
        grade: str,
        names: list[str],
        topic: str,
        language: str = "pl",
        kind: str = "practice",
        count: int | None = None,
        skills: list[str] | None = None,
    ) -> dict[str, Any]:
        """Draft a lesson for a parent's request: questions drawn from the bank and copied whole.

        request is the parent's words ("6 zadań z mnożenia, klasa 3"); names is required: pass
        every name the family uses in the request (the child's, siblings', the parent's), or []
        when there is none; the tool replaces them before anything leaves the machine. topic is
        required: what the lesson is about in a few words, distilled from the request, with no
        count, grade or name ("mnożenie", "dodawanie do 100"); the bank searches these words,
        and the request is kept as the draft's record and title. grade the bare grade number; kind practice, review, check or diagnostic; count overrides the draw
        rule's count. Each question is copied whole from the bank (family, data, key, say,
        pictures, and the source's hints and worked lines as its help), so the lesson plays as
        copied. The draft stays on this machine under draft_id; the result is a slim view of it.
        Per question: step_id, prompt, data (pictures without their labels), key, copied_help
        (the hints as text with their picture alts), rungs (what fills look, boost, almost and
        worked), you_write (what is left for you), mistake_classes (the keys boost_by_mistake
        may use; null when unknown) and why_drawn. left_out says why each set or item was not
        used, and rule_settled is false (the draw rules are provisional). draft_path is the
        lesson file as copied, written in JADWIGO_DRAFTS_DIR before the call returns, with its
        check beside it. Write what you_write lists, in the lesson's language, then call
        lesson_check with the draft_id.
        """
        return _call(
            lesson.draft,
            request=request,
            grade=grade,
            names=names,
            topic=topic,
            language=language,
            kind=kind,
            count=count,
            skills=skills or [],
        )

    @server.tool(name="lesson_check")
    def lesson_check(
        draft_id: str,
        help: dict[str, dict[str, Any]],
        title: str | None = None,
        reasoning: str | None = None,
        names: list[str] | None = None,
    ) -> dict[str, Any]:
        """Check a draft with your words on it, and return the card a parent reads.

        draft_id is the one lesson_draft returned. help maps each step_id to your words for that
        question, only what the bank lacks: twin (a question from the same template with its
        own say, data and key), boost_by_mistake ({mistake class: {"text"}}, keys from the
        step's mistake_classes), and a rung the copy leaves empty (look and boost as {"text"},
        almost and worked as lists of lines). To change a copied part, only when the parent asks,
        add changes: [{"change": numbers, context, wording or tutor_notes, "why", "set": {path:
        value}}], where a path is say, or a dotted path under data, key, hints, worked or almost
        ("hints.0.text"); each change is recorded in based_on.changes. Send every step's words
        on each call. title and reasoning replace the draft's; pass names as for lesson_draft,
        and the tool replaces them in both before the draft is written. Every call rewrites the draft file
        (draft_path) with your words as far as they go, and writes its check beside it. ok true
        returns the card (per question: prompt, key, rungs, twin, source, licence, changes, why
        drawn; and what was left out, and next: the import step), the lesson_file path,
        import_command, play_path and lesson_id. The play_path exists only after the import: tell
        the parent to run import_command (make lesson-import FILE=<lesson_file> ENV=dev, in the
        jadwigo checkout) first, then open the play_path. findings lists each problem: step_id,
        path, level (error or warn), rule, text and fix; ok is false while one is an error. Fix
        those and call lesson_check again.
        """
        return _call(
            lesson.check,
            draft_id=draft_id,
            words=help,
            title=title,
            reasoning=reasoning,
            names=names or [],
        )

    @server.tool(name="lesson_edit")
    def lesson_edit_tool(
        draft_id: str,
        step_id: str,
        patch: dict[str, Any],
        why: str | None = None,
        change: str = lesson_edit.CHANGE_DEFAULT,
    ) -> dict[str, Any]:
        """Change one step of a draft and get that step's findings back, without resending the rest.

        patch is a JSON merge patch on the step as lesson_show returns it: an object merges into
        what is there, null removes a part, anything else replaces it. It may set say and
        question's data, key and help (look, boost, almost, worked, hints, boost_by_mistake and
        twin, under question.help). A change to a part the bank's copy has (say, data, key, hints,
        worked, a copied almost) needs why, the parent's ask; it is recorded in based_on.changes
        with change (numbers, context, wording or tutor_notes; wording by default). A rung, twin
        or mistake card you write needs no why. The draft file is rewritten, check.ts runs on the
        whole lesson and its check file is rewritten. Returns ok (no error for this step),
        step_id, findings for this step only, render (the page's findings for it from its last
        draw, stale when drawn before this write; null without the page), the step's card,
        lesson_ok (the whole lesson's check) and draft_path. A lesson_check call rebuilds every
        step from the words it is sent, replacing these edits.
        """
        return _call(
            lesson_edit.edit,
            draft_id=draft_id,
            step_id=step_id,
            patch=patch,
            why=why,
            change=change,
        )

    @server.tool(name="lesson_show")
    def lesson_show(draft_id: str, step_id: str | None = None) -> dict[str, Any]:
        """The draft as it stands: one step (step_id) or every step, as the lesson file holds it.

        Returns draft_id, draft_path, title, steps (each the step and its findings from the last
        check) and render (the page's findings from its last draw, null without the page). Read
        a step here before you patch it with lesson_edit.
        """
        return _call(lesson_edit.show, draft_id=draft_id, step_id=step_id)

    return server


@click.group()
def group() -> None:
    """MCP server: serve."""


@group.command()
def serve() -> None:
    """Serve the question and lesson tools over MCP on stdio."""
    build_server().run("stdio")
