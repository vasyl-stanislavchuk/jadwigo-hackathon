"""What is not lesson-ready, by shape, and the file that routes it (dl-a38n.32.11).

A refusal is useless if it only lowers a count. `jw question refusals` groups the items that are
not lesson-ready into shapes, one rule on one question type, each with its count, up to 3 example
ids, who fixes it, and the bead that tracks it once one is assigned. The lead files one bead per
new shape and writes it back with `jw question refusals assign`; the next stamp carries the issue
into each refused item's status. `jw question flag` pulls an item the rules missed, and `jw.items`
reads the flag at once, so the next draft leaves it out before any re-run (wave plan
docs/worklog/dl-a38n.32/2026-10-30-wave-1.md, "When something isn't ready"; decisions dl-kaxj and
dl-be2l).

The shapes come from the converted file (each item's stamped `status`) and the conformance sidecar
beside it (`<items stem>.render.json`, `tools/conformance/report.ts`), so a run newer than the stamp
shows at once. The refusals file is `<JADWIGO_BANK_DIR>/refusals/<lang>.json`, in the shape the
bank pins (jadwigo-bank schemas/refusals.schema.json): `{shapes: [{rule, question_type, issue}],
flags: [{id, by, reason, issue?, on}]}`. It holds ids and reasons only, never question text, so it
is safe in git. These commands never write a bead.
"""

from __future__ import annotations

import datetime as dt
import json
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from jw import items, settings_keys
from jw.errors import JwError

FLAGGED_RULE = "flagged"
EXAMPLES = 3
DEFAULT_BY = "owner"  # a role, never a person's name: the file is committed in the bank repo


def owner_of(rule: str) -> str:
    """Who fixes a shape: the routing table of the wave plan."""
    if rule == "render-picture-missing":
        return "media"
    if rule.startswith("render-"):
        return "lesson-kit"
    if rule in ("contract", "key-grades"):
        return "converter"
    return "the lead"


def converted_file(language: str) -> Path:
    """The converted items file for `language`: JW_KHAN_CONVERTED when set, else the synced copy's
    converted-pl.json for Polish and converted.json for English."""
    if language == "pl" or settings_keys.setting(settings_keys.JW_KHAN_CONVERTED):
        return items.converted_path()
    return settings_keys.khan_dir() / "converted.json"


def sidecar_path(converted: Path) -> Path:
    """converted-pl.json -> converted-pl.render.json, as tools/conformance/run.ts names it."""
    return converted.with_name(f"{converted.stem}.render.json")


def _read_json(path: Path, what: str) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (OSError, ValueError) as exc:
        raise JwError(f"cannot read the {what} {path}: {exc}", hint="Fix or remove it.") from exc


def _items(converted: Path) -> list[dict[str, Any]]:
    raw = _read_json(converted, "converted items file")
    if raw is None:
        raise JwError(
            f"no converted items file at {converted}",
            hint=f"Set {settings_keys.JW_KHAN_CONVERTED}, or sync the Khan copy with "
            f"`{settings_keys.KHAN_SYNC_COMMAND}` in the bank repo.",
        )
    listed = raw.get("items") if isinstance(raw, dict) else None
    if isinstance(listed, dict):
        listed = list(listed.values())
    if not isinstance(listed, list):
        raise JwError(f"{converted} has no items list", hint="Re-run the conversion.")
    return [i for i in listed if isinstance(i, dict) and "id" in i]


def _question_type(item: Mapping[str, Any]) -> str | None:
    spec = item.get("spec")
    value = spec.get("question_type") if isinstance(spec, Mapping) else None
    return str(value) if value else None


