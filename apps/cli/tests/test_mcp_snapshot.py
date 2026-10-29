"""dl-u1y5.31: `jw mcp serve`'s tool list matches the committed apps/cli/mcp-tools.json.

A real MCP client (the `mcp` package's stdio client) lists the tools; each tool's name,
description, inputSchema and outputSchema, sorted by name, must equal the snapshot the docs site
renders one page per tool from. A changed tool fails here until the snapshot changes with it:
`JW_UPDATE_SNAPSHOTS=1 uv run --frozen pytest -q tests/test_mcp_snapshot.py` rewrites it, in the
repo's Biome format (pre-commit and `make check` hold the file to it), so the test compares the
parsed JSON, not the bytes.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import anyio
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

from jw.settings_keys import JW_BANK_ENV_FILE

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "mcp-tools.json"
BIOME = ROOT.parents[1] / "node_modules" / ".bin" / "biome"
JW = Path(sys.executable).with_name("jw")
FIELDS = {"name", "description", "input_schema", "output_schema"}


async def _listed_tools() -> list[dict[str, Any]]:
    params = StdioServerParameters(
        command=str(JW),
        args=["mcp", "serve"],
        env={JW_BANK_ENV_FILE: str(ROOT / "tests" / "no-bank.env")},
        cwd=str(ROOT),
    )
    async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
        await session.initialize()
        listed = await session.list_tools()
    tools = [
        t.model_dump(mode="json", by_alias=True, exclude_none=True, include=FIELDS)
        for t in listed.tools
    ]
    return sorted(tools, key=lambda t: t["name"])


def _write(tools: list[dict[str, Any]]) -> None:
    text = json.dumps({"tools": tools}, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    SNAPSHOT.write_text(text, encoding="utf-8")
    subprocess.run([str(BIOME), "format", "--write", str(SNAPSHOT)], check=True, cwd=ROOT)


def test_the_tool_list_matches_the_snapshot() -> None:
    tools = anyio.run(_listed_tools)
    if os.environ.get("JW_UPDATE_SNAPSHOTS") == "1":
        _write(tools)
    assert json.loads(SNAPSHOT.read_text(encoding="utf-8")) == {"tools": tools}, (
        "jw mcp serve's tools changed: run JW_UPDATE_SNAPSHOTS=1 uv run --frozen pytest -q "
        "tests/test_mcp_snapshot.py and commit apps/cli/mcp-tools.json"
    )
