"""How many items are lesson-ready, per language, and why the rest are not (dl-a38n.32.36).

`jw question readiness` answers the owner's question for one language or both: items, ready, not
checked, flagged, waiting by reason, refused by cause (a rule of the gate, or the converter's
reason as `jw.refusals.cause_of` names it), each cause with the bead that fixes it, the twin
warnings by kind, what was re-admitted since the previous run, and the sets skipped by id. Wave plan docs/worklog/dl-a38n.32/2026-10-31-wave-2.md;
decisions dl-kaxj, dl-be2l and dl-e7yv.

It reads `readiness.json` beside the converted files (`<JADWIGO_KHAN_DIR>/readiness.json`, which
the bank's `make ready` writes, dl-a38n.32.29, schemas/readiness.schema.json there:
`{generated_at, rules_version, languages: {<lang>: {items, ready, waiting: {reason: n}, refused:
{rule or converter reason: n}, flagged, warnings: {kind: n}, readmitted: {cause: n}, issues?:
{cause: bead}, not_checked?}}, sets: {indexed: n, skipped_no_ready: [set_id, ...]}}`) when it has the language, and
otherwise computes the same counts from the converted file, its sidecar and the converter's
refusals (`jw.refusals.classify`); only a run can say what it re-admitted, so a computed report
leaves that unknown. The beads come from the refusals file (`jw question refusals assign <cause>
- <bead>`), from readiness.json's `issues`, and from the bead an item's status carries.

`dominant_cause` gives `question_gaps` the cause most of a set's items share, so a gap says why.
"""

from __future__ import annotations

import json
from collections import Counter
from collections.abc import Iterable, Mapping
from functools import cache
from pathlib import Path
from typing import Any

from jw import items, refusals, settings_keys
from jw.errors import JwError

READINESS_FILE = "readiness.json"
LANGUAGES = ("pl", "en")
FROM_FILE = "readiness.json"
COMPUTED = "computed"


def readiness_path() -> Path:
    """readiness.json beside the converted files: the Khan dir, or the dir JW_KHAN_CONVERTED names."""
    return refusals.converted_file("pl").parent / READINESS_FILE


def _owner(cause: str) -> str:
    """A gate rule is a slug (render-overflow, key-grades); a converter reason is words."""
    return refusals.owner_of(cause) if " " not in cause else refusals.CONVERTER


def _beads(found: Iterable[str | None]) -> str | None:
    beads = sorted({b for b in found if b})
    return ", ".join(beads) if beads else None


def _by_rule(assigned: Mapping[tuple[str, str | None], str]) -> dict[str, list[str]]:
    """rule -> the beads `refusals assign` wrote for it, on any question type."""
    out: dict[str, list[str]] = {}
    for (rule, _qtype), bead in assigned.items():
        out.setdefault(rule, []).append(bead)
    return out


def _counts(raw: Any) -> dict[str, int]:
    """A {key: n} block of readiness.json, its keys normalized as the converter's causes are."""
    out: Counter[str] = Counter()
    if isinstance(raw, Mapping):
        for key, value in raw.items():
            if isinstance(value, int) and value > 0:
                out[refusals.cause_of(str(key))] += value
    return dict(out)


def _rows(
    counts: Mapping[str, int],
    key: str,
    beads: Mapping[str, Iterable[str | None]],
    *,
    owners: bool,
) -> list[dict[str, Any]]:
    rows = []
    for name, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        row: dict[str, Any] = {key: name, "items": n}
        if owners:
            row["owner"] = _owner(name)
        row["issue"] = _beads(beads.get(name, ()))
        rows.append(row)
    return rows


