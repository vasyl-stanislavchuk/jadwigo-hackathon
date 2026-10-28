"""jw's client for the question bank's search (dl-u1y5.23, moved from david-learns dl.bank_client).

The bank repo (jadwigo-bank) owns the data, the search service and the contract; jw meets it only
at the search envelope. A caller sends a need (contracts/need.schema.json) and gets question sets
back (contracts/search-envelope.schema.json). Both schemas are pinned copies; their `$comment`
names the bank commit they came from.

The client posts the need to `<JW_API_URL>/api/v1/question-searches`, the platform route that
invokes the bank (jadwigo-question-bank/decisions/2026-10-28-callers-reach-the-bank-only-through-
apps-api-which-invokes-the-b). `settings_keys` says where the URL and token come from, including
the `JW_BANK_URL` fallback and the bank.env file (dl-e8ov.5.2.26).

`search()` never raises for a bank that is down, slow or wrong: it returns an envelope whose
`state` rows are all `degraded`, so a planner can tell "found nothing" from "could not ask".
It raises only for the caller's own mistakes: no URL anywhere, or a need the schema refuses.

Trying it by hand against the fake bank the tests use, which answers both routes:

    uv run python tests/fake_bank.py --port 8765 &
    JW_API_URL=http://127.0.0.1:8765 uv run jw question search --words "dodawanie do 100" \
        --grade 3 --json
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from functools import cache
from pathlib import Path
from typing import Any, NamedTuple

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from referencing import Registry, Resource

from jw.errors import JwError
from jw.settings_keys import (
    API_SEARCH_PATH,
    BANK_SEARCH_PATH,
    DEFAULT_BANK_ENV_FILE,
    DEFAULT_BANK_TIMEOUT_SECS,
    JADWIGO_BANK_DIR,
    JW_API_URL,
    JW_BANK_ENV_FILE,
    JW_BANK_READ_TOKEN,
    JW_BANK_TIMEOUT_SECS,
    JW_BANK_TOKEN,
    JW_BANK_URL,
)

CONTRACTS = Path(__file__).resolve().parent / "contracts"
ENVELOPE_SCHEMA = CONTRACTS / "search-envelope.schema.json"
NEED_SCHEMA = CONTRACTS / "need.schema.json"
SET_SCHEMA = CONTRACTS / "set.schema.json"
SET_ID_RE = re.compile(r"^set_[a-z]+_[a-z0-9]+$")

# The arms the envelope's description names. A degraded envelope reports every one of them,
# because a failed call cannot say which arm would have answered.
KNOWN_ARMS = ("A", "A1", "B", "B1", "C", "C2")


class BankNotConfigured(JwError):
    default_hint = (
        f"Set {JW_API_URL} (and {JW_BANK_READ_TOKEN}) to the API's base URL, or put them in "
        f"{DEFAULT_BANK_ENV_FILE} with mode 600."
    )


class NeedInvalid(JwError):
    default_hint = "A need takes a language, a grade, and words, skills, can_do or resemble."


class BankDirNotConfigured(JwError):
    default_hint = f"Set {JADWIGO_BANK_DIR} to a checkout of the bank repo (its sets/ folder)."


class SetNotFound(JwError):
    default_hint = "Take the id from a `jw question search` row."


# ---------------------------------------------------------------- where -----

# The (URL name, token name, path, takes query fields) rows, in the order they are tried. The
# /api/v1 route serves stage final with every arm and defines no query fields
# (ROUTES.questionSearches), so only the bank's own route gets `arm` and `stage`.
_PAIRS = (
    (JW_API_URL, JW_BANK_READ_TOKEN, API_SEARCH_PATH, False),
    (JW_BANK_URL, JW_BANK_TOKEN, BANK_SEARCH_PATH, True),
)


class Endpoint(NamedTuple):
    url: str  # the full search URL
    token: str | None  # the bearer token; None sends none
    takes_query: bool  # whether `arm` and `stage` may ride as query fields


def env_file() -> Path:
    return Path(os.environ.get(JW_BANK_ENV_FILE) or DEFAULT_BANK_ENV_FILE)


def _read_env_file(path: Path) -> dict[str, str]:
    """`NAME=value` lines (an `export ` prefix and quotes allowed). Refuses a file others can read.

    Every error names the file and never a value from it.
    """
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
            values[name.strip()] = value.strip().strip("'\"")
    return values


def endpoint() -> Endpoint:
    """The search URL, its bearer token and whether it takes query fields, per `jw.settings_keys`.

    A URL and its token come from one place, so a URL set in the environment never carries the
    file's token to a host the file did not name.
    """
    for url_name, token_name, path, takes_query in _PAIRS:
        base = os.environ.get(url_name)
        if base:
            token = os.environ.get(token_name) or None
            return Endpoint(base.rstrip("/") + path, token, takes_query)
    stored = _read_env_file(env_file())
    for url_name, token_name, path, takes_query in _PAIRS:
        base = stored.get(url_name)
        if base:
            return Endpoint(base.rstrip("/") + path, stored.get(token_name) or None, takes_query)
    raise BankNotConfigured(
        f"neither {JW_API_URL} nor {JW_BANK_URL} is set, in the environment or in {env_file()}"
    )


@cache
def _validators() -> tuple[Draft202012Validator, Draft202012Validator]:
    envelope = json.loads(ENVELOPE_SCHEMA.read_text(encoding="utf-8"))
    need = json.loads(NEED_SCHEMA.read_text(encoding="utf-8"))
    need_resource = Resource.from_contents(need)
    # The envelope's `$ref: need.schema.json` resolves against its own $id, jadwigo-bank/...
    ref_uri = urllib.parse.urljoin(envelope["$id"], "need.schema.json")
    registry: Registry[Any] = Registry().with_resources(
        [(need["$id"], need_resource), (ref_uri, need_resource)]
    )
    return (
        Draft202012Validator(envelope, registry=registry),
        Draft202012Validator(need, registry=registry),
    )


def validate_envelope(envelope: Any) -> None:
    """Raise jsonschema's ValidationError when `envelope` breaks the pinned search envelope."""
    _validators()[0].validate(envelope)


