"""dl-e8ov.5.2.8: `jw mcp serve` lists the 3 question tools and answers with the verbs' JSON.

A real MCP client (the `mcp` package's stdio client) starts `jw mcp serve` as a child process,
against the fake bank the contract test uses and the fixture set pages.
"""

from __future__ import annotations

import json
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import anyio
import fake_bank
import pytest
from click.testing import CliRunner
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

from jw.cli import main as cli
from jw.commands.mcp import TOOLS
from jw.settings_keys import JADWIGO_BANK_DIR, JW_API_URL, JW_BANK_ENV_FILE

ROOT = Path(__file__).resolve().parents[1]
BANK_DIR = ROOT / "tests" / "fixtures" / "bank"
JW = Path(sys.executable).with_name("jw")



@pytest.fixture
def bank(monkeypatch: pytest.MonkeyPatch) -> Iterator[Any]:
    fake = fake_bank.FakeBank().start()
    monkeypatch.setenv(JW_API_URL, fake.url)
    monkeypatch.setenv(JADWIGO_BANK_DIR, str(BANK_DIR))
    yield fake
    fake.stop()


def _env(url: str) -> dict[str, str]:
    """The server's env: the fake bank, the fixture pages, and no real bank.env."""
    return {
        JW_API_URL: url,
        JADWIGO_BANK_DIR: str(BANK_DIR),
        JW_BANK_ENV_FILE: str(ROOT / "tests" / "no-bank.env"),
    }


def _verb(*args: str) -> Any:
    result = CliRunner().invoke(cli, [*args, "--json"])
    assert result.exit_code == 0, result.output
    return json.loads(result.output)


async def _session_calls(
    url: str, calls: list[tuple[str, dict[str, Any]]]
) -> tuple[list[str], list[Any]]:
    params = StdioServerParameters(
        command=str(JW),
        args=["mcp", "serve"],
        env=_env(url),
        cwd=str(ROOT),
    )
    async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        listed = await session.list_tools()
        names = sorted(t.name for t in listed.tools)
        answers = []
        for name, arguments in calls:
            result = await session.call_tool(name, arguments)
            assert not result.is_error, result.content
            text = "".join(getattr(c, "text", "") for c in result.content)
            answers.append(json.loads(text))
        return names, answers


def _without_timing(envelope: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in envelope.items() if k != "timing_ms"}


def test_serve_lists_the_three_tools_and_matches_the_verbs(bank: Any) -> None:
    calls = [
        ("question_search", {"grade": "3", "words": "dodawanie do 100"}),
        ("question_search", {"grade": "3", "words": "dodawanie do 100", "stage": "first"}),
        ("question_show", {"set_id": "set_khan_fx0001"}),
        ("question_gaps", {"grade": "3", "words": ["dodawanie do 100"], "skills": ["maths.x"]}),
    ]
    names, answers = anyio.run(_session_calls, bank.url, calls)

    assert names == sorted(TOOLS)
    search = _verb("question", "search", "--words", "dodawanie do 100", "--grade", "3")
    first = _verb(
        "question", "search", "--words", "dodawanie do 100", "--grade", "3", "--stage", "first"
    )
    show = _verb("question", "show", "set_khan_fx0001")
    gaps = _verb(
        "question", "gaps", "--words", "dodawanie do 100", "--skill", "maths.x", "--grade", "3"
    )
    assert _without_timing(answers[0]) == _without_timing(search)
    assert _without_timing(answers[1]) == _without_timing(first)
    assert answers[1]["stage"] == "first"
    assert answers[2] == show
    assert answers[3] == gaps


def test_a_tool_error_names_the_problem_and_its_hint(
    bank: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def call() -> Any:
        params = StdioServerParameters(
            command=str(JW),
            args=["mcp", "serve"],
            env=_env(bank.url),
            cwd=str(ROOT),
        )
        async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
            await session.initialize()
            return await session.call_tool("question_show", {"set_id": "set_khan_nope"})

    result = anyio.run(call)
    assert result.is_error
    text = "".join(getattr(c, "text", "") for c in result.content)
    assert "set_khan_nope" in text and "search` row" in text
