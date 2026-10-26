# apps/cli

`jw`, the jadwigo CLI in Python and Click; later `jw mcp serve`.

- **Not here:** TypeScript. Its `package.json` exists only so turbo runs its tests.
- **Owner:** the ai-workflows workstream (`docs/workstreams/ai-workflows.md`). **Filled by:** `dl-5ssh.34.7` fills it.
- **Imports:** nothing of ours; it talks to the API over HTTP.
- **Test:** `cd apps/cli && uv run --frozen pytest -q`

## Rules here

- Its own uv project: `cd apps/cli && uv run pytest -q`.
- Commands are named `jw <record> <verb>`.
- Pin dependencies exact in `pyproject.toml`, each with a comment naming what needs it.