def validate_need(need: Any) -> None:
    """Raise jsonschema's ValidationError when `need` breaks the pinned need schema."""
    _validators()[1].validate(need)


def degraded(detail: str, need: dict[str, Any] | None = None) -> dict[str, Any]:
    """An envelope with no rows and every arm degraded; `detail` must name no key or token."""
    envelope: dict[str, Any] = {
        "version": 1,
        "rows": [],
        "state": [{"arm": arm, "state": "degraded", "detail": detail} for arm in KNOWN_ARMS],
    }
    if need is not None:
        envelope["need"] = need
    return envelope


def _timeout() -> float:
    raw = os.environ.get(JW_BANK_TIMEOUT_SECS)
    return float(raw) if raw else DEFAULT_BANK_TIMEOUT_SECS


def search(
    need: dict[str, Any],
    *,
    arm: str | None = None,
    limit: int = 20,
    stage: str | None = None,
    base_url: str | None = None,
    timeout: float | None = None,
) -> dict[str, Any]:
    """POST `need` to the search route; return the envelope, validated.

    `limit` rides in the need (the schema has it). `arm` and `stage` go as query fields on the
    bank's own route (JW_BANK_URL), since a need with additionalProperties false has no room for
    them. The /api/v1 route takes no query fields and always answers stage final with every arm,
    so there they are not sent. `base_url` is a full search URL
    that skips `endpoint()` and sends no token (tests).
    """
    if base_url:
        url, token, takes_query = base_url, None, not base_url.endswith(API_SEARCH_PATH)
    else:
        url, token, takes_query = endpoint()
    body = {**need, "limit": limit}
    try:
        validate_need(body)
    except ValidationError as exc:
        raise NeedInvalid(f"the need does not match need.schema.json: {exc.message}") from exc

    query = {key: value for key, value in (("arm", arm), ("stage", stage)) if value is not None}
    if query and takes_query:
        url += "?" + urllib.parse.urlencode(query)
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST"
    )
    wait = timeout if timeout is not None else _timeout()

    # Every detail below is written here, never copied from the exception: a URL or a reason
    # string can carry a token.
    try:
        with urllib.request.urlopen(request, timeout=wait) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        return degraded(f"the bank answered HTTP {exc.code}", body)
    except TimeoutError:
        return degraded(f"the bank did not answer within {wait:g} s", body)
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, TimeoutError):
            return degraded(f"the bank did not answer within {wait:g} s", body)
        return degraded("could not reach the bank", body)
    except OSError:
        return degraded("the connection to the bank failed", body)

    try:
        envelope = json.loads(raw)
    except ValueError:
        return degraded("the bank's answer was not JSON", body)
    try:
        validate_envelope(envelope)
    except ValidationError:
        return degraded("the bank's answer did not match the search envelope", body)
    if not isinstance(envelope, dict):  # the schema's type: object already refused this
        return degraded("the bank's answer did not match the search envelope", body)
    return envelope


