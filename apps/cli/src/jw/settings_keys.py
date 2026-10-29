"""The environment variables jw reads: one home for each name and its default.

Moved from david-learns src/dl/settings_keys.py, keeping only the question bank's names. Values are
read at call time, so a test changes one with `monkeypatch.setenv`.

How `jw question` and `jw mcp serve` find the bank (jadwigo-question-bank/decisions/2026-10-28-
callers-reach-the-bank-only-through-apps-api-which-invokes-the-b), first match wins:

1. `JW_API_URL` in the environment: POST `<JW_API_URL>/api/v1/question-searches`, with
   `JW_BANK_READ_TOKEN` as the bearer token.
2. `JW_BANK_URL` in the environment: POST `<JW_BANK_URL>/questions/search`, the bank's own route,
   with `JW_BANK_TOKEN`. A fallback for the lead's checks until the /api/v1 route is deployed.
3. Neither set: the same 2 pairs, read from the mode-600 file `~/.config/jadwigo-bank/bank.env`
   (dl-e8ov.5.2.26), so an MCP registration carries no token. A URL and its token always come
   from one place: a URL in the environment never picks up the file's token.
"""

from __future__ import annotations

from pathlib import Path

# ---- the platform route (apps/api) ----

JW_API_URL = "JW_API_URL"  # the API's base URL; the client adds /api/v1/question-searches
JW_BANK_READ_TOKEN = "JW_BANK_READ_TOKEN"  # the bearer read token the route authorizes
API_SEARCH_PATH = "/api/v1/question-searches"  # ROUTES.questionSearches in packages/contracts

# ---- the bank's own route (fallback) ----

JW_BANK_URL = "JW_BANK_URL"  # the bank's search service: <JW_BANK_URL>/questions/search
JW_BANK_TOKEN = "JW_BANK_TOKEN"  # sent as a bearer token when set; never in a degraded detail
BANK_SEARCH_PATH = "/questions/search"

# ---- where the pair comes from when the environment has neither URL ----

JW_BANK_ENV_FILE = "JW_BANK_ENV_FILE"  # a file in place of DEFAULT_BANK_ENV_FILE (tests)
DEFAULT_BANK_ENV_FILE = Path.home() / ".config" / "jadwigo-bank" / "bank.env"

# Seconds one search may take before it comes back degraded.
JW_BANK_TIMEOUT_SECS = "JW_BANK_TIMEOUT_SECS"
DEFAULT_BANK_TIMEOUT_SECS = 10.0
# A local checkout of the bank repo (or a folder of its set pages) that `jw question show` and the
# draw read set pages from. The search route returns rows, not pages, and no page route exists yet.
JADWIGO_BANK_DIR = "JADWIGO_BANK_DIR"

# ---- converted items, read by `jw question item` and the question_item tool (dl-e8ov.5.38.2) ----

# The converted Khan items file, outside git. Unset: DEFAULT_KHAN_DIR/converted-pl.json when it
# exists, else DEFAULT_KHAN_DIR/converted.json.
JW_KHAN_CONVERTED = "JW_KHAN_CONVERTED"
DEFAULT_KHAN_DIR = Path.home() / "projects" / "david-learns" / "media" / "khan"  # the parsed pull