def _refusal(
    item: Mapping[str, Any], verdict: Any, flag: Mapping[str, Any] | None
) -> tuple[str, str | None, str | None] | None:
    """(rule, issue, by) when the item is refused or flagged, else None. A flag in the refusals
    file wins; then the stamped status; then a sidecar run newer than the stamp."""
    if flag is not None:
        return FLAGGED_RULE, flag.get("issue"), str(flag.get("by") or DEFAULT_BY)
    status = item.get("status") if isinstance(item.get("status"), Mapping) else {}
    kind = status.get("kind")
    if kind == "flagged":
        return FLAGGED_RULE, status.get("issue"), str(status.get("by") or DEFAULT_BY)
    if kind == "refused":
        return str(status.get("rule") or "render"), status.get("issue"), None
    if kind == "plays" and isinstance(verdict, Mapping):
        errors = [f for f in verdict.get("findings") or [] if f.get("level") == "error"]
        if errors or verdict.get("render_ok") is False:
            return str(errors[0].get("rule") if errors else "render"), None, None
    return None


def require_path(language: str) -> Path:
    """The refusals file to write, or a JwError naming JADWIGO_BANK_DIR."""
    path = items.refusals_path(language)
    if path is None:
        raise JwError(
            f"{settings_keys.JADWIGO_BANK_DIR} is not set",
            hint=f"Set {settings_keys.JADWIGO_BANK_DIR} to the jadwigo-bank checkout; its "
            "refusals/<lang>.json is the file the stamp reads.",
        )
    return path


def _load(language: str) -> dict[str, Any]:
    """The refusals file as it is on disk, or an empty one."""
    path = items.refusals_path(language)
    raw = _read_json(path, "refusals file") if path is not None else None
    if raw is None:
        return {"shapes": [], "flags": []}
    if not isinstance(raw, dict):
        raise JwError(f"{path} is not a refusals file", hint="It holds {shapes, flags}.")
    return {"shapes": list(raw.get("shapes") or []), "flags": list(raw.get("flags") or [])}


def _save(language: str, refusals: Mapping[str, Any]) -> Path:
    path = require_path(language)
    path.parent.mkdir(parents=True, exist_ok=True)
    body = {"shapes": list(refusals["shapes"]), "flags": list(refusals["flags"])}
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def report(
    language: str = "pl", *, new: bool = False, since: str | None = None
) -> dict[str, Any]:
    """`jw question refusals --json`: the shapes of what is not lesson-ready in `language`.

    `new` keeps only shapes with no issue. `since` names a bead: the shapes assigned to it, and per
    shape the items still refused under it, so the lead sees whether its fix emptied the shape.
    """
    converted = converted_file(language)
    listed = _items(converted)
    sidecar = _read_json(sidecar_path(converted), "conformance sidecar") or {}
    verdicts = sidecar.get("items") if isinstance(sidecar, Mapping) else None
    refusals = _load(language)
    assigned = {
        (str(s.get("rule")), s.get("question_type")): str(s.get("issue"))
        for s in refusals["shapes"]
        if isinstance(s, Mapping) and s.get("issue")
    }
    flags = {str(f["id"]): f for f in refusals["flags"] if isinstance(f, Mapping) and "id" in f}
    shapes: dict[tuple[str, str | None], dict[str, Any]] = {}
    ready = not_checked = waiting = 0
    for item in listed:
        item_id = str(item["id"])
        found = _refusal(item, (verdicts or {}).get(item_id), flags.get(item_id))
        if found is None:
            status = item.get("status")
            kind = status.get("kind") if isinstance(status, Mapping) else None
            if items.why_not_ready(status) is None:
                ready += 1
            elif kind == "waiting":
                waiting += 1
            else:
                not_checked += 1
            continue
        rule, issue, by = found
        qtype = _question_type(item)
        shape = shapes.setdefault(
            (rule, qtype),
            {
                "rule": rule,
                "question_type": qtype,
                "items": 0,
                "ids": [],
                "owners": [],
                "issue": assigned.get((rule, qtype)),
            },
        )
        shape["items"] += 1
        shape["ids"].append(item_id)
        shape["issue"] = shape["issue"] or issue
        owner = by if rule == FLAGGED_RULE else owner_of(rule)
        if owner and owner not in shape["owners"]:
            shape["owners"].append(owner)
    ordered = sorted(
        shapes.values(), key=lambda s: (-s["items"], s["rule"], s["question_type"] or "")
    )
    rows = [
        {
            "rule": shape["rule"],
            "question_type": shape["question_type"],
            "items": shape["items"],
            "examples": shape["ids"][:EXAMPLES],
            "owner": ", ".join(shape["owners"]),
            "issue": shape["issue"],
        }
        for shape in ordered
        if not (new and shape["issue"])
    ]
    out: dict[str, Any] = {
        "language": language,
        "file": str(converted),
        "items": len(listed),
        "ready": ready,
        "not_checked": not_checked,
        "waiting": waiting,
        "shapes": rows,
    }
    if since is not None:
        out["since"] = _since(since, shapes, assigned)
    return out


