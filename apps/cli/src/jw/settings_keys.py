"""The settings jw reads: one home for each name, its default, and the one loader for all of them.

Values are read at call time, so a test changes one with `monkeypatch.setenv`.

`setting(name)` is the only way jw reads a key in `KEYS` (dl-n9fr.47). It takes the environment
first, then the operator's mode-600 file (`JW_BANK_ENV_FILE`, else
`~/.config/jadwigo-bank/bank.env`), then gives None so the caller applies the default named here.
It refuses a file other users can read, and no error or log line it writes carries a value.

How `jw question` and `jw mcp serve` find the bank (jadwigo-question-bank/decisions/2026-10-28-
callers-reach-the-bank-only-through-apps-api-which-invokes-the-b), first match wins:

1. `JW_API_URL` in the environment: POST `<JW_API_URL>/api/v1/question-searches`, with
   `JW_BANK_READ_TOKEN` as the bearer token.
2. `JW_BANK_URL` in the environment: POST `<JW_BANK_URL>/questions/search`, the bank's own route,
   with `JW_BANK_TOKEN`. A fallback for the lead's checks until the /api/v1 route is deployed.
3. Neither set: the same 2 pairs, read from the file (dl-e8ov.5.2.26), so an MCP registration
   carries no token. A URL and its token always come from one place: a URL in the environment
   never picks up the file's token. `jw.bank_client.endpoint` keeps that rule on top of the loader.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from jw.errors import JwError

log = logging.getLogger(__name__)

# ---- the platform route (apps/api) ----

JW_API_URL = "JW_API_URL"  # the API's base URL; the client adds /api/v1/question-searches
JW_BANK_READ_TOKEN = "JW_BANK_READ_TOKEN"  # the bearer read token the route authorizes
API_SEARCH_PATH = "/api/v1/question-searches"  # ROUTES.questionSearches in packages/contracts

# ---- the bank's own route (fallback) ----

JW_BANK_URL = "JW_BANK_URL"  # the bank's search service: <JW_BANK_URL>/questions/search
JW_BANK_TOKEN = "JW_BANK_TOKEN"  # sent as a bearer token when set; never in a degraded detail
BANK_SEARCH_PATH = "/questions/search"

# Seconds one search may take before it comes back degraded.
JW_BANK_TIMEOUT_SECS = "JW_BANK_TIMEOUT_SECS"
DEFAULT_BANK_TIMEOUT_SECS = 10.0

# ---- the operator's file ----

JW_BANK_ENV_FILE = "JW_BANK_ENV_FILE"  # a file in place of DEFAULT_BANK_ENV_FILE (tests)
DEFAULT_BANK_ENV_FILE = Path.home() / ".config" / "jadwigo-bank" / "bank.env"

# ---- local folders, each until a route replaces it ----

# A local checkout of the bank repo (or a folder of its set pages) that `jw question show` and the
# draw read set pages from. The search route returns rows, not pages, and no page route exists yet.
JADWIGO_BANK_DIR = "JADWIGO_BANK_DIR"
# Unset, `jw bank pull` clones BANK_REPO here and `bank_dir()` names it (dl-a38n.43).
DEFAULT_BANK_DIR = Path.home() / ".local" / "share" / "jadwigo" / "bank"
BANK_REPO = "https://github.com/vasyl-stanislavchuk/jadwigo-bank.git"

# The synced copy of the bank's Khan bucket. KHAN_SYNC_COMMAND, run in the bank repo, writes it in
# the pull's own layout, not the bucket's: the bucket's khan/converted/pl.json lands as
# converted-pl.json, and khan/converted/en.json as converted.json (TOP_FILES in jadwigo-bank
# tools/khan/sync.py), beside raw/, media/ and picks.json.
JADWIGO_KHAN_DIR = "JADWIGO_KHAN_DIR"
DEFAULT_KHAN_DIR = Path.home() / ".cache" / "jadwigo-bank" / "khan"
KHAN_SYNC_COMMAND = "uv run python -m tools.khan.sync down"

# The converted Khan items file, read by `jw question item` and the question_item tool
# (dl-e8ov.5.38.2). Unset: <JADWIGO_KHAN_DIR>/converted-pl.json, the Polish file the sync writes
# (dl-e8ov.5.38.8); converted.json beside it is the English one.
JW_KHAN_CONVERTED = "JW_KHAN_CONVERTED"
# The converted items file per language (dl-hin8.17). JW_KHAN_CONVERTED is Polish's old name,
# kept for one release; for English it still counts when it names no Polish conversion.
JW_KHAN_CONVERTED_PL = "JW_KHAN_CONVERTED_PL"
JW_KHAN_CONVERTED_EN = "JW_KHAN_CONVERTED_EN"
CONVERTED_EN_DEFAULT = Path("converted.json")  # relative to the Khan dir
CONVERTED_DEFAULT = Path("converted-pl.json")  # relative to the Khan dir

# The jadwigo-hackathon checkout whose packages/lesson-import/src/check.ts the lesson_check tool
# runs with bun (dl-e8ov.5.38.4). Unset: the checkout this jw was installed from (`repo_dir`).
JADWIGO_REPO_DIR = "JADWIGO_REPO_DIR"
LESSON_CHECK_SCRIPT = Path("packages") / "lesson-import" / "src" / "check.ts"  # in the repo

# Where lesson_draft and lesson_check write each draft as a lesson file, <draft_id>.json, and its
# check, <draft_id>.check.json, on every call (dl-a38n.16). The live lesson builder's page, its
# channel and its launcher (tools/builder/config.ts) read the same directory, so it has one rule on
# every side: the environment only, ~ expanded. It is not in KEYS: the operator's file never sets it.
JADWIGO_DRAFTS_DIR = "JADWIGO_DRAFTS_DIR"
DEFAULT_DRAFTS_DIR = Path.home() / ".local" / "state" / "jadwigo" / "drafts"

# Every key an operator may fill, in the order .env.example and the README list them.
KEYS = (
    JW_API_URL,
    JW_BANK_READ_TOKEN,
    JW_BANK_URL,
    JW_BANK_TOKEN,
    JW_BANK_TIMEOUT_SECS,
    JADWIGO_BANK_DIR,
    JADWIGO_KHAN_DIR,
    JW_KHAN_CONVERTED,
    JW_KHAN_CONVERTED_PL,
    JW_KHAN_CONVERTED_EN,
    JADWIGO_REPO_DIR,
)


def env_file() -> Path:
    """The operator's settings file: JW_BANK_ENV_FILE, else ~/.config/jadwigo-bank/bank.env."""
    return Path(os.environ.get(JW_BANK_ENV_FILE) or DEFAULT_BANK_ENV_FILE).expanduser()