def _report(
    language: str,
    *,
    source: str,
    file: Path,
    counts: Mapping[str, int],
    waiting: Mapping[str, int],
    refused: Mapping[str, int],
    beads: Mapping[str, Iterable[str | None]],
    readmitted: Mapping[str, int] | None,
    warnings: Mapping[str, int] | None,
    generated_at: str | None,
    rules_version: str | None,
    sets: Mapping[str, Any] | None,
) -> dict[str, Any]:
    return {
        "language": language,
        "source": source,
        "file": str(file),
        "generated_at": generated_at,
        "rules_version": rules_version,
        "items": counts["items"],
        "ready": counts["ready"],
        "not_checked": counts["not_checked"],
        "flagged": counts["flagged"],
        "waiting": {
            "items": sum(waiting.values()),
            "by_reason": _rows(waiting, "reason", beads, owners=False),
        },
        "refused": {
            "items": sum(refused.values()),
            "by_cause": _rows(refused, "cause", beads, owners=True),
        },
        "readmitted": None
        if readmitted is None
        else [
            {"cause": c, "items": n}
            for c, n in sorted(readmitted.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
        "warnings": None
        if warnings is None
        else [
            {"kind": k, "items": n}
            for k, n in sorted(warnings.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
        "sets": _sets(sets),
    }


def _sets(sets: Any) -> dict[str, Any] | None:
    """{indexed, skipped_no_ready: [set_id, ...]}; a count where the ids should be stays a count."""
    if not isinstance(sets, Mapping):
        return None
    skipped = sets.get("skipped_no_ready")
    return {
        "indexed": sets.get("indexed"),
        "skipped_no_ready": [str(i) for i in skipped] if isinstance(skipped, list) else skipped,
    }


def _from_file(raw: Mapping[str, Any], language: str, path: Path) -> dict[str, Any]:
    block: Mapping[str, Any] = raw["languages"][language]
    beads: dict[str, list[str | None]] = {
        rule: list(found) for rule, found in _by_rule(refusals.assigned_shapes(language)).items()
    }
    issues = block.get("issues")
    if isinstance(issues, Mapping):
        for cause, bead in issues.items():
            beads.setdefault(refusals.cause_of(str(cause)), []).append(str(bead))
            beads.setdefault(str(cause), []).append(str(bead))
    readmitted = block.get("readmitted")
    warnings = block.get("warnings")

    def number(key: str) -> int:
        value = block.get(key)
        return value if isinstance(value, int) else 0

    return _report(
        language,
        source=FROM_FILE,
        file=path,
        counts={k: number(k) for k in ("items", "ready", "not_checked", "flagged")},
        waiting=_counts(block.get("waiting")),
        refused=_counts(block.get("refused")),
        beads=beads,
        readmitted=_counts(readmitted) if isinstance(readmitted, Mapping) else None,
        warnings={str(k): v for k, v in warnings.items() if isinstance(v, int) and v > 0}
        if isinstance(warnings, Mapping)
        else None,
        generated_at=raw.get("generated_at"),
        rules_version=raw.get("rules_version"),
        sets=raw.get("sets"),
    )


def _computed(language: str) -> dict[str, Any]:
    converted, verdicts = refusals.classify(language)
    beads: dict[str, list[str | None]] = {
        rule: list(found) for rule, found in _by_rule(refusals.assigned_shapes(language)).items()
    }
    waiting: Counter[str] = Counter()
    refused: Counter[str] = Counter()
    for verdict in verdicts:
        if verdict.kind == "waiting":
            waiting[str(verdict.cause)] += 1
        elif verdict.kind == "refused":
            refused[str(verdict.cause)] += 1
        else:
            continue
        beads.setdefault(str(verdict.cause), []).append(verdict.issue)
    kinds = Counter(v.kind for v in verdicts)
    return _report(
        language,
        source=COMPUTED,
        file=converted,
        counts={
            "items": len(verdicts),
            "ready": kinds["ready"],
            "not_checked": kinds["not_checked"],
            "flagged": kinds["flagged"],
        },
        waiting=waiting,
        refused=refused,
        beads=beads,
        readmitted=None,
        warnings=None,
        generated_at=None,
        rules_version=_rules_version(converted),
        sets=_sets_from_pages(),
    )


def _rules_version(converted: Path) -> str | None:
    """The rules version the converted file's newest stamp names, when one does."""
    raw = refusals.read_json(converted, "converted items file")
    listed = raw.get("items") if isinstance(raw, Mapping) else None
    for item in listed if isinstance(listed, list) else []:
        status = item.get("status") if isinstance(item, Mapping) else None
        if isinstance(status, Mapping) and status.get("rules_version"):
            return str(status["rules_version"])
    return None


def _sets_from_pages() -> dict[str, Any] | None:
    """{indexed, skipped_no_ready: [set_id, ...]} from the set pages in JADWIGO_BANK_DIR: a page
    whose ready count is 0 in every language is skipped; one built before the stamp is indexed."""
    root = settings_keys.setting(settings_keys.JADWIGO_BANK_DIR)
    sets = Path(root).expanduser() / "sets" if root else None
    if sets is None or not sets.is_dir():
        return None
    indexed = 0
    skipped: list[str] = []
    for path in sorted(sets.rglob("*.json")):
        try:
            page = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        page_items = page.get("items") if isinstance(page, Mapping) else None
        if not isinstance(page_items, Mapping):
            continue
        ready = (page_items.get("count") or {}).get("ready")
        if isinstance(ready, Mapping) and not any(ready.values()):
            skipped.append(str(page.get("id") or path.stem))
        else:
            indexed += 1
    return {"indexed": indexed, "skipped_no_ready": skipped}


def _readiness_file() -> tuple[Path, Mapping[str, Any] | None]:
    path = readiness_path()
    raw = refusals.read_json(path, "readiness file")
    if raw is not None and not (
        isinstance(raw, Mapping) and isinstance(raw.get("languages"), Mapping)
    ):
        raise JwError(
            f"{path} is not a readiness file",
            hint="It holds {generated_at, rules_version, languages: {pl, en}, sets}; "
            "`make ready` in the bank repo writes it.",
        )
    return path, raw


def report(language: str = "pl", *, computed: bool = False) -> dict[str, Any]:
    """`jw question readiness --lang <language> --json`: one language's report."""
    path, raw = (readiness_path(), None) if computed else _readiness_file()
    if raw is not None and isinstance(raw["languages"].get(language), Mapping):
        return _from_file(raw, language, path)
    return _computed(language)


def reports(languages: Iterable[str] | None = None, *, computed: bool = False) -> dict[str, Any]:
    """`jw question readiness --json`: a report per language. With no language named, each one
    readiness.json holds, else pl and en; a language with nothing to read says so instead."""
    if languages is not None:
        return {"languages": [report(lang, computed=computed) for lang in languages]}
    _path, raw = (readiness_path(), None) if computed else _readiness_file()
    named = [str(k) for k in raw["languages"]] if raw is not None else []
    out = []
    for lang in [*named, *(lang for lang in LANGUAGES if lang not in named)]:
        try:
            out.append(report(lang, computed=computed))
        except JwError as exc:
            out.append({"language": lang, "missing": str(exc)})
    return {"languages": out}


def _stamp(path: Path | None) -> tuple[int, int] | None:
    if path is None:
        return None
    try:
        stat = path.stat()
    except OSError:
        return None
    return stat.st_mtime_ns, stat.st_size


@cache
def _causes(language: str, _stamps: tuple[Any, ...]) -> dict[str, tuple[str, str | None]]:
    _converted, verdicts = refusals.classify(language)
    out: dict[str, tuple[str, str | None]] = {}
    for v in verdicts:
        if v.kind == "ready":
            continue
        label = f"waiting: {v.cause}" if v.kind == "waiting" else str(v.cause)
        out[v.id] = (label, v.issue)
    return out


def item_causes(language: str) -> dict[str, tuple[str, str | None]]:
    """id -> (cause, bead) for each item of `language` that is not lesson-ready; read again when
    a file it comes from changes."""
    converted = refusals.converted_file(language)
    stamps = tuple(
        _stamp(p)
        for p in (
            converted,
            refusals.refused_path(converted),
            refusals.sidecar_path(converted),
            items.refusals_path(language),
        )
    )
    return _causes(language, stamps)


def dominant_cause(item_ids: Iterable[str], language: str) -> str | None:
    """`<cause>, <n> of <m> items (<bead>)`: what most of these items share, or None when the
    files cannot say."""
    ids = list(dict.fromkeys(item_ids))
    if not ids or language not in LANGUAGES:
        return None
    try:
        causes = item_causes(language)
    except JwError:
        return None
    found = [causes[i] for i in ids if i in causes]
    if not found:
        return None
    (label, n), *_ = Counter(cause for cause, _ in found).most_common(1)
    bead = _beads(issue for cause, issue in found if cause == label)
    if bead is None:
        bead = _beads(_by_rule(refusals.assigned_shapes(language)).get(label, ()))
    return f"{label}, {n} of {len(ids)} items" + (f" ({bead})" if bead else "")
