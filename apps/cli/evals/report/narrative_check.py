"""What a report's narrative must get right against its digest, checked by code (dl-e8ov.5.45).

`findings(digest, narrative)` returns one line per problem in a narrative `/jadwigo-report-write`
wrote, `[]` when there is none. It mirrors the rules `ReportNarrative` documents in
packages/contracts/src/records.ts and the validator the dream script and `PATCH
/api/v1/learners/{id}/reports/{report}` run (dl-e8ov.5.44):

- every citation is in the digest: an attempt id, a skill code or a goal id the digest names, as a
  citation or as a field (a skill that moved, a brief entry, a goal);
- every number in the text is one of the digest's numbers: its counts, a mistake's times, or a
  number inside one of its skill codes (`maths.multiplication.row-7` gives 7, so "mnożenie przez 7"
  may be said). An id's characters are never numbers the parent was given;
- no level name, in English or Polish (Khan's names, decision jadwigo-hackathon 2026-10-29), and
  no score, percentage or countdown;
- the 2 standing questions answered once each, each answer with a citation;
- at most 3 proposals, each a proposal id of the digest, once; at most 2 asks;
- the lengths and the `made_by` the schema sets.

It judges the words against the digest, never a child's answer, and calls no model. Whether the
Polish reads well to a parent is still the owner's read. From a shell, on what `make dream`
printed (a report or a bare digest) and the narrative file:

    cd apps/cli && uv run --frozen python evals/report/narrative_check.py <report.json> <narrative.json>
"""

from __future__ import annotations

import json
import re
import sys
from collections.abc import Iterator, Mapping
from pathlib import Path
from typing import Any

STANDING = ("skills_standing", "next_focus")
LANGUAGES = ("pl", "en", "uk")
MAX_PROPOSALS = 3
MAX_ASKS = 2
LIMITS = {"headline": 140, "direction_now": 500, "answer": 600, "claim": 200, "rationale": 400,
          "ask": 200, "why": 300}

# The level names (MasteryLevel in packages/contracts) and their Polish forms. A parent never reads
# one: "opanowane", "biegle", "zaznajomiony", "podjęto próbę", "nie rozpoczęto" in any form.
LEVEL = re.compile(
    r"(?<!\w)("
    r"mastered|proficient|proficiency|familiar|attempted|not[ _-]started"
    r"|opanow\w*|biegł\w*|biegl\w*|zaznajom\w*|nie\s*rozpocz\w*|nierozpocz\w*"
    r"|podję\w*\s+prób\w*|podjet\w*\s+prob\w*|próbowan\w*"
    r")(?!\w)",
    re.IGNORECASE,
)
# No score, percentage, streak or countdown (the wave's stop rules), and never a bare "wrong".
SCORE = re.compile(
    r"%|(?<!\w)(procent\w*|punkt(y|ów|ach|ami)?|wynik\w*|score\w*|percent\w*|streak\w*"
    r"|odlicz\w*|zostało\s+\d+\s+dni\w*|źle)(?!\w)",
    re.IGNORECASE,
)
NUMBER = re.compile(r"\d+")


def _citations(value: Any) -> Iterator[Mapping[str, Any]]:
    """Every citation object under `value`."""
    if isinstance(value, Mapping):
        if value.get("kind") in ("attempt", "skill", "goal") and len(value) == 2:
            yield value
        for v in value.values():
            yield from _citations(v)
    elif isinstance(value, list):
        for v in value:
            yield from _citations(v)


def _key(c: Mapping[str, Any]) -> tuple[str, str]:
    field = {"attempt": "attempt_id", "skill": "skill_code", "goal": "goal_id"}[c["kind"]]
    return c["kind"], str(c.get(field))


def cited(digest: Mapping[str, Any]) -> set[tuple[str, str]]:
    """What a narrative may cite: every attempt, skill code and goal the digest names."""
    keys = {_key(c) for c in _citations(digest)}
    keys |= {("attempt", m["attempt_id"]) for m in digest.get("skills_moved") or []}
    skills = {m["skill_code"] for m in digest.get("skills_moved") or []}
    skills |= {n["skill_code"] for n in digest.get("needs_attention") or []}
    skills |= {s for m in digest.get("mistakes") or [] for s in m.get("skill_codes") or []}
    skills |= {s for p in digest.get("proposals") or [] for s in p.get("skill_codes") or []}
    brief = digest.get("brief") or {}
    entries = list(brief.get("entries") or [])
    if isinstance(brief.get("school"), list):
        entries += brief["school"]
    skills |= {e["skill_code"] for e in entries}
    goals = {g for e in entries for g in e.get("goal_ids") or []}
    goals |= {g["goal_id"] for g in digest.get("goals") or []}
    return keys | {("skill", s) for s in skills} | {("goal", g) for g in goals}


