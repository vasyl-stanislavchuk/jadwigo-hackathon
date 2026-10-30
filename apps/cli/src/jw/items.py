"""Converted items by id, read from a file outside git (dl-e8ov.5.38.2).

The file is the Khan pull's conversion to family steps (`converted-pl.json` in the synced copy,
the bucket's `khan/converted/pl.json`, bead dl-e8ov.5.38.1):
`{"generated_by", "licence_note", "items": [...]}`. `load_item` returns the composer's view of one item: the family step with its key and help, the contract's `Credit`, and
`based_on`. A child never sees it. Where the file comes from is `jw.settings_keys`
(JW_KHAN_CONVERTED, else <JADWIGO_KHAN_DIR>/converted-pl.json, both read through `setting`).

`load_item` hands out only a lesson-ready item (dl-a38n.32.9, decisions dl-kaxj and dl-be2l): its
`status` is `{kind: "plays", rules_version, checked_at}`, stamped by the readiness check. Anything
else raises `NotReady` with the reason a draft's `left_out` carries: `renders wrong: <rule>` (refused
by a check), `not checked` (plays with no `checked_at`, or no status), `flagged: <reason>` (a person
pulled it), or the converter's own reason (waiting). A missing verdict is refused, never served.
The refusals file in the bank checkout, `<JADWIGO_BANK_DIR>/refusals/<lang>.json` (`{shapes,
flags}`, jadwigo-bank schemas/refusals.schema.json, the file the bank's stamp reads), is read too,
so a flag holds from the moment it is written, before the next conversion stamps it into the item.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from functools import cache
from pathlib import Path
from typing import Any

from jw import settings_keys
from jw.errors import JwError

MULTI = "multi"  # the language of a language-neutral item

_FILE_HINT = (
    f"Set {settings_keys.JW_KHAN_CONVERTED} to the converted items file, or set "
    f"{settings_keys.JADWIGO_KHAN_DIR} to the synced Khan copy (default "
    f"{settings_keys.DEFAULT_KHAN_DIR}) and fill it with `{settings_keys.KHAN_SYNC_COMMAND}` in "
    "the bank repo."
)


NOT_CHECKED = "not checked"
RENDERS_WRONG = "renders wrong"
FLAGGED = "flagged"
REFUSALS_DIR = "refusals"  # in the bank checkout: <JADWIGO_BANK_DIR>/refusals/<lang>.json


class NotReady(JwError):
    """An item that is in the file but not lesson-ready; `reason` is what left_out says."""

    def __init__(self, item_id: str, reason: str, *, hint: str) -> None:
        super().__init__(f"item {item_id} is not lesson-ready: {reason}", hint=hint)
        self.reason = reason


def converted_path() -> Path:
    """The converted items file: JW_KHAN_CONVERTED, else <JADWIGO_KHAN_DIR>/converted-pl.json."""
    configured = settings_keys.setting(settings_keys.JW_KHAN_CONVERTED)
    if configured:
        return Path(configured).expanduser()
    return settings_keys.khan_dir() / settings_keys.CONVERTED_DEFAULT


@cache
def _read(path: Path) -> tuple[dict[str, dict[str, Any]], str | None]:
    """The file's items by id and its licence note; read once per path per process."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise JwError(f"no converted items file at {path}", hint=_FILE_HINT) from exc
    except (OSError, ValueError) as exc:
        raise JwError(
            f"cannot read the converted items file {path}: {exc}", hint=_FILE_HINT
        ) from exc
    listed = raw.get("items") if isinstance(raw, dict) else None
    if isinstance(listed, dict):
        raise JwError(
            f"{path} holds items as an object keyed by id, not a list",
            hint="The converted file is {generated_by, licence_note, items: [...]}; re-run the "
            "conversion.",
        )
    if not isinstance(listed, list):
        raise JwError(f"{path} has no items list", hint=_FILE_HINT)
    items = {str(item["id"]): item for item in listed if isinstance(item, dict) and "id" in item}
    note = raw.get("licence_note")
    return items, note if isinstance(note, str) and note else None


def refusals_path(language: str) -> Path | None:
    """The refusals file the readiness stamp reads, <JADWIGO_BANK_DIR>/refusals/<lang>.json, or
    None when JADWIGO_BANK_DIR is unset."""
    bank_dir = settings_keys.setting(settings_keys.JADWIGO_BANK_DIR)
    if not bank_dir:
        return None
    return Path(bank_dir).expanduser() / REFUSALS_DIR / f"{language}.json"


