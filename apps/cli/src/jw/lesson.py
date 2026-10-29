"""A lesson draft from a parent's request, and the check that turns it into a lesson file (dl-e8ov.5.38.4).

Two steps, each one MCP tool and one `jw lesson` verb:

1. `draft(request, grade, ..., names=[...])` guards the request (`jw.pii.guard`), searches the bank
   with the guarded words as a need, fetches each row's
   set page, draws the questions (`jw.draw`, the provisional practice rule, `rule_settled` false),
   and loads each drawn item's family step (`jw.items.load_item`). It returns the draft: per
   question the step, the key, the item's own hints and worked lines as `material`, the credit and
   `based_on`, why it was drawn, and an empty `help` the calling agent fills.
2. `check(draft)` assembles the lesson file (`packages/lesson-import/src/lesson-file.ts`) from the
   filled draft, writes it, runs `bun packages/lesson-import/src/check.ts <file> --json` in the
   jadwigo checkout (`JADWIGO_REPO_DIR`), and returns the card a parent reads, or the errors by
   step id.

The tools read, draw, assemble and check. They never write a word a child reads: the 4 rungs and
the twin of every question are the calling agent's, in the lesson's language
(david-learns/decisions/2026-10-16-help-ladder-the-planner-writes-every-rung). A tool's own text
(errors, `reasoning`) is in English.

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

import dataclasses
import datetime as dt
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from typing import Any

from jw import bank_client, items, pii, settings_keys
from jw.commands import question
from jw.draw import DRAW_RULES, Draw, draw
from jw.errors import JwError

RUNGS = ("look", "boost", "almost", "worked")
HELP_KEYS = (*RUNGS, "twin")
CATEGORY = "child"  # a drafted lesson is for a child; the set pages carry no category
SKILL_ID_RE = re.compile(r"^[a-z]+(\.[a-z0-9-]+)+$")  # SkillId in packages/contracts records.ts
# The bank's enrichment marks a skill id it has not settled; the mark is not part of the id.
PROPOSED = "proposed:"
CHECK_TIMEOUT_SECS = 120

# What `check` runs: argv in, an object with `returncode`, `stdout` and `stderr` out.
Runner = Callable[[list[str]], Any]


# ---------------------------------------------------------------- the draft ------


def _need(request: str, grade: str, language: str, skills: Sequence[str]) -> dict[str, Any]:
    """The need the bank is asked (`contracts/need.schema.json`): the guarded request's words."""
    need: dict[str, Any] = {"language": language, "grade": grade, "words": request}
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


def _skill_label(skill: str) -> str:
    """The skill as the card names it: a proposed one says so."""
    if skill.startswith(PROPOSED):
        return f"{skill.removeprefix(PROPOSED)} (proposed)"
    return skill