def numbers(digest: Mapping[str, Any]) -> set[int]:
    """The numbers a narrative may say: the counts, each mistake's times, and the numbers inside
    the digest's skill codes. Never an id's characters or a date."""
    found = {int(v) for v in (digest.get("counts") or {}).values()}
    found |= {int(m["times"]) for m in digest.get("mistakes") or []}
    found |= {int(n) for kind, code in cited(digest) if kind == "skill" for n in NUMBER.findall(code)}
    return found


def texts(narrative: Mapping[str, Any]) -> Iterator[tuple[str, str]]:
    """(where, text) for every sentence a parent reads."""
    for field in ("headline", "direction_now"):
        yield field, str(narrative.get(field) or "")
    for a in narrative.get("answers") or []:
        yield f"answer {a.get('question')}", str(a.get("answer") or "")
    for p in narrative.get("proposals") or []:
        for field in ("claim", "rationale"):
            yield f"proposal {p.get('proposal_id')} {field}", str(p.get(field) or "")
    for i, a in enumerate(narrative.get("asks") or [], 1):
        for field in ("ask", "why"):
            yield f"ask {i} {field}", str(a.get(field) or "")


def _lengths(narrative: Mapping[str, Any]) -> Iterator[str]:
    for where, text in texts(narrative):
        field = where.rsplit(" ", 1)[-1] if " " in where else where
        if where.startswith("answer "):
            field = "answer"
        limit = LIMITS[field]
        if len(text) > limit:
            yield f"{where} is {len(text)} characters, over {limit}"
        if field in ("headline", "direction_now", "answer") and not text.strip():
            yield f"{where} is empty"


def findings(digest: Mapping[str, Any], narrative: Mapping[str, Any]) -> list[str]:
    out: list[str] = []
    allowed = cited(digest)
    said = numbers(digest)

    if narrative.get("language") not in LANGUAGES:
        out.append(f"language {narrative.get('language')!r} is not one of {', '.join(LANGUAGES)}")
    if not str(narrative.get("made_by") or "").strip():
        out.append("made_by is empty: name the workflow and the model")
    out.extend(_lengths(narrative))

    asked = [a.get("question") for a in narrative.get("answers") or []]
    for q in STANDING:
        if asked.count(q) != 1:
            out.append(f"the standing question {q} is answered {asked.count(q)} times, not once")
    for q in asked:
        if q not in STANDING:
            out.append(f"answers a question the report does not ask: {q}")

    ids = [p.get("id") for p in digest.get("proposals") or []]
    proposals = narrative.get("proposals") or []
    if len(proposals) > MAX_PROPOSALS:
        out.append(f"{len(proposals)} proposals, more than {MAX_PROPOSALS}")
    seen: set[str] = set()
    for p in proposals:
        pid = p.get("proposal_id")
        if pid not in ids:
            out.append(f"proposal {pid} is not a proposal of the digest ({', '.join(map(str, ids)) or 'none'})")
        if pid in seen:
            out.append(f"proposal {pid} is worded twice")
        seen.add(str(pid))
    if len(narrative.get("asks") or []) > MAX_ASKS:
        out.append(f"{len(narrative.get('asks') or [])} asks, more than {MAX_ASKS}")

    for where, items in [
        *((f"answer {a.get('question')}", a.get("citations")) for a in narrative.get("answers") or []),
        *((f"proposal {p.get('proposal_id')}", p.get("citations")) for p in proposals),
    ]:
        if not items:
            out.append(f"{where} cites nothing")
        for c in items or []:
            if c.get("kind") not in ("attempt", "skill", "goal") or _key(c) not in allowed:
                out.append(f"{where} cites {json.dumps(c, ensure_ascii=False)}, which the digest does not name")

    for where, text in texts(narrative):
        for n in NUMBER.findall(text):
            if int(n) not in said:
                out.append(f"{where} says {n}, a number the digest did not give")
        for m in LEVEL.finditer(text):
            out.append(f"{where} names a level: {m[0]!r}")
        for m in SCORE.finditer(text):
            out.append(f"{where} reads as a score, percentage, countdown or verdict: {m[0]!r}")
    return out


def _digest(value: Mapping[str, Any]) -> Mapping[str, Any]:
    """A report as `make dream` prints it holds its digest; a bare digest is itself."""
    return value["digest"] if "digest" in value else value


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: narrative_check.py <report-or-digest.json> <narrative.json>")
    report, narrative = (json.loads(Path(p).read_text(encoding="utf-8")) for p in sys.argv[1:])
    problems = findings(_digest(report), narrative)
    for line in problems:
        print(line)
    sys.exit(1 if problems else 0)
