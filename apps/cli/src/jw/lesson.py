"""A lesson draft from a parent's request, and the check that turns it into a lesson file
(dl-e8ov.5.38.4, reshaped by dl-e8ov.5.38.10).

Two steps, each one MCP tool and one `jw lesson` verb:

1. `draft(request, grade, ..., names=[...], topic=...)` guards the request and the topic
   (`jw.pii.guard`), searches the bank with the guarded topic as a need's words, fetches each
   row's set page, draws the questions (`jw.draw`, the provisional practice rule,
   `rule_settled` false), and loads each drawn item's family step
   (`jw.items.load_item`). Each question is copied whole: family, data, key, say, pictures, and
   the source's help (hints with their pictures, worked lines), so the copy plays as is
   (jadwigo-ai-workflows/decisions/2026-10-30-lesson-from-the-bank-copies-the-bank-question-whole-then-adapts).
   The draft is kept on this machine under a `draft_id`: its lesson file as copied is written to
   `<JADWIGO_DRAFTS_DIR>/<draft_id>.json` and run through check.ts once for each step's mistake
   classes, its check written beside it as `<draft_id>.check.json`, and a slim view comes back: per question its
   prompt, data with picture alts, key, the copied help as text, which rung each copied part
   fills, what the agent still writes, and the mistake classes its `boost_by_mistake` may name.
2. `check(draft_id, words={step_id: {...}}, title?, reasoning?)` takes only the agent's words:
   what the bank lacks (the twin, `boost_by_mistake`, a rung the copy leaves empty) and, on the
   parent's request, `changes` to a copied part, each one recorded in `based_on.changes`. It
   assembles the lesson file (`packages/lesson-import/src/lesson-file.ts`), rewrites
   `<draft_id>.json` with it as far as it goes, runs `bun packages/lesson-import/src/check.ts
   <file> --json` in the jadwigo checkout (`JADWIGO_REPO_DIR`), writes `<draft_id>.check.json`,
   and returns the card a parent reads, or the findings by step id.

Both files are written on every call, before the call returns, so the live lesson builder's page
(dl-a38n) renders the draft from the first call. jw's own record of a draft (the questions with
their mistake classes, the request, the draw) is kept apart, in `<JADWIGO_DRAFTS_DIR>/.jw/`. A
finding is `{step_id, path, level, rule, text, fix}` (`packages/lesson-import/src/findings.ts`):
check.ts's own when it sends them (dl-a38n.14), else each of its errors as one with rule `compile`;
words jw refuses before check.ts runs are findings with rule `words`.

A word a child reads is the bank's, copied, or the calling agent's, in the lesson's language; the
tools copy, draw, assemble and check. A tool's own text (errors, `reasoning`) is in English.

The request leaves the machine only guarded. The bank turns a need's words into model input
(an embedding and a rerank), so `draft` takes the names the family uses from the calling agent,
required, and replaces them with placeholders before the search
(jadwigo-hackathon/decisions/2026-10-29-lesson-draft-takes-the-family-s-names-from-the-calling-agent-and).
The draft's `request`, the lesson file's id, title and reasoning are built from the guarded text;
the raw request and the names are used in-process only and never stored, echoed or logged.

An item `load_item` refuses (waiting for its family step, or missing from the file) goes to
`left_out` with its reason, and the draw runs again with the refused ids in `flagged`, until every
drawn item loads or the sets run out. Drawing again, rather than over-drawing and trimming, keeps
the draw's variety rule over the questions that are actually asked.
"""

from __future__ import annotations

import copy
import dataclasses
import datetime as dt
import json
import os
import re
import secrets
import shutil
import subprocess
import unicodedata
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from typing import Any

from jw import bank_client, items, pii, settings_keys
from jw.commands import question
from jw.draw import DRAW_RULES, Draw, draw
from jw.errors import JwError

RUNGS = ("look", "boost", "almost", "worked")
RUNG_NO = {"look": 1, "boost": 2, "almost": 3, "worked": 4}
# The rungs a step needs, from the copy or the agent; the player skips an empty `almost`.
NEEDED = ("look", "boost", "worked")
AGENT_KEYS = (*RUNGS, "boost_by_mistake", "twin", "changes")
# A change sets one of these copied parts of a step, or a part under one, by a dotted path.
EDITABLE = ("say", "data", "key", "hints", "worked", "almost")
CHANGE_KINDS = ("numbers", "context", "wording", "tutor_notes")  # BasedOn in records.ts
TIMES_RULE = "times_table"  # RuleRef's multiplication rule, packages/contracts stem.ts
# The change kind the rule is recorded under: BasedOn has no kind for a key's rule, and the rule
# only classifies misses for the help, which is closest to the notes a tutor reads.
RULE_CHANGE = "tutor_notes"
CATEGORY = "child"  # a drafted lesson is for a child; the set pages carry no category
SKILL_ID_RE = re.compile(r"^[a-z]+(\.[a-z0-9-]+)+$")  # SkillId in packages/contracts records.ts
DRAFT_ID_RE = re.compile(r"^draft_[0-9a-f]{12}$")
# The bank's enrichment marks a skill id it has not settled; the mark is not part of the id.
PROPOSED = "proposed:"
CHECK_TIMEOUT_SECS = 120
STATE_DIR = ".jw"  # jw's own record of each draft, under the drafts directory
IMPORT_TARGET = "lesson-import"  # the Makefile target that imports a lesson file

