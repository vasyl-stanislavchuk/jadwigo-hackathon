"""jw mcp serve: the question tools over MCP on stdio (dl-u1y5.23, moved from dl-e8ov.5.2.8).

Four tools, each calling the function its `--json` verb prints, so a tool's JSON is the verb's
JSON: question_search (`jw question search --json`), question_show (`jw question show --json`),
question_gaps (`jw question gaps --json`) and question_item (`jw question item --json`, read
from JW_KHAN_CONVERTED, dl-e8ov.5.38.2). The server finds the bank the way the verbs do
(`jw.settings_keys`: JW_API_URL, then JW_BANK_URL, then ~/.config/jadwigo-bank/bank.env) and reads
pages from JADWIGO_BANK_DIR. Registration lines for Claude Code, Muse Code and Codex are in
apps/cli/README.md.

Built on the `mcp` package, 2.x (`mcp.server.mcpserver.MCPServer`, FastMCP's new name).
"""

from __future__ import annotations

from typing import Any

import click

from jw.commands import question
from jw.errors import JwError

TOOLS = ("question_search", "question_show", "question_gaps", "question_item")


def build_server() -> Any:
    """The MCP server with the four question tools. Imported lazily: only `serve` pays for it."""
    from mcp.server.mcpserver import MCPServer
    from mcp.server.mcpserver.exceptions import ToolError

    server = MCPServer(
        name="jadwigo",
        instructions=(
            "Search the Jadwigo question bank for question sets that meet a learner's need, "
            "show one set's page, and list needs the bank cannot meet."
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

    return server


@click.group()
def group() -> None:
    """MCP server: serve."""


@group.command()
def serve() -> None:
    """Serve question_search, question_show, question_gaps and question_item over MCP on stdio."""
    build_server().run("stdio")