def read_env_file(path: Path | None = None) -> dict[str, str]:
    """`NAME=value` lines (an `export ` prefix and quotes allowed); {} when there is no file.

    A ` #` after an unquoted value starts a comment, so a copy of `.env.example` reads as unset.
    Refuses a file others can read. Every error names the file and never a value from it.
    """
    path = path or env_file()
    if not path.is_file():
        return {}
    if path.stat().st_mode & 0o077:
        raise JwError(
            f"{path} can be read by other users",
            hint=f"chmod 600 {path}; it holds the bank token.",
        )
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        name, sep, value = line.strip().removeprefix("export ").partition("=")
        if sep and name and not name.startswith("#"):
            values[name.strip()] = _unquote(value.strip())
    return values


def _unquote(value: str) -> str:
    quote = value[:1]
    if quote in ("'", '"'):
        end = value.find(quote, 1)
        return value[1:end] if end > 0 else value[1:]
    if value.startswith("#"):
        return ""
    return value.split(" #", 1)[0].split("\t#", 1)[0].strip()


def setting(name: str) -> str | None:
    """One key's value: the environment, then the operator's file, else None. Logs no value.

    An empty value counts as unset, so `NAME=` in the file falls through to the default.
    """
    if name not in KEYS:
        raise ValueError(f"{name} is not a jw setting; add it to settings_keys.KEYS")
    value = os.environ.get(name)
    if value:
        log.debug("setting %s from the environment", name)
        return value
    value = read_env_file().get(name)
    if value:
        log.debug("setting %s from %s", name, env_file())
        return value
    log.debug("setting %s unset; the default applies", name)
    return None


def khan_dir() -> Path:
    """The synced Khan copy: JADWIGO_KHAN_DIR, else ~/.cache/jadwigo-bank/khan."""
    configured = setting(JADWIGO_KHAN_DIR)
    return Path(configured).expanduser() if configured else DEFAULT_KHAN_DIR


def bank_dir() -> Path:
    """The bank checkout: JADWIGO_BANK_DIR, else ~/.local/share/jadwigo/bank, where `jw bank
    pull` clones it."""
    configured = setting(JADWIGO_BANK_DIR)
    return Path(configured).expanduser() if configured else DEFAULT_BANK_DIR


def drafts_dir() -> Path:
    """The drafts directory: JADWIGO_DRAFTS_DIR from the environment, ~ expanded, else
    ~/.local/state/jadwigo/drafts. Never the operator's file, which tools/builder does not read."""
    configured = os.environ.get(JADWIGO_DRAFTS_DIR, "").strip()
    return Path(configured).expanduser() if configured else DEFAULT_DRAFTS_DIR


def repo_dir() -> Path | None:
    """The jadwigo checkout: JADWIGO_REPO_DIR, else the folder above this file that holds
    packages/lesson-import, else None (a jw installed outside a checkout)."""
    configured = setting(JADWIGO_REPO_DIR)
    if configured:
        return Path(configured).expanduser()
    here = Path(__file__).resolve()
    return next((p for p in here.parents if (p / "packages" / "lesson-import").is_dir()), None)


def bank_timeout() -> float:
    """Seconds one search may take: JW_BANK_TIMEOUT_SECS, else 10."""
    raw = setting(JW_BANK_TIMEOUT_SECS)
    if not raw:
        return DEFAULT_BANK_TIMEOUT_SECS
    try:
        return float(raw)
    except ValueError as exc:
        raise JwError(
            f"{JW_BANK_TIMEOUT_SECS} is not a number of seconds",
            hint=f"Set {JW_BANK_TIMEOUT_SECS} to a number such as 10, or unset it.",
        ) from exc
