"""Converted items by id, read from a file outside git (dl-e8ov.5.38.2).

The file is the Khan pull's conversion to family steps (`converted-pl.json`, bead dl-e8ov.5.38.1,
or `converted.json`): `{"generated_by", "licence_note", "items": [...]}`. `load_item` returns the
composer's view of one item: the family step with its key and help, the contract's `Credit`, and
`based_on`. A child never sees it. Where the file comes from is `jw.settings_keys`
(JW_KHAN_CONVERTED, then DEFAULT_KHAN_DIR).
"""

from __future__ import annotations

import json
import os
from functools import cache
from pathlib import Path
from typing import Any

from jw import settings_keys
from jw.errors import JwError

MULTI = "multi"  # the language of a language-neutral item

_FILE_HINT = (
    f"Set {settings_keys.JW_KHAN_CONVERTED} to the converted items file, or run the Polish "
    "conversion (bead dl-e8ov.5.38.1)."
)


def converted_path() -> Path:
    """The converted items file: JW_KHAN_CONVERTED, else converted-pl.json, else converted.json."""
    configured = os.environ.get(settings_keys.JW_KHAN_CONVERTED)
    if configured:
        return Path(configured).expanduser()
    khan_dir = settings_keys.DEFAULT_KHAN_DIR
    polish = khan_dir / "converted-pl.json"
    return polish if polish.exists() else khan_dir / "converted.json"


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
    if not isinstance(raw, dict) or not isinstance(raw.get("items"), list):
        raise JwError(f"{path} has no items list", hint=_FILE_HINT)
    items = {
        str(item["id"]): item for item in raw["items"] if isinstance(item, dict) and "id" in item
    }
    note = raw.get("licence_note")
    return items, note if isinstance(note, str) and note else None


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
    spec = item.get("spec")
    if not isinstance(spec, dict) or not all(k in spec for k in ("family", "data", "key")):
        # The conversion leaves a waiting item without a family step, and its status says why.
        status = item.get("status") or {}
        reason = status.get("reason") if isinstance(status, dict) else None
        raise JwError(
            f"item {item_id} has no family step" + (f": {reason}" if reason else ""),
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