# What `check` runs: argv in, an object with `returncode`, `stdout` and `stderr` out.
Runner = Callable[[list[str]], Any]


# ---------------------------------------------------------------- the copy -------


def _answer_words(q: Mapping[str, Any]) -> list[str]:
    """The answer's words, as packages/core's `answerWords` reads them (decimals and fractions
    printed another way are not matched here)."""
    key = q.get("key") or {}
    data = q.get("data") or {}
    out: list[str] = []
    if q.get("family") == "enter":
        out += [str(v) for v in key.get("accept") or []]
    elif q.get("family") == "slots":
        gaps = {g.get("id"): g for g in data.get("gaps") or [] if isinstance(g, Mapping)}
        for gap_id, answer in (key.get("gaps") or {}).items():
            out += [str(v) for v in answer.get("accept") or []]
            options = (gaps.get(gap_id) or {}).get("options") or []
            out += [str(o["label"]) for o in options if o.get("id") in answer.get("correct", [])]
    elif q.get("family") == "choose":
        for option in data.get("options") or []:
            content = option.get("content") or {}
            shown = content.get("text", content.get("number"))
            if option.get("id") in key.get("correct", []) and shown is not None:
                out.append(str(shown))
    return [w for w in out if w.strip()]


def _gives_away(text: str, answers: Sequence[str]) -> bool:
    """Whether `text` prints an answer word on its own, as packages/core's `givesAway`."""
    return any(
        re.search(rf"(^|[\W_]){re.escape(a.strip())}($|[\W_])", text, re.IGNORECASE)
        for a in answers
    )


def _hints_on_ladder(q: Mapping[str, Any]) -> dict[int, list[int]]:
    """Which hint (by index) the player shows on which rung, as packages/core's `hintsOnLadder`:
    the first two on rungs 1 and 2, the rest before the last on rung 3, the last on rung 4. A hint
    that prints the answer, and every hint after it, waits for rung 3."""
    out: dict[int, list[int]] = {1: [], 2: [], 3: [], 4: []}
    hints = (q.get("help") or {}).get("hints") or []
    answers = _answer_words(q)
    early = 1
    for i, hint in enumerate(hints):
        if i == len(hints) - 1:
            out[4].append(i)
        elif early < 3 and not _gives_away(str(hint.get("text") or ""), answers):
            out[early].append(i)
            early += 1
        else:
            early = 3
            out[3].append(i)
    return out


def _copied_help(q: Mapping[str, Any]) -> dict[str, Any]:
    """The source's help whole (hints with their pictures, worked lines), and `almost` as `worked`
    with its last line blank when no hint reaches rung 3."""
    source = q.get("help")
    help_ = copy.deepcopy(dict(source)) if isinstance(source, Mapping) else {}
    worked = help_.get("worked") or []
    if "almost" not in help_ and not _hints_on_ladder({**q, "help": help_})[3] and len(worked) > 1:
        help_["almost"] = [*worked[:-1], ""]
    return help_


def _copied_rungs(q: Mapping[str, Any]) -> dict[str, str | None]:
    """What fills each rung of a question, in words, or None where nothing does yet."""
    help_ = q.get("help") or {}
    on = _hints_on_ladder(q)

    def hints(rung: int) -> str | None:
        return ", ".join(f"hint {i + 1}" for i in on[rung]) or None

    worked = "worked lines" if help_.get("worked") else None
    return {
        "look": hints(1) if help_.get("look") is None else "look",
        "boost": hints(2) if help_.get("boost") is None else "boost",
        "almost": hints(3) or ("worked, its last line blank" if help_.get("almost") else None),
        "worked": " and ".join(p for p in (worked, hints(4)) if p) or None,
    }


def _factors(figure: Any) -> tuple[int, int] | None:
    """The 2 whole numbers of a figure that reads plainly `a · b =` (Khan's TeX colours and sizes
    dropped, an `?` after the `=` allowed), or None."""
    text = (figure or {}).get("text") if isinstance(figure, Mapping) else None
    if not isinstance(text, str):
        return None
    plain = text.replace("\\cdot", "·").replace("\\times", "×")
    plain = re.sub(r"\\[A-Za-z]+|[${}]", " ", plain)
    found = re.fullmatch(r"\s*(\d+)\s*[·×]\s*(\d+)\s*=\s*\??\s*", plain)
    return (int(found[1]), int(found[2])) if found else None


