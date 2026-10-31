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
shows at once, and from the converter's own refusals beside them (`<items stem>.refused.json`,
`{items: [{id, reason, sets}]}`: the items refused before conversion, which never reach the
converted file). A converter refusal is a shape too, owned by the converter: its reason with what
differs per item taken out (`cause_of`), on no question type (dl-a38n.32.36). The refusals file is `<JADWIGO_BANK_DIR>/refusals/<lang>.json`, in the shape the
bank pins (jadwigo-bank schemas/refusals.schema.json): `{shapes: [{rule, question_type, issue}],
flags: [{id, by, reason, issue?, on}]}`. It holds ids and reasons only, never question text, so it
is safe in git. These commands never write a bead.
"""

from __future__ import annotations

import datetime as dt
import json
import re
from collections.abc import Mapping
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator
from jsonschema.exceptions import best_match

from jw import bank_client, items, settings_keys
from jw.errors import JwError

FLAGGED_RULE = "flagged"
CONVERTER = "converter"
EXAMPLES = 3
# Who may pull an item: a role, never a person's name, because the file is committed in the bank
# repo and its schema refuses an empty `by`.
ROLES = ("owner", "lead", "teacher", "agent")
DEFAULT_BY = "owner"
SCHEMA = Path(__file__).resolve().parent / "contracts" / "refusals.schema.json"


@cache
def _validator() -> Draft202012Validator:
    return Draft202012Validator(json.loads(SCHEMA.read_text(encoding="utf-8")))


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


def refused_path(converted: Path) -> Path:
    """converted-pl.json -> converted-pl.refused.json, the converter's refusals beside it."""
    return converted.with_name(f"{converted.stem}.refused.json")


_ITEM_PREFIX = re.compile(r"^refused:\s*(?:[\w.-]+:\s+)?")
# A part of a question played as its parts names itself before its cause: `part 1: <id>-p1: `,
# `<id>-p1: `, or `part 1: -p1: ` once a report took the id out (dl-a38n.32.55).
_PART_PREFIX = re.compile(r"^(?:part \d+:\s*)?[\w.-]*-p\d+:\s*")
_NOT_PULLED = re.compile(r"^\S+ was not pulled\b")
_SET_STOPPED = re.compile(r"^set \S+ stopped\b")
_TWIN = re.compile(r"^(\w+) differs from (\w+) \(([^)]*)\)")
BEAD = re.compile(r"^[a-z]+-[a-z0-9]+(\.\d+)*$")


def cause_of(reason: str) -> str:
    """The cause a converter refusal names, with what differs per item taken out, so the items one
    fix re-admits count together: the `refused: <id>: ` (or bare `refused: `) prefix goes, a picture URL that was not
    pulled is "a picture was not pulled", a stopped set is "set stopped", and a twin difference is
    "pl differs from en (family)" when the family differs, else "(numbers, pictures)"; a part's
    own `part k: <id>-pN: ` goes too, so every part with one cause counts once. Applying it twice
    changes nothing, so a cause readiness.json already wrote stays as it is."""
    text = _PART_PREFIX.sub("", _ITEM_PREFIX.sub("", str(reason).strip()))
    if _NOT_PULLED.match(text):
        return "a picture was not pulled"
    if _SET_STOPPED.match(text):
        return "set stopped"
    twin = _TWIN.match(text)
    if twin:
        parts = {part.strip() for part in twin.group(3).split(",")}
        what = "family" if "family" in parts else "numbers, pictures"
        return f"{twin.group(1)} differs from {twin.group(2)} ({what})"
    return text


def read_json(path: Path, what: str) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (OSError, ValueError) as exc:
        raise JwError(f"cannot read the {what} {path}: {exc}", hint="Fix or remove it.") from exc


def _items(converted: Path) -> list[dict[str, Any]]:
    raw = read_json(converted, "converted items file")
    if raw is None:
        raise JwError(
            f"no converted items file at {converted}",
            hint=f"Set {settings_keys.JW_KHAN_CONVERTED}, or sync the Khan copy with "
            f"`{settings_keys.KHAN_SYNC_COMMAND}` in the bank repo.",
        )
    listed = raw.get("items") if isinstance(raw, dict) else None
    if isinstance(listed, dict):
        raise JwError(
            f"{converted} holds items as an object keyed by id, not a list",
            hint="The converted file is {generated_by, licence_note, items: [...]}; re-run the "
            "conversion.",
        )
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
    """The refusals file to write, or BankDirNotConfigured, as `jw question show` raises it."""
    path = items.refusals_path(language)
    if path is None:
        raise bank_client.BankDirNotConfigured(
            f"no bank checkout at {settings_keys.bank_dir()}",
            hint=f"Run `jw bank pull`, or set {settings_keys.JADWIGO_BANK_DIR} to the jadwigo-bank "
            "checkout; its refusals/<lang>.json is the file the stamp reads.",
        )
    return path


def _load(language: str) -> dict[str, Any]:
    """The refusals file as it is on disk, or an empty one."""
    path = items.refusals_path(language)
    raw = read_json(path, "refusals file") if path is not None else None
    if raw is None:
        return {"shapes": [], "flags": []}
    if not isinstance(raw, dict):
        raise JwError(f"{path} is not a refusals file", hint="It holds {shapes, flags}.")
    return {
        "shapes": list(raw.get("shapes") or []),
        "flags": list(raw.get("flags") or []),
    }