def _empty_help() -> dict[str, Any]:
    return {
        "look": None,
        "boost": None,
        "boost_by_mistake": {},
        "almost": None,
        "worked": None,
        "twin": None,
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
    today: dt.date | None = None,
) -> dict[str, Any]:
    """A lesson draft for `request`: drawn questions with their keys and credit, help left empty.

    `names` is every name the family uses in the request (the child's, siblings', the parent's),
    required: an empty list says there are none. They are replaced before anything leaves.
    """
    if names is None:
        raise JwError(
            "a lesson draft needs the family's names",
            hint="Pass names: every name the family uses in the request, or [] when there is none.",
        )
    request = pii.guard(request.strip(), names=pii.names_for(members=names)).text
    if not request:
        raise JwError("a lesson draft needs a request", hint="Say what the lesson is for.")
    if kind not in DRAW_RULES:
        raise JwError(
            f"unknown lesson kind {kind!r}", hint=f"Use one of {', '.join(DRAW_RULES)}."
        )
    if count is not None and count < 1:
        raise JwError("count must be at least 1", hint="Leave it out for the rule's count.")
    day = today or dt.date.today()
    need = _need(request, grade, language, skills)
    envelope = question.search_envelope(
        grade=grade, words=request, skills=list(skills), language=language
    )
    pages = _pages(envelope)
    result, loaded, refused = _draw_loading(
        envelope, pages, kind=kind, language=language, count=count, today=day
    )

    questions: list[dict[str, Any]] = []
    for n, (drawn, view) in enumerate(loaded, start=1):
        khan_help = view["question"].get("help") or {}
        skill_ids, skill_note = _skill_ids(drawn.skill)
        questions.append(
            {
                "step_id": f"q{n}",
                "item_id": drawn.item_id,
                "set_id": drawn.set_id,
                "skill": drawn.skill,
                "skill_ids": skill_ids,
                "family": view["family"],
                "question_type": view["question_type"],
                "say": view["say"],
                "question": {
                    "family": view["question"]["family"],
                    "data": view["question"]["data"],
                    "key": view["question"]["key"],
                },
                "material": {
                    "hints": khan_help.get("hints") or [],
                    "worked": khan_help.get("worked") or [],
                },
                "help": _empty_help(),
                "credit": view["credit"],
                "based_on": view["based_on"],
                "why_drawn": drawn.reason,
            }
        )
        if skill_note:
            questions[-1]["skill_note"] = skill_note
    # A refused item's left_out line says why load_item refused it, not that it was flagged.
    left_out = [
        {"id": left.id, "reason": refused.get(left.id, left.reason)} for left in result.left_out
    ]

    used_sets = list(dict.fromkeys(q["set_id"] for q in questions))
    subjects = {str(pages[s].get("subject")) for s in used_sets if pages[s].get("subject")}
    subject = subjects.pop() if len(subjects) == 1 else "math"
    reasoning = (
        f'Drafted for the request "{request}" (grade {grade}): {len(questions)} questions drawn by '
        f"the provisional {kind} rule from {', '.join(used_sets) or 'no set'}."
    )
    skeleton = {
        "id": f"{_slug(request)}-{day.isoformat()}",
        "title": request,
        "language": language,
        "category": CATEGORY,
        "subject": subject,
        "reasoning": reasoning,
        "kind": kind,
        "script": {"parts": [{"part": kind, "steps": [_step(q) for q in questions]}]},
    }
    return {
        "request": request,
        "need": need,
        "grade": grade,
        "language": language,
        "kind": kind,
        "rule": result.rule,
        "rule_settled": result.rule_settled,
        "questions": questions,
        "left_out": left_out,
        "lesson_file_skeleton": skeleton,
    }


# ---------------------------------------------------------------- the check ------


def _card(value: Any) -> Any:
    """A rung as a HelpCard: `{text}` as given, or a bare string wrapped."""
    return {"text": value} if isinstance(value, str) else value


def _lines(value: Any) -> Any:
    """`worked` and `almost` as lists of lines: a bare string splits on its line breaks."""
    return value.splitlines() if isinstance(value, str) else value


def _ladder(q: Mapping[str, Any]) -> dict[str, Any]:
    """The step's help as the lesson file holds it: the item's hints, the agent's rungs and twin."""
    given = q.get("help") or {}
    help_: dict[str, Any] = {}
    hints = (q.get("material") or {}).get("hints")
    if hints:
        help_["hints"] = hints
    for rung in ("look", "boost"):
        if given.get(rung) is not None:
            help_[rung] = _card(given[rung])
    if given.get("boost_by_mistake"):
        help_["boost_by_mistake"] = {k: _card(v) for k, v in given["boost_by_mistake"].items()}
    for rung in ("almost", "worked"):
        if given.get(rung) is not None:
            help_[rung] = _lines(given[rung])
    twin = given.get("twin")
    if twin is not None:
        twin = dict(twin)
        inner = twin.pop("question", None)  # {say, question: {...}} reads as {say, ...}
        if isinstance(inner, Mapping):
            twin = {**inner, **twin}
        twin.setdefault("family", q["question"]["family"])
        help_["twin"] = twin
    return help_


def _step(q: Mapping[str, Any]) -> dict[str, Any]:
    """One question step of the lesson file (`QuestionStep` in lesson-file.ts)."""
    return {
        "id": q["step_id"],
        "question_type": q["question_type"],
        "skill_ids": q.get("skill_ids", _skill_ids(str(q["skill"]))[0]),
        "based_on": q["based_on"],
        "say": q["say"],
        "question": {**q["question"], "help": _ladder(q)},
        "credit": q["credit"],
    }