def _add_times_rule(q: dict[str, Any]) -> None:
    """Add the multiplication rule to a copied question that is plainly a×b, by code, as a change in
    `based_on.changes` (jadwigo-ai-workflows/decisions/2026-10-30-jw-adds-the-multiplication-
    mistake-rule-by-code-to-a-copied-axb): an enter question whose figure is `a · b` and whose key
    accepts one whole number, a×b, and names no rule yet. Its misses then name their class
    (`add_for_multiply`, `neighbour_row`, ...). Anything else stays as the bank has it."""
    spec = q["question"]
    key = spec.get("key")
    factors = _factors((spec.get("data") or {}).get("figure"))
    if spec.get("family") != "enter" or factors is None or not isinstance(key, Mapping):
        return
    accept = key.get("accept") or []
    a, b = factors
    if "rule" in key or len(accept) != 1 or str(accept[0]).strip() != str(a * b):
        return
    spec["key"] = {**key, "rule": {"rule": TIMES_RULE, "a": a, "b": b, "recent": []}}
    q["based_on"] = copy.deepcopy(q["based_on"])
    q["based_on"]["changes"].append(
        {
            "change": RULE_CHANGE,
            "why": f"jw added the multiplication rule ({a} × {b}) to the key by code, so a miss "
            "names its mistake class",
            "reviewed": False,
        }
    )


def _slim_pictures(value: Any) -> Any:
    """`value` with each picture's labels left out: the bulk of a Khan picture, which a twin or a
    rung never needs."""
    if isinstance(value, list):
        return [_slim_pictures(v) for v in value]
    if isinstance(value, Mapping):
        if "src" in value and "alt" in value:
            return {k: v for k, v in value.items() if k != "labels"}
        return {k: _slim_pictures(v) for k, v in value.items()}
    return value


def _alts(pictures: Any) -> list[str]:
    return [str(p.get("alt")) for p in pictures or [] if isinstance(p, Mapping) and p.get("alt")]


# ---------------------------------------------------------------- the draft ------


def _need(topic: str, grade: str, language: str, skills: Sequence[str]) -> dict[str, Any]:
    """The need the bank is asked (`contracts/need.schema.json`): the guarded topic's words."""
    need: dict[str, Any] = {"language": language, "grade": grade, "words": topic}
    if skills:
        need["skills"] = list(skills)
    return need


