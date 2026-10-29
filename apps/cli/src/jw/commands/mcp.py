"""jw mcp serve: the question and lesson tools over MCP on stdio (dl-u1y5.23, moved from dl-e8ov.5.2.8).

Six tools, each calling the function its `--json` verb prints, so a tool's JSON is the verb's
JSON: question_search (`jw question search --json`), question_show (`jw question show --json`),
question_gaps (`jw question gaps --json`), question_item (`jw question item --json`, read
from JW_KHAN_CONVERTED, dl-e8ov.5.38.2), lesson_draft (`jw lesson draft --json`) and lesson_check
(`jw lesson check --json`, which runs check.ts in JADWIGO_REPO_DIR, dl-e8ov.5.38.4). The server
finds the bank the way the verbs do (`jw.settings_keys`: JW_API_URL, then JW_BANK_URL, then
~/.config/jadwigo-bank/bank.env) and reads pages from JADWIGO_BANK_DIR. Registration lines for
Claude Code, Muse Code and Codex are in apps/cli/README.md.

Built on the `mcp` package, 2.x (`mcp.server.mcpserver.MCPServer`, FastMCP's new name).
"""

from __future__ import annotations

from typing import Any

import click

from jw import lesson
from jw.commands import question
from jw.errors import JwError

TOOLS = (
    "question_search",
    "question_show",
    "question_gaps",
    "question_item",
    "lesson_draft",
    "lesson_check",
)


def build_server() -> Any:
    """The MCP server with the six tools. Imported lazily: only `serve` pays for it."""
    from mcp.server.mcpserver import MCPServer
    from mcp.server.mcpserver.exceptions import ToolError

    server = MCPServer(
        name="jadwigo",
        instructions=(
            "Jadwigo's question bank and lesson drafts. To make a lesson from a parent's request: "
            "call lesson_draft, write every question's help (look, boost, boost_by_mistake, "
            "almost, worked and a twin) in the lesson's language, then call lesson_check with the "
            "whole draft and fix any errors it lists by step id until it answers ok with a card "
            "and a lesson_file. The tools never write a word a child reads; you do. "
            "question_search, question_show, question_gaps and question_item look into the bank "
            "directly: sets that meet a need, one set's page, needs it cannot meet, one item."
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
        language: str = "pl",
        kind: str = "practice",
        count: int | None = None,
        skills: list[str] | None = None,
    ) -> dict[str, Any]:
        """Draft a lesson for a parent's request: questions drawn from the bank, help left empty.

        request is the parent's words ("6 zadań z mnożenia, klasa 3"); grade the bare grade
        number; kind practice, review, check or diagnostic; count overrides the draw rule's count.
        Each question carries its family step, key, the source item's hints and worked lines as
        `material`, credit, based_on and why it was drawn; left_out says why each set or item was
        not used, and rule_settled is false (the draw rules are provisional). You write each
        question's `help` in the lesson's language: look and boost as {"text"} cards,
        boost_by_mistake as {mistake class: {"text"}}, almost and worked as lists of lines (almost
        is worked with its last line left blank), and twin as a question from the same template
        with its own say, data and key. Then call lesson_check with the whole draft.
        """
        return _call(
            lesson.draft,
            request=request,
            grade=grade,
            language=language,
            kind=kind,
            count=count,
            skills=skills or [],
        )

    @server.tool(name="lesson_check")
    def lesson_check(draft: dict[str, Any]) -> dict[str, Any]:
        """Check a draft whose help you have written, and return the card a parent reads.

        Pass the whole draft lesson_draft returned, with every question's help filled. It is
        assembled into a lesson file and checked as the import would check it. ok true returns
        the card (per question: prompt, key, rungs, twin, source, licence, why drawn; and what was
        left out), the lesson_file path, play_path and lesson_id. ok false lists errors by step
        id: fix those questions and call lesson_check again.
        """
        return _call(lesson.check, filled=draft)

    return server


@click.group()
def group() -> None:
    """MCP server: serve."""


@group.command()
def serve() -> None:
    """Serve the question and lesson tools over MCP on stdio."""
    build_server().run("stdio")