def lesson_file(filled: Mapping[str, Any]) -> dict[str, Any]:
    """The lesson file: the skeleton's own fields (the agent may edit its title or reasoning), and
    one step per question built from `questions[]`, where the agent wrote the help."""
    skeleton = filled.get("lesson_file_skeleton")
    if not isinstance(skeleton, Mapping):
        raise JwError(
            "the draft has no lesson_file_skeleton",
            hint="Pass the whole draft lesson_draft returned, with help filled in.",
        )
    steps = [_step(q) for q in filled.get("questions") or []]
    head = {k: v for k, v in skeleton.items() if k != "script"}
    part = {"part": str(skeleton.get("kind") or "practice"), "steps": steps}
    return {**head, "script": {"parts": [part]}}


def _missing_help(filled: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Every rung or twin the agent has not written yet, one error per step and key."""
    errors = []
    for q in filled.get("questions") or []:
        given = q.get("help") or {}
        for key in HELP_KEYS:
            value = given.get(key)
            if value is None or value == "" or value == [] or value == {}:
                errors.append(
                    {"step_id": q.get("step_id"), "message": f"help.{key} is empty; write it"}
                )
    return errors


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


def _out_dir() -> Path:
    return Path(tempfile.gettempdir()) / "jw-lessons"


def check(
    filled: Mapping[str, Any], *, runner: Runner | None = None, out_dir: Path | None = None
) -> dict[str, Any]:
    """Assemble the lesson file from a filled draft and run check.ts on it.

    Returns `{"ok": true, "card", "lesson_file", "play_path", "lesson_id", "questions"}`, or
    `{"ok": false, "errors": [{"step_id", "message"}], "lesson_file"}`. A rung or twin left empty
    is an error here, before check.ts runs: the ladder is written in full or not at all.
    """
    missing = _missing_help(filled)
    if missing:
        return {"ok": False, "errors": missing, "lesson_file": None}
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

    file = lesson_file(filled)
    folder = out_dir or _out_dir()
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{file['id']}.json"
    path.write_text(json.dumps(file, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    done = runner([bun, str(script), str(path), "--json"])
    try:
        answer = json.loads(done.stdout)
    except (TypeError, ValueError) as exc:
        tail = (done.stderr or done.stdout or "").strip()[-400:]
        raise JwError(
            f"check.ts gave no JSON (exit {done.returncode}): {tail}",
            hint=f"Run `bun {script} {path} --json` in {repo} to see it.",
        ) from exc
    if not answer.get("ok"):
        return {"ok": False, "errors": answer.get("errors") or [], "lesson_file": str(path)}
    return {
        "ok": True,
        "card": card(filled),
        "lesson_file": str(path),
        "play_path": answer.get("play_path"),
        "lesson_id": answer.get("lesson_id"),
        "questions": answer.get("questions"),
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


def card(filled: Mapping[str, Any]) -> dict[str, Any]:
    """What a parent reads before the lesson plays: each question, its key, rungs, twin and source."""
    out = []
    for n, q in enumerate(filled.get("questions") or [], start=1):
        given = q.get("help") or {}
        twin = _ladder(q).get("twin") or {}
        credit = q.get("credit") or {}
        source = " ".join(str(credit[k]) for k in ("source", "ref", "url") if credit.get(k))
        out.append(
            {
                "n": n,
                "step_id": q.get("step_id"),
                "skill": _skill_label(str(q.get("skill") or "")),
                "prompt": _prompt(q.get("say"), q["question"].get("data")),
                "key": q["question"].get("key"),
                "rungs": {
                    "look": _text(given.get("look")),
                    "boost": _text(given.get("boost")),
                    "almost": _lines(given.get("almost")),
                    "worked": _lines(given.get("worked")),
                },
                "twin": {"prompt": _prompt(twin.get("say"), twin.get("data")), "key": twin.get("key")},
                "source": source,
                "licence": credit.get("licence"),
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
            f"   why: {q['why_drawn']}",
        ]
    left = card_.get("left_out") or []
    if left:
        lines.append("left out:")
        lines += [f"   {item['id']}: {item['reason']}" for item in left]
    return "\n".join(lines)