def _pages(envelope: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    """Each row's set page. A row with no page is left out by the draw, with that reason."""
    pages: dict[str, dict[str, Any]] = {}
    for row in envelope.get("rows") or []:
        try:
            pages[str(row["id"])] = question.show_page(str(row["id"]))
        except bank_client.SetNotFound:
            continue
    return pages


def _draw_loading(
    envelope: Mapping[str, Any],
    pages: Mapping[str, Mapping[str, Any]],
    *,
    kind: str,
    language: str,
    count: int | None,
    today: dt.date,
) -> tuple[Draw, list[tuple[Any, dict[str, Any]]], dict[str, str]]:
    """Draw, load every drawn item, and draw again without the ones `load_item` refuses."""
    rules = None
    if count is not None:
        rules = {**DRAW_RULES, kind: dataclasses.replace(DRAW_RULES[kind], count=count)}
    refused: dict[str, str] = {}
    while True:
        result = draw(
            envelope,
            pages,
            kind=kind,
            language=language,
            today=today,
            flagged=refused,
            rules=rules,
        )
        loaded: list[tuple[Any, dict[str, Any]]] = []
        new = False
        for drawn in result.questions:
            try:
                loaded.append((drawn, items.load_item(drawn.item_id, language)))
            except JwError as exc:
                refused[drawn.item_id] = str(exc)
                new = True
        if not new:
            return result, loaded, refused


def _slug(text: str) -> str:
    """Lowercase words and dashes, marks dropped (`ł` is `l`), as a lesson file id wants."""
    folded = unicodedata.normalize("NFD", text.replace("ł", "l").replace("Ł", "L"))
    plain = "".join(c for c in folded if not unicodedata.combining(c)).lower()
    words = re.findall(r"[a-z0-9]+", plain)
    return "-".join(words[:8]) or "lesson"


def _skill_ids(skill: str) -> tuple[list[str], str | None]:
    """The step's skill ids, and a note when the drawn skill is left out of them.

    The bank's `proposed:` mark is stripped (owner decision of 2026-10-29: it is the
    enrichment's confidence mark, as the bank's own search drops it). An id that still fails the
    contract's SkillId, such as the set id the draw falls back to, is left out, with the note.
    """
    plain = skill.removeprefix(PROPOSED)
    if SKILL_ID_RE.match(plain.replace("/", ".").lower()):
        return [plain], None
    return [], f"{skill} is not a skill id, so this step names no skill"


def _skills_ids(skills: Sequence[str]) -> tuple[list[str], str | None]:
    """`_skill_ids` over each of the drawn item's skills, with one note for those left out."""
    ids: list[str] = []
    notes: list[str] = []
    for skill in skills:
        found, note = _skill_ids(skill)
        ids += [s for s in found if s not in ids]
        if note:
            notes.append(note)
    return ids, "; ".join(notes) or None


def _skill_label(skill: str) -> str:
    """The skill as the card names it, each of several apart: a proposed one says so."""
    return ", ".join(
        f"{s.removeprefix(PROPOSED)} (proposed)" if s.startswith(PROPOSED) else s
        for s in skill.split(", ")
    )


def drafts_dir() -> Path:
    """Where drafts are written: JADWIGO_DRAFTS_DIR, else ~/.local/state/jadwigo/drafts."""
    return settings_keys.drafts_dir()


def _lesson_path(where: Path, draft_id: str) -> Path:
    return where / f"{draft_id}.json"


def _check_path(where: Path, draft_id: str) -> Path:
    return where / f"{draft_id}.check.json"


def _state_path(where: Path, draft_id: str) -> Path:
    return where / STATE_DIR / f"{draft_id}.json"


def _make_dirs(where: Path) -> None:
    """The drafts directory and jw's record under it, readable by this user only: a draft holds a
    parent's guarded request and the agent's words, and the directory outlives the session."""
    where.mkdir(mode=0o700, parents=True, exist_ok=True)
    (where / STATE_DIR).mkdir(mode=0o700, exist_ok=True)


def _write_json(path: Path, value: Any) -> None:
    """Write `value` whole: to a sibling first, then renamed over `path`, so a reader watching the
    directory never sees half a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_name(f".{path.name}.part")
    part.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(part, path)


def _finding(step_id: str | None, rule: str, message: str, path: str = "") -> dict[str, Any]:
    """One error as a finding (`Finding` in packages/lesson-import/src/findings.ts)."""
    return {"step_id": step_id, "path": path, "level": "error", "rule": rule, "text": message,
            "fix": message}


def _findings(answer: Mapping[str, Any]) -> list[dict[str, Any]]:
    """check.ts's findings, or, before it sends them (dl-a38n.14), its errors as findings."""
    findings = answer.get("findings")
    if isinstance(findings, list):
        return list(findings)
    return [
        _finding(e.get("step_id"), "compile", str(e.get("message", "")))
        for e in answer.get("errors") or []
    ]


def _write_check(
    where: Path,
    stored: Mapping[str, Any],
    ok: bool,
    findings: list[dict[str, Any]],
    classes: Any = None,
) -> None:
    """`<draft_id>.check.json`: `{ok, findings, mistake_classes, checked_at}`. The classes are
    check.ts's when it sent them, else the draft's (null for a step whose classes are unknown)."""
    if not isinstance(classes, Mapping):
        classes = {q["step_id"]: q.get("mistake_classes") for q in stored["questions"]}
    _write_json(
        _check_path(where, stored["draft_id"]),
        {
            "ok": ok,
            "findings": findings,
            "mistake_classes": dict(classes),
            "checked_at": dt.datetime.now(dt.UTC).isoformat(timespec="seconds"),
        },
    )


def _to_write(step: Mapping[str, Any]) -> list[str]:
    """What a step still needs from the agent: the twin, a rung nothing fills, and the mistake
    cards when its classes are known."""
    help_ = step["question"].get("help") or {}
    rungs = _copied_rungs(step["question"])
    out = [] if help_.get("twin") else ["twin"]
    out += [r for r in NEEDED if rungs[r] is None]
    if step.get("mistake_classes") and not help_.get("boost_by_mistake"):
        out.append("boost_by_mistake")
    return out


def _slim(q: Mapping[str, Any]) -> dict[str, Any]:
    """One question as the agent reads it: the copy as text, and what is left to write."""
    spec = q["question"]
    help_ = spec.get("help") or {}
    hints = []
    for hint in help_.get("hints") or []:
        hints.append({"text": hint.get("text")})
        if hint.get("pictures"):
            hints[-1]["picture_alts"] = _alts(hint["pictures"])
    copied: dict[str, Any] = {"hints": hints}
    if help_.get("worked") and help_["worked"] != [h["text"] for h in hints]:
        copied["worked"] = help_["worked"]
    out = {
        "step_id": q["step_id"],
        "item_id": q["item_id"],
        "set_id": q["set_id"],
        "skill": q["skill"],
        "family": spec["family"],
        "question_type": q["question_type"],
        "prompt": _prompt(q["say"], spec.get("data")),
        "say": q["say"],
        "data": _slim_pictures(spec["data"]),
        "key": spec["key"],
        "copied_help": copied,
        "rungs": _copied_rungs(spec),
        "you_write": _to_write(q),
        "mistake_classes": q.get("mistake_classes"),
        "why_drawn": q["why_drawn"],
    }
    if q.get("skill_note"):
        out["skill_note"] = q["skill_note"]
    return out


def _view(stored: Mapping[str, Any]) -> dict[str, Any]:
    """What lesson_draft returns: the draft's own fields and each question slim."""
    keys = ("draft_id", "request", "need", "grade", "language", "kind", "rule", "rule_settled")
    return {
        **{k: stored[k] for k in keys},
        "title": stored["lesson"]["title"],
        "reasoning": stored["lesson"]["reasoning"],
        "plays_as_copied": stored["plays_as_copied"],
        "copy_errors": stored["copy_errors"],
        "questions": [_slim(q) for q in stored["questions"]],
        "left_out": stored["left_out"],
        "draft_path": stored["draft_path"],
    }


def draft(
    request: str,
    grade: str,
    language: str = "pl",
    kind: str = "practice",
    count: int | None = None,
    skills: Sequence[str] = (),
    *,
    names: Sequence[str] | None,
    topic: str,
    today: dt.date | None = None,
    runner: Runner | None = None,
    folder: Path | None = None,
) -> dict[str, Any]:
    """A lesson draft for `request`: drawn questions copied whole from the bank, kept under a
    `draft_id` in `folder` (JADWIGO_DRAFTS_DIR), and the slim view of it. The lesson file as
    copied, empty rungs and all, is `<draft_id>.json` there before this returns.

    `names` is every name the family uses in the request (the child's, siblings', the parent's),
    required: an empty list says there are none. They are replaced before anything leaves.
    `topic` is what the lesson is about in a few words, distilled from the request by the calling
    agent ("mnożenie"), with no count, grade or name: it is the need's words the bank searches
    (dl-e8ov.5.38.12). The request is kept, guarded, as the draft's record and title.
    """
    if names is None:
        raise JwError(
            "a lesson draft needs the family's names",
            hint="Pass names: every name the family uses in the request, or [] when there is none.",
        )
    family = pii.names_for(members=names)
    request = pii.guard(request.strip(), names=family).text
    if not request:
        raise JwError("a lesson draft needs a request", hint="Say what the lesson is for.")
    topic = pii.guard((topic or "").strip(), names=family).text
    if not topic:
        raise JwError(
            "a lesson draft needs a topic",
            hint='Pass topic: what the lesson is about in a few words, such as "mnożenie".',
        )
    if kind not in DRAW_RULES:
        raise JwError(
            f"unknown lesson kind {kind!r}", hint=f"Use one of {', '.join(DRAW_RULES)}."
        )
    if count is not None and count < 1:
        raise JwError("count must be at least 1", hint="Leave it out for the rule's count.")
    day = today or dt.date.today()
    need = _need(topic, grade, language, skills)
    envelope = question.search_envelope(
        grade=grade, words=topic, skills=list(skills), language=language
    )
    pages = _pages(envelope)
    result, loaded, refused = _draw_loading(
        envelope, pages, kind=kind, language=language, count=count, today=day
    )

    questions: list[dict[str, Any]] = []
    for n, (drawn, view) in enumerate(loaded, start=1):
        spec = view["question"]
        skill_ids, skill_note = _skills_ids(drawn.skills or (drawn.skill,))
        questions.append(
            {
                "step_id": f"q{n}",
                "item_id": drawn.item_id,
                "set_id": drawn.set_id,
                "skill": drawn.skill,
                "skill_ids": skill_ids,
                "question_type": view["question_type"],
                "say": view["say"],
                "question": {
                    "family": spec["family"],
                    "data": spec["data"],
                    "key": spec["key"],
                    "help": _copied_help(spec),
                },
                "credit": view["credit"],
                "based_on": view["based_on"],
                "why_drawn": drawn.reason,
            }
        )
        if skill_note:
            questions[-1]["skill_note"] = skill_note
        _add_times_rule(questions[-1])
    # A refused item's left_out line says why load_item refused it, not that it was flagged.
    left_out = [
        {"id": left.id, "reason": refused.get(left.id, left.reason)} for left in result.left_out
    ]

    used_sets = list(dict.fromkeys(q["set_id"] for q in questions))
    subjects = {str(pages[s].get("subject")) for s in used_sets if pages[s].get("subject")}
    subject = subjects.pop() if len(subjects) == 1 else "math"
    reasoning = (
        f'Drafted for the request "{request}" (grade {grade}): {len(questions)} questions drawn by '
        f"the provisional {kind} rule from {', '.join(used_sets) or 'no set'}, each copied whole "
        "from the bank."
    )
    where = folder or drafts_dir()
    draft_id = f"draft_{secrets.token_hex(6)}"
    stored: dict[str, Any] = {
        "draft_id": draft_id,
        "request": request,
        "need": need,
        "grade": grade,
        "language": language,
        "kind": kind,
        "rule": result.rule,
        "rule_settled": result.rule_settled,
        "lesson": {
            "id": f"{_slug(request)}-{day.isoformat()}",
            "title": request,
            "language": language,
            "category": CATEGORY,
            "subject": subject,
            "reasoning": reasoning,
            "kind": kind,
        },
        "questions": questions,
        "left_out": left_out,
        "draft_path": str(_lesson_path(where, draft_id)),
    }
    _make_dirs(where)
    _check_copy(stored, where, runner)
    _write_json(_state_path(where, draft_id), stored)
    return _view(stored)


def _check_copy(stored: dict[str, Any], where: Path, runner: Runner | None) -> None:
    """Write the lesson as copied, before any twin, and run check.ts on it: whether it plays as
    is, and each step's mistake classes (check.ts's `mistake_classes`, dl-e8ov.5.38.11), written
    to the check file too. Without a checkout or bun the file is written all the same, no check
    file is, and the classes stay unknown (None); before check.ts sends classes, likewise."""
    stored["plays_as_copied"], stored["copy_errors"] = None, []
    path = Path(stored["draft_path"])
    _write_json(path, _file(stored, {}))
    try:
        answer = _run_check(path, runner)
    except JwError:
        return
    stored["plays_as_copied"] = bool(answer.get("ok"))
    stored["copy_errors"] = answer.get("errors") or []
    classes = answer.get("mistake_classes")
    if isinstance(classes, Mapping):
        for q in stored["questions"]:
            q["mistake_classes"] = list(classes.get(q["step_id"]) or [])
    _write_check(where, stored, stored["plays_as_copied"], _findings(answer), classes)


def load_draft(draft_id: str, folder: Path | None = None) -> dict[str, Any]:
    """The draft lesson_draft kept under `draft_id`."""
    where = folder or drafts_dir()
    hint = "Pass the draft_id lesson_draft returned, or call lesson_draft again."
    if not DRAFT_ID_RE.match(draft_id or ""):
        raise JwError(f"{draft_id!r} is not a draft id", hint=hint)
    try:
        stored: dict[str, Any] = json.loads(
            _state_path(where, draft_id).read_text(encoding="utf-8")
        )
    except FileNotFoundError as exc:
        raise JwError(f"no draft {draft_id} in {where}", hint=hint) from exc
    return stored


# ---------------------------------------------------------------- the check ------


def _card(value: Any) -> Any:
    """A rung as a HelpCard: `{text}` as given, or a bare string wrapped."""
    return {"text": value} if isinstance(value, str) else value


def _lines(value: Any) -> Any:
    """`worked` and `almost` as lists of lines: a bare string splits on its line breaks."""
    return value.splitlines() if isinstance(value, str) else value


def _empty(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _twin(given: Mapping[str, Any], family: str) -> dict[str, Any]:
    """The twin as the lesson file holds it: `{say, question: {...}}` reads as `{say, ...}`."""
    twin = dict(given)
    inner = twin.pop("question", None)
    if isinstance(inner, Mapping):
        twin = {**inner, **twin}
    twin.setdefault("family", family)
    return twin


def _set(parts_of: dict[str, Any], path: str, value: Any) -> str | None:
    """Set the copied part at the dotted `path` (`data.stem.text`, `hints.0.text`), or say why
    not. Only a part the copy has can be set."""
    parts = path.split(".")
    if parts[0] not in EDITABLE:
        return f"{path}: a change sets one of {', '.join(EDITABLE)}, or a part under one"
    at: Any = parts_of
    for i, part in enumerate(parts):
        if isinstance(at, list) and part.isdigit() and int(part) < len(at):
            index: Any = int(part)
        elif isinstance(at, dict) and part in at:
            index = part
        else:
            return f"{path}: the copy has no {'.'.join(parts[: i + 1])}"
        if i == len(parts) - 1:
            at[index] = value
        else:
            at = at[index]
    return None


def _changed(step: dict[str, Any], changes: Any) -> list[str]:
    """Apply the agent's changes to the copied parts of `step`, each one recorded in
    `based_on.changes`, and say what is wrong with any of them."""
    if not isinstance(changes, list):
        return ["changes is a list of {change, why, set}"]
    spec = step["question"]
    parts_of = {"say": step["say"], "data": spec["data"], "key": spec["key"], **spec["help"]}
    problems: list[str] = []
    for n, change in enumerate(changes, start=1):
        kind, why, sets = change.get("change"), change.get("why"), change.get("set")
        if kind not in CHANGE_KINDS:
            problems.append(f"changes[{n}].change is one of {', '.join(CHANGE_KINDS)}")
        if not isinstance(why, str) or not why.strip():
            problems.append(f"changes[{n}].why says what the parent asked for")
        if not isinstance(sets, Mapping) or not sets:
            problems.append(f"changes[{n}].set maps a copied part's path to its new value")
            continue
        problems += [f"changes[{n}].set {p}" for k, v in sets.items() if (p := _set(parts_of, k, v))]
        step["based_on"]["changes"].append({"change": kind, "why": why, "reviewed": False})
    step["say"] = parts_of.pop("say")
    spec["data"], spec["key"] = parts_of.pop("data"), parts_of.pop("key")
    spec["help"].update(parts_of)
    return problems


def _apply(q: Mapping[str, Any], given: Mapping[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """The step with the agent's words on it, and what is wrong with them, one message each."""
    step = copy.deepcopy(dict(q))
    spec = step["question"]
    help_ = spec["help"]
    problems = [f"{k} is not a part a step takes; it takes {', '.join(AGENT_KEYS)}"
                for k in given if k not in AGENT_KEYS]
    problems += _changed(step, given.get("changes") or [])
    copied = _copied_rungs(spec)
    for rung in RUNGS:
        if _empty(given.get(rung)):
            continue
        if copied[rung] is not None:
            problems.append(
                f"{rung}: rung {RUNG_NO[rung]} is copied from the bank ({copied[rung]}); edit the "
                "copied part with a change when the parent asks for it, or leave it out"
            )
            continue
        help_[rung] = _card(given[rung]) if rung in ("look", "boost") else _lines(given[rung])
    if not _empty(given.get("boost_by_mistake")):
        help_["boost_by_mistake"] = {k: _card(v) for k, v in given["boost_by_mistake"].items()}
    if not _empty(given.get("twin")):
        help_["twin"] = _twin(given["twin"], spec["family"])
    problems += [f"help.{key} is empty; write it" for key in _to_write(step)]
    return step, problems


def _step(q: Mapping[str, Any]) -> dict[str, Any]:
    """One question step of the lesson file (`QuestionStep` in lesson-file.ts)."""
    return {
        "id": q["step_id"],
        "question_type": q["question_type"],
        "skill_ids": q.get("skill_ids", _skill_ids(str(q["skill"]))[0]),
        "based_on": q["based_on"],
        "say": q["say"],
        "question": q["question"],
        "credit": q["credit"],
    }


def _file(stored: Mapping[str, Any], steps: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
    """The lesson file: the draft's head, and one step per question, from `steps` where given."""
    part = {
        "part": str(stored["lesson"].get("kind") or "practice"),
        "steps": [_step(steps.get(q["step_id"], q)) for q in stored["questions"]],
    }
    return {**stored["lesson"], "script": {"parts": [part]}}


def check_script() -> tuple[Path, Path]:
    """The checkout and its check.ts, or a JwError naming JADWIGO_REPO_DIR."""
    repo = settings_keys.repo_dir()
    hint = (
        f"Set {settings_keys.JADWIGO_REPO_DIR} to a jadwigo-hackathon checkout with "
        "`bun install` run in it."
    )
    if repo is None:
        raise JwError("no jadwigo checkout found for the lesson check", hint=hint)
    script = repo / settings_keys.LESSON_CHECK_SCRIPT
    if not script.is_file():
        raise JwError(f"no {settings_keys.LESSON_CHECK_SCRIPT} in {repo}", hint=hint)
    return repo, script


def _run(repo: Path) -> Runner:
    def run(argv: list[str]) -> Any:
        return subprocess.run(
            argv, cwd=repo, capture_output=True, text=True, timeout=CHECK_TIMEOUT_SECS, check=False
        )

    return run


def _run_check(path: Path, runner: Runner | None) -> dict[str, Any]:
    """Run check.ts on the lesson file at `path` and return its JSON answer."""
    repo, script = check_script()
    bun = "bun"
    if runner is None:
        found = shutil.which("bun")
        if found is None:
            raise JwError(
                "bun is not on PATH, and the lesson check runs check.ts with it",
                hint=f"Install bun (`mise install` in {repo}), or set "
                f"{settings_keys.JADWIGO_REPO_DIR} to a checkout where it runs.",
            )
        bun, runner = found, _run(repo)
    done = runner([bun, str(script), str(path), "--json"])
    try:
        answer: dict[str, Any] = json.loads(done.stdout)
    except (TypeError, ValueError) as exc:
        tail = (done.stderr or done.stdout or "").strip()[-400:]
        raise JwError(
            f"check.ts gave no JSON (exit {done.returncode}): {tail}",
            hint=f"Run `bun {script} {path} --json` in {repo} to see it.",
        ) from exc
    return answer


def check(
    draft_id: str,
    words: Mapping[str, Mapping[str, Any]],
    title: str | None = None,
    reasoning: str | None = None,
    *,
    names: Sequence[str] = (),
    runner: Runner | None = None,
    folder: Path | None = None,
) -> dict[str, Any]:
    """Put the agent's words on the draft kept under `draft_id` and run check.ts on the lesson.

    `title` and `reasoning` pass through `pii.guard` with `names`, the family's names as for
    `draft`, before they are written: a name, an email or a phone number never reaches the file.

    `words` maps each step id to what the agent wrote for it (the lesson_check tool's `help`):
    `twin`, `boost_by_mistake`, a rung the copy leaves empty, and `changes` to a copied part.
    Every step's words are sent on each call. `<draft_id>.json` is rewritten with them first, as
    far as they go, and `<draft_id>.check.json` after. Returns `{"ok": true, "card", "findings",
    "lesson_file", "draft_path", "import_command", "play_path", "lesson_id", "questions"}`, the
    card's `next` saying the import comes before the play path, or `{"ok": false, "findings",
    "errors": [{"step_id", "message"}], "lesson_file", "draft_path"}`. A missing twin or rung is
    an error here (rule `words`), before check.ts runs.
    """
    where = folder or drafts_dir()
    stored = load_draft(draft_id, where)
    if not isinstance(words, Mapping):
        raise JwError("help maps step ids to their words", hint='Pass {"q1": {"twin": ...}, ...}.')
    known = [q["step_id"] for q in stored["questions"]]
    errors = [
        {"step_id": s, "message": f"no step {s} in {draft_id}; its steps are {', '.join(known)}"}
        for s in words
        if s not in known
    ]
    steps: dict[str, dict[str, Any]] = {}
    for q in stored["questions"]:
        given = words.get(q["step_id"]) or {}
        if not isinstance(given, Mapping):
            errors.append({"step_id": q["step_id"], "message": "a step's words are an object"})
            continue
        steps[q["step_id"]], problems = _apply(q, given)
        errors += [{"step_id": q["step_id"], "message": p} for p in problems]

    guard_names = pii.names_for(members=list(names))
    for field, value in (("title", title), ("reasoning", reasoning)):
        if value is not None and value.strip():
            stored["lesson"][field] = pii.guard(value.strip(), names=guard_names).text
    _make_dirs(where)
    path = _lesson_path(where, draft_id)
    _write_json(path, _file(stored, steps))
    paths = {"lesson_file": str(path), "draft_path": str(path)}
    if errors:
        at = {s: f"script.parts[0].steps[{n}]" for n, s in enumerate(known)}
        findings = [
            _finding(e["step_id"], "words", e["message"], at.get(e["step_id"], ""))
            for e in errors
        ]
        _write_check(where, stored, False, findings)
        return {"ok": False, "findings": findings, "errors": errors, **paths}

    answer = _run_check(path, runner)
    findings = _findings(answer)
    _write_check(where, stored, bool(answer.get("ok")), findings, answer.get("mistake_classes"))
    if not answer.get("ok"):
        return {"ok": False, "findings": findings, "errors": answer.get("errors") or [], **paths}
    play_path = answer.get("play_path")
    import_step = _import_step(path, play_path)
    return {
        "ok": True,
        "card": {**card({**stored, "questions": [steps[s] for s in known]}), "next": import_step},
        "findings": findings,
        **paths,
        "import_command": import_step["command"],
        "play_path": play_path,
        "lesson_id": answer.get("lesson_id"),
        "questions": answer.get("questions"),
    }


def _import_step(path: Path, play_path: Any) -> dict[str, Any]:
    """What comes after a clean check: the import into jadwigo-dev, then the play path, which
    exists only once the import has run (dl-e8ov.5.38.13)."""
    repo = settings_keys.repo_dir()
    command = f"make {IMPORT_TARGET} FILE={path} ENV=dev"
    return {
        "command": command,
        "run_in": str(repo) if repo else None,
        "then_play": play_path,
        "says": f"Import the lesson first: {command}, from the jadwigo checkout"
        + (f" ({repo})" if repo else "")
        + f". Only then does it play at {play_path}; before the import that path does not exist.",
    }


# ---------------------------------------------------------------- the card -------


def _prompt(say: Any, data: Mapping[str, Any] | None) -> str:
    """The say line and the stem's words, each once."""
    data = data or {}
    parts = [say, (data.get("stem") or {}).get("text"), (data.get("figure") or {}).get("text")]
    seen: list[str] = []
    for part in parts:
        if isinstance(part, str) and part.strip() and part.strip() not in seen:
            seen.append(part.strip())
    return " | ".join(seen)


def _text(card_: Any) -> Any:
    return card_.get("text") if isinstance(card_, Mapping) else card_


def _rungs(spec: Mapping[str, Any]) -> dict[str, Any]:
    """Each rung as the player shows it: the card written for it, else the hints it maps there."""
    help_ = spec.get("help") or {}
    hints = help_.get("hints") or []
    on = _hints_on_ladder(spec)

    def mapped(rung: int) -> list[str]:
        return [str(hints[i].get("text")) for i in on[rung]]

    return {
        "look": _text(help_.get("look")) or " / ".join(mapped(1)) or None,
        "boost": _text(help_.get("boost")) or " / ".join(mapped(2)) or None,
        "almost": _lines(help_.get("almost")) or mapped(3) or None,
        "worked": [*(_lines(help_.get("worked")) or []), *mapped(4)] or None,
    }


def card(filled: Mapping[str, Any]) -> dict[str, Any]:
    """What a parent reads before the lesson plays: each question, its key, rungs, twin, source,
    and the changes made to the bank's copy."""
    out = []
    for n, q in enumerate(filled.get("questions") or [], start=1):
        spec = q["question"]
        twin = (spec.get("help") or {}).get("twin") or {}
        credit = q.get("credit") or {}
        source = " ".join(str(credit[k]) for k in ("source", "ref", "url") if credit.get(k))
        out.append(
            {
                "n": n,
                "step_id": q.get("step_id"),
                "skill": _skill_label(str(q.get("skill") or "")),
                "prompt": _prompt(q.get("say"), spec.get("data")),
                "key": spec.get("key"),
                "rungs": _rungs(spec),
                "twin": {"prompt": _prompt(twin.get("say"), twin.get("data")), "key": twin.get("key")},
                "source": source,
                "licence": credit.get("licence"),
                "changes": list((q.get("based_on") or {}).get("changes") or []),
                "why_drawn": q.get("why_drawn"),
            }
        )
    return {"questions": out, "left_out": list(filled.get("left_out") or [])}


def _key_text(key: Any) -> str:
    if isinstance(key, Mapping):
        for field in ("accept", "correct"):
            if field in key:
                return ", ".join(str(v) for v in key[field])
    return json.dumps(key, ensure_ascii=False)


def card_text(card_: Mapping[str, Any]) -> str:
    """The card as plain lines, for the verbs without `--json`."""
    lines: list[str] = []
    for q in card_.get("questions") or []:
        rungs = q["rungs"]
        lines += [
            f"{q['n']}. {q['prompt']}",
            f"   skill: {q['skill']}",
            f"   key: {_key_text(q['key'])}",
            f"   look: {rungs['look']}",
            f"   boost: {rungs['boost']}",
            f"   almost: {' / '.join(rungs['almost'] or [])}",
            f"   worked: {' / '.join(rungs['worked'] or [])}",
            f"   twin: {q['twin']['prompt']} (key: {_key_text(q['twin']['key'])})",
            f"   source: {q['source']} ({q['licence']})",
        ]
        lines += [f"   changed ({c['change']}): {c['why']}" for c in q.get("changes") or []]
        lines.append(f"   why: {q['why_drawn']}")
    left = card_.get("left_out") or []
    if left:
        lines.append("left out:")
        lines += [f"   {item['id']}: {item['reason']}" for item in left]
    step = card_.get("next")
    if step:
        lines += [f"next: {step['says']}"]
    return "\n".join(lines)