# ---------------------------------------------------------------- show ------


@cache
def _set_validator() -> Draft202012Validator:
    return Draft202012Validator(json.loads(SET_SCHEMA.read_text(encoding="utf-8")))


def validate_set(page: Any) -> None:
    """Raise jsonschema's ValidationError when `page` breaks the pinned set page schema."""
    _set_validator().validate(page)


def show_set(set_id: str, *, bank_dir: str | Path | None = None) -> dict[str, Any]:
    """One question set page, read from the local bank checkout and checked against the schema.

    The search route returns rows (ids, titles, enrichment), not pages, and the bank serves no page
    route yet, so pages come from `JADWIGO_BANK_DIR`: `<dir>/sets/**/<id>.json`.
    """
    if not SET_ID_RE.match(set_id):
        raise SetNotFound(f"{set_id!r} is not a set id")
    root = bank_dir or os.environ.get(JADWIGO_BANK_DIR)
    if not root:
        raise BankDirNotConfigured(f"{JADWIGO_BANK_DIR} is not set")
    sets = Path(root) / "sets"
    found = next(iter(sorted(sets.rglob(f"{set_id}.json"))), None) if sets.is_dir() else None
    if found is None:
        raise SetNotFound(f"no page for {set_id} under {sets}")
    try:
        page = json.loads(found.read_text(encoding="utf-8"))
        validate_set(page)
    except (ValueError, ValidationError) as exc:
        message = exc.message if isinstance(exc, ValidationError) else str(exc)
        raise JwError(
            f"the page for {set_id} does not match set.schema.json: {message}",
            hint="Re-pull the bank checkout, or re-pin set.schema.json from the bank.",
        ) from exc
    if not isinstance(page, dict) or page.get("id") != set_id:
        raise SetNotFound(f"{found} does not hold {set_id}")
    return page


# ---------------------------------------------------------------- gaps ------


def gaps(needs: list[dict[str, Any]], *, arm: str | None = None, limit: int = 5) -> dict[str, Any]:
    """Search each need once; say which come back with nothing.

    A need is a gap when the bank was asked and every arm that answered found nothing (`empty` or
    `abstained`). A need whose arms are all `degraded` is not a gap: the bank could not be asked,
    and the row says so. The bank's own stored gap count (empty rows per skill, type or mistake,
    with no learner or pod) has no route yet; this is the caller's view of the same thing.
    """
    out = []
    for need in needs:
        envelope = search(need, arm=arm, limit=limit)
        asked = [s for s in envelope["state"] if s["state"] != "not_asked"]
        if envelope["rows"]:
            verdict = "found"
        elif asked and all(s["state"] == "degraded" for s in asked):
            verdict = "degraded"
        else:
            verdict = "gap"
        out.append(
            {
                "need": envelope.get("need", need),
                "verdict": verdict,
                "rows": len(envelope["rows"]),
                "top": [r["id"] for r in envelope["rows"][:3]],
                "state": asked,
            }
        )
    return {
        "version": 1,
        "needs": out,
        "gaps": sum(1 for row in out if row["verdict"] == "gap"),
        "degraded": sum(1 for row in out if row["verdict"] == "degraded"),
    }