def _since(
    bead: str,
    shapes: Mapping[tuple[str, str | None], Mapping[str, Any]],
    assigned: Mapping[tuple[str, str | None], str],
) -> dict[str, Any]:
    """The shapes `bead` tracks, and per shape the items still refused under it: none left means
    every item of the shape plays now."""
    mine = [key for key, issue in assigned.items() if issue == bead]
    mine += [key for key, shape in shapes.items() if shape["issue"] == bead]
    rows = []
    for rule, qtype in dict.fromkeys(mine):
        still = list((shapes.get((rule, qtype)) or {}).get("ids") or [])
        rows.append(
            {"rule": rule, "question_type": qtype, "still_refused": still, "plays_now": not still}
        )
    return {"bead": bead, "shapes": rows}


def assign(rule: str, question_type: str | None, bead: str, language: str = "pl") -> Path:
    """Write `bead` as the issue of the shape (rule, question_type) into the refusals file."""
    if not rule or not bead:
        raise JwError(
            "assign needs a rule and a bead",
            hint="jw question refusals assign <rule> <question_type> <bead>",
        )
    refusals = _load(language)
    shapes = [
        s
        for s in refusals["shapes"]
        if not (s.get("rule") == rule and s.get("question_type") == question_type)
    ]
    shapes.append({"rule": rule, "question_type": question_type, "issue": bead})
    refusals["shapes"] = sorted(shapes, key=lambda s: (s["rule"], s.get("question_type") or ""))
    return _save(language, refusals)


def flag(
    item_id: str,
    reason: str,
    language: str = "pl",
    *,
    by: str = DEFAULT_BY,
    issue: str | None = None,
    today: dt.date | None = None,
) -> Path:
    """Pull `item_id` in `language`: one flag in the refusals file, replacing an earlier one."""
    reason = (reason or "").strip()
    if not reason:
        raise JwError(
            "a flag needs a reason", hint="Say why in a few words, without quoting the question."
        )
    _known(item_id, language)
    refusals = _load(language)
    entry: dict[str, Any] = {"id": item_id, "by": by, "reason": reason}
    if issue:
        entry["issue"] = issue
    entry["on"] = (today or _today()).isoformat()
    refusals["flags"] = [f for f in refusals["flags"] if f.get("id") != item_id] + [entry]
    return _save(language, refusals)


def _today() -> dt.date:
    return dt.date.today()


def clear(item_id: str, language: str = "pl") -> Path:
    """Remove the flag on `item_id` in `language`."""
    refusals = _load(language)
    kept = [f for f in refusals["flags"] if f.get("id") != item_id]
    if len(kept) == len(refusals["flags"]):
        raise JwError(
            f"no flag on {item_id} in {language}",
            hint=f"`jw question refusals --lang {language}` lists the flagged items.",
        )
    refusals["flags"] = kept
    return _save(language, refusals)


def _known(item_id: str, language: str) -> None:
    """Refuse a flag on an id the converted file does not hold, when that file is here."""
    converted = converted_file(language)
    if not converted.is_file():
        return
    if item_id not in {str(i["id"]) for i in _items(converted)}:
        raise JwError(
            f"no item {item_id} in {converted}",
            hint="Flag an id from the converted file; `jw question item <id>` shows one.",
        )
