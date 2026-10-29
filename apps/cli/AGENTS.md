# apps/cli

`jw`, the jadwigo CLI in Python and Click: `jw question search|show|gaps` and `jw mcp serve` (README.md).

- **Not here:** TypeScript. Its `package.json` exists only so turbo runs its tests.
- **Owner:** the ai-workflows workstream (`docs/workstreams/ai-workflows.md`). **Filled by:** `dl-5ssh.34.7` fills it.
- **Imports:** nothing of ours; it talks to the API over HTTP. The bank schemas in `src/jw/contracts/` are copies, each naming its bank commit.
- **Test:** `cd apps/cli && uv run --frozen pytest -q`

## Rules here

- Its own uv project: `cd apps/cli && uv run pytest -q`.
- Commands are named `jw <record> <verb>`.
- Pin dependencies exact in `pyproject.toml`, each with a comment naming what needs it.
- No test reads `~/.config/jadwigo-bank/` or calls a model: `tests/conftest.py` and the fake `muse` see to it.
- A change to an MCP tool (name, docstring, arguments, return) changes `mcp-tools.json` in the same
  PR: `JW_UPDATE_SNAPSHOTS=1 uv run --frozen pytest -q tests/test_mcp_snapshot.py`. The docs site
  reads it; a two-way door.