@cache
def _read_refusals(path: Path, _stamp: tuple[int, int]) -> dict[str, Any]:
    """The refusals file, read again whenever it changes, so a fresh flag holds at once."""
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise JwError(
            f"cannot read the refusals file {path}: {exc}",
            hint="Fix or remove it; `jw question flag` and `refusals assign` write it.",
        ) from exc
    if not isinstance(raw, dict):
        raise JwError(f"{path} is not a refusals file", hint="It holds {shapes, flags}.")
    return {"shapes": list(raw.get("shapes") or []), "flags": list(raw.get("flags") or [])}


def refusals(language: str) -> dict[str, Any]:
    """`{shapes, flags}` from the refusals file for `language`; both empty when there is none."""
    path = refusals_path(language)
    if path is None:
        return {"shapes": [], "flags": []}
    try:
        stat = path.stat()
    except FileNotFoundError:
        return {"shapes": [], "flags": []}
    return _read_refusals(path, (stat.st_mtime_ns, stat.st_size))


def why_not_ready(status: Any, flag: Mapping[str, Any] | None = None) -> str | None:
    """Why an item with this status (and this flag from the refusals file) is not lesson-ready,
    or None when it is: plays, with checked_at."""
    if flag is not None:
        return f"{FLAGGED}: {flag.get('reason') or 'no reason given'}"
    if not isinstance(status, Mapping):
        return NOT_CHECKED
    kind = status.get("kind")
    if kind == "plays":
        return None if status.get("checked_at") else NOT_CHECKED
    if kind == "refused":
        return f"{RENDERS_WRONG}: {status.get('rule') or 'a check'}"
    if kind == "flagged":
        return f"{FLAGGED}: {status.get('reason') or 'no reason given'}"
    if kind == "waiting":
        return str(status.get("reason") or status.get("issue") or "waiting for its family step")
    return NOT_CHECKED


def _credit(item: dict[str, Any], licence_note: str | None, path: Path) -> dict[str, Any]:
    """The contract's Credit: licence from the item's credit, else from the file's licence_note."""
    source: dict[str, Any] = item.get("credit") or {}
    licence = source.get("licence") or licence_note
    if not licence:
        raise JwError(
            f"item {item['id']} has no licence, and {path} has no licence_note",
            hint=f"Re-run the conversion so it writes a licence, or set "
            f"{settings_keys.JW_KHAN_CONVERTED} to a file that has one.",
        )
    credit = {
        "source": source.get("source"),
        "ref": source.get("ref"),
        "licence": licence,
        "original_lang": source.get("original_lang"),
        "checked": source.get("checked"),
    }
    if source.get("url"):
        credit["url"] = source["url"]
    return credit


def load_item(item_id: str, language: str = "pl") -> dict[str, Any]:
    """One converted item, the composer's view: the family step with key and help kept."""
    path = converted_path()
    items, licence_note = _read(path)
    item = items.get(item_id)
    if item is None:
        raise JwError(
            f"no item {item_id} in {path}",
            hint=f"{path} holds {len(items)} items; "
            f"{settings_keys.JW_KHAN_CONVERTED} picks the file.",
        )
    # A "multi" item is numbers only: it plays in any language and takes the one asked for.
    if item.get("language") not in (language, MULTI):
        raise JwError(
            f"item {item_id} is in {item.get('language')!r}, not {language!r}",
            hint=f"Ask for --language {item.get('language')}, or set "
            f"{settings_keys.JW_KHAN_CONVERTED} to the {language} conversion.",
        )
    flag = next(
        (f for f in refusals(language)["flags"] if isinstance(f, dict) and f.get("id") == item_id),
        None,
    )
    reason = why_not_ready(item.get("status"), flag)
    if reason is not None:
        raise NotReady(
            item_id,
            reason,
            hint=f"Pick a lesson-ready item: status plays with checked_at in {path}, and no flag "
            f"in {refusals_path(language) or 'the refusals file'}.",
        )
    spec = item.get("spec")
    if not isinstance(spec, dict) or not all(k in spec for k in ("family", "data", "key")):
        raise JwError(
            f"item {item_id} has no family step",
            hint=f"Pick an item whose status is plays in {path}.",
        )
    return {
        "id": item_id,
        "language": language,
        "family": spec["family"],
        "problem_type": item.get("problem_type"),
        "question_type": spec.get("question_type"),
        "say": spec.get("say"),
        "question": {
            "family": spec["family"],
            "data": spec["data"],
            "key": spec["key"],
            "help": spec.get("help"),
        },
        "credit": _credit(item, licence_note, path),
        "based_on": {"question": f"khan:{item_id}", "changes": []},
        "course": {
            "exercise_title": item.get("exercise_title"),
            "lesson_title": item.get("lesson_title"),
            "unit_title": item.get("unit_title"),
            "order": item.get("order"),
        },
    }