def _save(language: str, refusals: Mapping[str, Any]) -> Path:
    """Write the refusals file, only when the whole of it matches the pinned schema: the nightly
    stamp validates it and would stop on a file that does not."""
    path = require_path(language)
    body = {"shapes": list(refusals["shapes"]), "flags": list(refusals["flags"])}
    problem = best_match(_validator().iter_errors(body))
    if problem is not None:
        where = "/".join(str(p) for p in problem.absolute_path) or "the file"
        raise JwError(
            f"the refusals file would not match refusals.schema.json at {where}: {problem.message}",
            hint=f"Nothing was written to {path}. Fix the entry there by hand if it was already "
            "wrong, then run the command again.",
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


@dataclass(frozen=True)
class Verdict:
    """One item's place in the report: `kind` is ready, not_checked, waiting, refused or flagged;
    `cause` the rule, the converter's cause or the waiting reason."""

    id: str
    kind: str
    cause: str | None = None
    issue: str | None = None
    question_type: str | None = None
    owner: str | None = None
    converter: bool = False


def _converter_refused(converted: Path) -> list[dict[str, Any]]:
    """The converter's refusals beside the converted file, or none when it wrote no file."""
    raw = read_json(refused_path(converted), "converter refusals file")
    listed = raw.get("items") if isinstance(raw, Mapping) else raw
    if not isinstance(listed, list):
        return []
    return [r for r in listed if isinstance(r, Mapping) and r.get("id")]


def classify(language: str) -> tuple[Path, list[Verdict]]:
    """Every item of `language`, converted or refused before conversion, with its verdict."""
    converted = converted_file(language)
    listed = _items(converted)
    sidecar = read_json(sidecar_path(converted), "conformance sidecar") or {}
    verdicts = (sidecar.get("items") if isinstance(sidecar, Mapping) else None) or {}
    flags = {
        str(f["id"]): f for f in _load(language)["flags"] if isinstance(f, Mapping) and "id" in f
    }
    out: list[Verdict] = []
    for item in listed:
        item_id = str(item["id"])
        qtype = _question_type(item)
        found = _refusal(item, verdicts.get(item_id), flags.get(item_id))
        if found is not None:
            rule, issue, by = found
            if rule == FLAGGED_RULE:
                out.append(Verdict(item_id, "flagged", rule, issue, qtype, by))
            else:
                out.append(Verdict(item_id, "refused", rule, issue, qtype, owner_of(rule)))
            continue
        status = item.get("status") if isinstance(item.get("status"), Mapping) else {}
        if items.why_not_ready(status) is None:
            out.append(Verdict(item_id, "ready", question_type=qtype))
        elif status.get("kind") == "waiting":
            reason = cause_of(str(items.why_not_ready(status)))
            out.append(Verdict(item_id, "waiting", reason, status.get("issue"), qtype))
        else:
            out.append(Verdict(item_id, "not_checked", items.NOT_CHECKED, question_type=qtype))
    seen = {v.id for v in out}
    for entry in _converter_refused(converted):
        item_id = str(entry["id"])
        if item_id in seen:  # the converter lists its waiting items too; the stamp has them
            continue
        seen.add(item_id)
        reason = str(entry.get("reason") or "refused by the converter")
        issue = reason if BEAD.match(reason) else None
        out.append(
            Verdict(
                item_id,
                "refused",
                cause_of(reason),
                issue,
                None,
                CONVERTER,
                converter=True,
            )
        )
    return converted, out


def assigned_shapes(language: str) -> dict[tuple[str, str | None], str]:
    """(rule, question_type) -> the bead `refusals assign` wrote for it."""
    return {
        (str(s.get("rule")), s.get("question_type")): str(s.get("issue"))
        for s in _load(language)["shapes"]
        if isinstance(s, Mapping) and s.get("issue")
    }


def report(language: str = "pl", *, new: bool = False, since: str | None = None) -> dict[str, Any]:
    """`jw question refusals --json`: the shapes of what is not lesson-ready in `language`.

    `new` keeps only shapes with no issue. `since` names a bead: the shapes assigned to it, and per
    shape the items still refused under it, so the lead sees whether its fix emptied the shape.
    """
    converted, verdicts = classify(language)
    assigned = assigned_shapes(language)
    shapes: dict[tuple[str, str | None], dict[str, Any]] = {}
    for verdict in verdicts:
        if verdict.kind not in ("refused", "flagged"):
            continue
        rule = str(verdict.cause)
        qtype = verdict.question_type
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
        shape["ids"].append(verdict.id)
        shape["issue"] = shape["issue"] or verdict.issue
        if verdict.owner and verdict.owner not in shape["owners"]:
            shape["owners"].append(verdict.owner)
    ordered = sorted(
        shapes.values(),
        key=lambda s: (-s["items"], s["rule"], s["question_type"] or ""),
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

    def count(kind: str) -> int:
        return sum(1 for v in verdicts if v.kind == kind)

    out: dict[str, Any] = {
        "language": language,
        "file": str(converted),
        "items": len(verdicts),
        "ready": count("ready"),
        "not_checked": count("not_checked"),
        "waiting": count("waiting"),
        "refused_before_conversion": sum(1 for v in verdicts if v.converter),
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
            {
                "rule": rule,
                "question_type": qtype,
                "still_refused": still,
                "plays_now": not still,
            }
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
    if by not in ROLES:
        raise JwError(f"{by!r} is not a role", hint=f"Pass --by one of {', '.join(ROLES)}.")
    reason = (reason or "").strip()
    if not reason:
        raise JwError(
            "a flag needs a reason",
            hint="Say why in a few words, without quoting the question.",
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
