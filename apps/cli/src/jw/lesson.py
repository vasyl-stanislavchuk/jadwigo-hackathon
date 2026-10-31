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
words jw refuses before check.ts runs are findings with rule `words`. The page's own findings, from
drawing the draft (`<draft_id>.render.json`, dl-a38n.28), come back beside them as `render`.
One step is changed and shown by `jw.lesson_edit` (dl-a38n.29).

A word a child reads is the bank's, copied, or the calling agent's, in the lesson's language; the
tools copy, draw, assemble and check. A tool's own text (errors, `reasoning`) is in English.

The request leaves the machine only guarded. The bank turns a need's words into model input
(an embedding and a rerank), so `draft` takes the names the family uses from the calling agent,
required, and replaces them with placeholders before the search
(jadwigo-hackathon/decisions/2026-10-29-lesson-draft-takes-the-family-s-names-from-the-calling-agent-and).
The draft's `request`, the lesson file's id, title and reasoning are built from the guarded text;
the raw request and the names are used in-process only and never stored, echoed or logged.

An item `load_item` refuses goes to `left_out` with its reason, and the draw runs again with the
refused ids in `flagged`, until every drawn item loads or the sets run out. Drawing again, rather
than over-drawing and trimming, keeps the draw's variety rule over the questions that are actually
asked. Only a lesson-ready item loads (dl-a38n.32.9, decisions dl-kaxj and dl-be2l), so the reason
is `renders wrong: <rule>`, `not checked`, `flagged: <reason>` or the converter's own, as
`jw.items.NotReady` gives it; an item missing from the file keeps the error's text. An item its set
page does not list as ready (dl-a38n.32.10) is left out by the draw, with load_item's reason too.
"""

from __future__ import annotations

import copy
import dataclasses
import datetime as dt
import hashlib
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

from jw import bank_client, items, pii, refusals, settings_keys
from jw.commands import question
from jw.draw import DRAW_RULES, NOT_READY_ITEM, Draw, Left, draw, ready_ids
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
# What a clean check says comes next (dl-a38n.39): publishing, by the tool, never by hand.
NEXT = {
    "call": "lesson_publish",
    "says": "Publish it with lesson_publish(draft_id): it imports the lesson into the local "
    "database `make dev` serves, checks that it plays, and returns its play_url.",
}

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
    """`value` with each picture's labels and address left out: the bulk of a Khan picture, which
    the agent reading the draft never needs (wave 3, lead decision 6). The draft file and
    lesson_show keep them whole."""
    if isinstance(value, list):
        return [_slim_pictures(v) for v in value]
    if isinstance(value, Mapping):
        if "src" in value and "alt" in value:
            return {k: v for k, v in value.items() if k not in ("labels", "src")}
        return {k: _slim_pictures(v) for k, v in value.items()}
    return value


def _alts(pictures: Any) -> list[str]:
    return [str(p.get("alt")) for p in pictures or [] if isinstance(p, Mapping) and p.get("alt")]


def _walk(value: Any) -> Any:
    """Every (key, value) pair in `value`, at any depth."""
    if isinstance(value, Mapping):
        for key, inner in value.items():
            yield key, inner
            yield from _walk(inner)
    elif isinstance(value, list):
        for inner in value:
            yield from _walk(inner)


def _pictures(value: Any) -> int:
    """The picture objects (`src`, `alt` and `width`) in `value`, at any depth."""
    if isinstance(value, list):
        return sum(_pictures(v) for v in value)
    if isinstance(value, Mapping):
        here = 1 if all(k in value for k in ("src", "alt", "width")) else 0
        return here + sum(_pictures(v) for v in value.values())
    return 0


def signature(data: Any) -> tuple[int, tuple[str, ...], tuple[str, ...], str | None]:
    """How a question shows itself, which a twin keeps (wave 3, lead decision 3; check.ts holds the
    same definition): the picture count (objects with `src`, `alt` and `width`, at any depth) plus
    one for a `stem.image`; the figure `kind` under any `figure` key; the sorted set of option
    `content.kind`; and the `input` kind."""
    pictures = _pictures(data)
    stem = data.get("stem") if isinstance(data, Mapping) else None
    if isinstance(stem, Mapping) and stem.get("image"):
        pictures += 1
    figures = sorted(
        {str(v["kind"]) for k, v in _walk(data) if k == "figure" and isinstance(v, Mapping)
         and "kind" in v}
    )
    options = sorted(
        {
            str(o["content"]["kind"])
            for k, v in _walk(data) if k == "options" and isinstance(v, list)
            for o in v
            if isinstance(o, Mapping) and isinstance(o.get("content"), Mapping)
            and "kind" in o["content"]
        }
    )
    raw = data.get("input") if isinstance(data, Mapping) else None
    entry = raw.get("kind") if isinstance(raw, Mapping) else raw
    return pictures, tuple(figures), tuple(options), None if entry is None else str(entry)


def _sibling_twin(
    original: Mapping[str, Any],
    page: Mapping[str, Any] | None,
    taken: set[str],
    language: str,
    seed: str,
) -> dict[str, Any] | None:
    """The twin from the bank (wave 3, lead decision 3, owner's decision `dl-zj7c`): a lesson-ready
    item of the same set with the same problem type, family, question type and representation
    signature, and another key, not in the lesson nor a twin already. The first in id order from
    a point the draft id picks, so a draft draws the same twins again. None when there is none."""
    if page is None:
        return None
    ids = ready_ids(page, language)
    if ids is None:
        ids = [str(i) for i in (page.get("items") or {}).get("ids") or []]
    pool = sorted(i for i in set(ids) if i not in taken)
    if not pool:
        return None
    start = int(hashlib.sha256(seed.encode()).hexdigest(), 16) % len(pool)
    spec = original["question"]
    for item_id in pool[start:] + pool[:start]:
        try:
            view = items.load_item(item_id, language)
        except JwError:
            continue
        twin = view["question"]
        if (
            view.get("problem_type") != original.get("problem_type")
            or twin["family"] != spec["family"]
            or view.get("question_type") != original.get("question_type")
            or signature(twin["data"]) != signature(spec["data"])
            or twin["key"] == spec["key"]
        ):
            continue
        hints = [h for h in (twin.get("help") or {}).get("hints") or []]
        out: dict[str, Any] = {
            "say": view["say"],
            "family": twin["family"],
            "data": twin["data"],
            "key": twin["key"],
            "help": {"hints": copy.deepcopy(hints)} if hints else {},
            "credit": view["credit"],
            "based_on": {"question": f"khan:{item_id}", "changes": []},
        }
        held = {"question": out, "based_on": out["based_on"]}
        _add_times_rule(held)
        out["based_on"] = held["based_on"]
        return out
    return None


def _twin_source(twin: Mapping[str, Any]) -> str:
    """Where a step's twin came from, for the card: `bank khan:<id>` or `written`."""
    source = str((twin.get("based_on") or {}).get("question") or "")
    return f"bank {source}" if source.startswith(("khan:", "bank:")) else "written"


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
            except items.NotReady as exc:
                refused[drawn.item_id] = exc.reason
                new = True
            except JwError as exc:
                refused[drawn.item_id] = str(exc)
                new = True
        if not new:
            return result, loaded, refused


def _not_ready(left: Left, language: str) -> str:
    """The draw's reason, or for an item the page does not list as ready, load_item's own; when
    the converted file finds it ready, the page is older than the stamp, and the reason says so."""
    if left.reason != NOT_READY_ITEM:
        return left.reason
    why = items.why_not(left.id, language)
    return why or f"its set page does not list it as lesson-ready in {language}"


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


def _render_path(where: Path, draft_id: str) -> Path:
    return where / f"{draft_id}.render.json"


def render_of(where: Path, draft_id: str, step_id: str | None = None) -> dict[str, Any] | None:
    """The page's own check of the draft as it drew it, `<draft_id>.render.json` (dl-a38n.28),
    or None when the page has not written one. `stale` is true when it was drawn before the draft
    file's last write: right after a write it is the draw of the version before. `step_id` keeps
    only that step's findings."""
    path = _render_path(where, draft_id)
    try:
        raw: Any = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return None
    if not isinstance(raw, Mapping) or raw.get("draft_id") != draft_id:
        return None
    findings = [f for f in raw.get("findings") or [] if isinstance(f, Mapping)]
    if step_id is not None:
        findings = [f for f in findings if f.get("step_id") == step_id]
    rendered_at = raw.get("rendered_at")
    stale = True
    try:
        drawn = dt.datetime.fromisoformat(str(rendered_at)).timestamp()
        stale = drawn < _lesson_path(where, draft_id).stat().st_mtime
    except (ValueError, OSError):
        pass
    return {"findings": findings, "rendered_at": rendered_at, "stale": stale}


def _state_path(where: Path, draft_id: str) -> Path:
    return where / STATE_DIR / f"{draft_id}.json"


def now() -> str:
    """The moment, as a timing stamp writes it: UTC, to the millisecond."""
    return dt.datetime.now(dt.UTC).isoformat(timespec="milliseconds")


def stamp(where: Path, draft_id: str, tool: str, called_at: str) -> None:
    """Add one tool call's `{tool, called_at, returned_at}` to jw's record of the draft (wave 3,
    lead decision 10): `jw lesson timing` reads the split, the gaps being the model's time. A
    draft with no record (a refused id) gets none."""
    path = _state_path(where, draft_id)
    try:
        stored: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return
    stored.setdefault("timings", []).append(
        {"tool": tool, "called_at": called_at, "returned_at": now()}
    )
    _write_json(path, stored)


def _make_dirs(where: Path) -> None:
    """The drafts directory and jw's record under it, readable by this user only: a draft holds a
    parent's guarded request and the agent's words, and the directory outlives the session."""
    where.mkdir(mode=0o700, parents=True, exist_ok=True)
    (where / STATE_DIR).mkdir(mode=0o700, exist_ok=True)


def _write_json(path: Path, value: Any, mode: int | None = None) -> None:
    """Write `value` whole: to a sibling first, then renamed over `path`, so a reader watching the
    directory never sees half a file. `mode` sets the file's permissions before it is renamed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_name(f".{path.name}.part")
    part.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if mode is not None:
        part.chmod(mode)
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
    if _cards_to_write(step):
        out.append("boost_by_mistake")
    return out


def _missing(step: Mapping[str, Any]) -> list[str]:
    """What the check refuses a step for lacking: what `_to_write` lists, but mistake cards only
    when the step has none at all. A class with no card falls back to `look` in the player."""
    cards = (step["question"].get("help") or {}).get("boost_by_mistake")
    return [k for k in _to_write(step) if k != "boost_by_mistake" or not cards]


def _cards_to_write(step: Mapping[str, Any]) -> list[str]:
    """The mistake classes whose card the item lacks: the bank pass writes them onto the item
    (wave 3, lead decision 4), and the agent writes only the rest."""
    cards = (step["question"].get("help") or {}).get("boost_by_mistake") or {}
    return [c for c in step.get("mistake_classes") or [] if c not in cards]


def _why_short(why: Any) -> str:
    """The draw's reason cut to the problem type it names, else its first part."""
    found = re.search(r"problem type (.+?); set ", str(why or ""))
    return found[1] if found else str(why or "").split(";")[0]


def _slim(q: Mapping[str, Any], verbose: bool = False) -> dict[str, Any]:
    """One question as the agent reads it: what is left to write, and the copy as text only when
    a rung is left to write or `verbose` (wave 3, lead decision 6: the draft result ≤ 8 KB)."""
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
    you_write = _to_write(q)
    key = spec["key"]
    out: dict[str, Any] = {
        "step_id": q["step_id"],
        "item_id": q["item_id"],
        "say": q["say"],
        "data": _slim_pictures(spec["data"]),
        # The rule jw adds by code is not the agent's to read or write.
        "key": {k: v for k, v in key.items() if k != "rule"} if isinstance(key, Mapping) else key,
        "you_write": you_write,
        "mistake_classes": q.get("mistake_classes"),
        "why_drawn": _why_short(q["why_drawn"]),
    }
    if verbose or any(r in you_write for r in RUNGS):
        out["copied_help"] = copied
        out["rungs"] = _copied_rungs(spec)
    if verbose:
        out.update(family=spec["family"], key=key, set_id=q["set_id"], skill=q["skill"],
                   question_type=q["question_type"], why_drawn=q["why_drawn"])
    if "boost_by_mistake" in out["you_write"]:
        out["cards_to_write"] = _cards_to_write(q)
    if help_.get("twin"):
        out["twin_source"] = _twin_source(help_["twin"])
    if q.get("skill_note"):
        out["skill_note"] = q["skill_note"]
    return out


def left_out_summary(left_out: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """`left_out` by cause (`refusals.cause_of`), the most common first, with 3 example ids each:
    the full list stays in jw's record and in lesson_show (wave 3, lead decision 6)."""
    by_cause: dict[str, list[str]] = {}
    for left in left_out:
        by_cause.setdefault(refusals.cause_of(str(left.get("reason"))), []).append(str(left["id"]))
    causes = sorted(by_cause.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    return {
        "total": len(left_out),
        "by_cause": [{"cause": c, "count": len(ids), "examples": ids[:3]} for c, ids in causes],
    }


# Over this share of the drawn ready ids missing from the converted file, the machine's bank copy
# is out of step with the bank's pages: a setup problem, not a lesson one.
MISSING_SHARE = 0.2
SETUP_FIX = "run `jw doctor`, then `jw bank pull`"


def _setup_warning(drawn: Sequence[str], refused: Mapping[str, str]) -> str | None:
    """A warning when more than 20% of the ready ids the draw drew are not in the converted file."""
    missing = [i for i in drawn if str(refused.get(i, "")).startswith("no item ")]
    if not drawn or len(missing) / len(drawn) <= MISSING_SHARE:
        return None
    return (
        f"{len(missing)} of {len(drawn)} drawn ready items are missing from the converted file "
        f"({', '.join(missing[:3])}...): {SETUP_FIX}"
    )


def _view(stored: Mapping[str, Any], verbose: bool = False) -> dict[str, Any]:
    """What lesson_draft returns: the draft's own fields, each question slim, and left_out by
    cause; with `verbose`, each question whole and left_out in full."""
    keys = ("draft_id", "request", "need", "grade", "language", "kind", "rule_settled")
    out = {
        **{k: stored[k] for k in keys},
        "title": stored["lesson"]["title"],
        "plays_as_copied": stored["plays_as_copied"],
        "copy_errors": stored["copy_errors"],
        "questions": [_slim(q, verbose) for q in stored["questions"]],
        "left_out": stored["left_out"] if verbose else left_out_summary(stored["left_out"]),
        "draft_path": stored["draft_path"],
    }
    if stored.get("setup_warning"):
        out["setup_warning"] = stored["setup_warning"]
    if verbose:
        out.update(rule=stored["rule"], reasoning=stored["lesson"]["reasoning"])
    return out


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
    verbose: bool = False,
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
    `verbose` returns each question and left_out whole (`_view`).
    """
    called_at = now()
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

    draft_id = f"draft_{secrets.token_hex(6)}"
    taken = {drawn.item_id for drawn, _ in loaded}
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
        twin = _sibling_twin(
            {**view, "question": spec}, pages.get(drawn.set_id), taken, language, draft_id
        )
        if twin is not None:
            taken.add(twin["based_on"]["question"].removeprefix("khan:"))
            questions[-1]["question"]["help"]["twin"] = twin
    # A refused item's left_out line says why load_item refused it, not that it was flagged; an
    # item its page does not list as ready says why the converted file holds it back.
    left_out = [
        {"id": left.id, "reason": refused.get(left.id) or _not_ready(left, language)}
        for left in result.left_out
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
    stored["setup_warning"] = _setup_warning([*(d.item_id for d, _ in loaded), *refused], refused)
    _make_dirs(where)
    _check_copy(stored, where, runner)
    stored["timings"] = [{"tool": "lesson_draft", "called_at": called_at, "returned_at": now()}]
    _write_json(_state_path(where, draft_id), stored)
    return _view(stored, verbose)


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
        help_["boost_by_mistake"] = {
            **(help_.get("boost_by_mistake") or {}),
            **{k: _card(v) for k, v in given["boost_by_mistake"].items()},
        }
    if not _empty(given.get("twin")):
        help_["twin"] = _twin(given["twin"], spec["family"])
    problems += [f"help.{key} is empty; write it" for key in _missing(step)]
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


def from_file(q: Mapping[str, Any], step: Mapping[str, Any]) -> dict[str, Any]:
    """jw's record of a question with the draft file's step on it: its say, question, based_on and
    credit as the file holds them now (after lesson_edit, or a check that left the step out)."""
    return {**q, "say": step.get("say"), "question": step.get("question") or {},
            "based_on": step.get("based_on"), "credit": step.get("credit") or q.get("credit")}


def _file_steps(path: Path) -> dict[str, dict[str, Any]]:
    """The draft file's question steps by id, or none when it cannot be read."""
    try:
        file: Any = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}
    parts = (file.get("script") or {}).get("parts") or [] if isinstance(file, Mapping) else []
    return {
        str(step["id"]): step
        for part in parts for step in part.get("steps") or []
        if isinstance(step, Mapping) and "id" in step and "question" in step
    }


# The parts of an agent's words the guard leaves alone: an answer and a picture's address.
UNGUARDED = ("key", "src")


def guard_words(value: Any, family: Any) -> Any:
    """Every string an agent wrote, through `pii.guard` (dl-a38n.36), but an answer key or a
    picture address: a parent's ask or a step's words may hold a child's name. A mapping's keys
    are guarded too (dl-a38n.62): `{"<name>": ...}` is words as much as its value."""
    if isinstance(value, str):
        return pii.guard(value, names=family).text
    if isinstance(value, list):
        return [guard_words(v, family) for v in value]
    if isinstance(value, Mapping):
        return {
            guard_words(str(k), family): v if k in UNGUARDED else guard_words(v, family)
            for k, v in value.items()
        }
    return value


def _guard_step(q: dict[str, Any], family: Any) -> dict[str, Any]:
    """A step as the draft file holds it, its words guarded again (dl-a38n.62): one edited with
    no names, or before the family's names were known, keeps none on a later check. With no
    names there is nothing new to find, and the bank's copy is left as it is."""
    if not family:
        return q
    return {**q, **{k: guard_words(q.get(k), family) for k in ("say", "question", "based_on")}}


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
    full: bool = False,
    verbose: bool = False,
    runner: Runner | None = None,
    folder: Path | None = None,
) -> dict[str, Any]:
    """`_check`, stamped in the draft's timings (wave 3, lead decision 10)."""
    called_at = now()
    where = folder or drafts_dir()
    try:
        return _check(draft_id, words, title, reasoning, names=names, full=full,
                      verbose=verbose, runner=runner, where=where)
    finally:
        stamp(where, draft_id, "lesson_check", called_at)


def warns_by_rule(findings: Sequence[Mapping[str, Any]]) -> dict[str, int]:
    """The warnings as `{rule: count}`: what a clean check's answer carries unless verbose."""
    out: dict[str, int] = {}
    for f in findings:
        if f.get("level") != "error":
            out[str(f.get("rule"))] = out.get(str(f.get("rule")), 0) + 1
    return out


def _check(
    draft_id: str,
    words: Mapping[str, Mapping[str, Any]],
    title: str | None,
    reasoning: str | None,
    *,
    names: Sequence[str],
    full: bool,
    verbose: bool,
    runner: Runner | None,
    where: Path,
) -> dict[str, Any]:
    """Put the agent's words on the draft kept under `draft_id` and run check.ts on the lesson.

    `title` and `reasoning` pass through `pii.guard` with `names`, the family's names as for
    `draft`, before they are written: a name, an email or a phone number never reaches the file.

    `words` maps each step id to what the agent wrote for it (the lesson_check tool's `help`):
    `twin`, `boost_by_mistake`, a rung the copy leaves empty, and `changes` to a copied part.
    Every step's words are sent on each call. `<draft_id>.json` is rewritten with them first, as
    far as they go, and `<draft_id>.check.json` after. Returns `{"ok": true, "card", "findings",
    "lesson_file", "draft_path", "play_path", "lesson_id", "questions"}`, the card's `next`
    saying to publish with lesson_publish (`jw.lesson_publish`), or `{"ok": false, "findings",
    "errors": [{"step_id", "message"}], "lesson_file", "draft_path"}`. A missing twin or rung is
    an error here (rule `words`), before check.ts runs. Both carry `render` (`render_of`): the
    page's findings from its last draw, or None.

    Only the steps in `words` are rebuilt, from the bank's copy and the words sent; a step left out
    keeps what the draft file holds (its words, the bank's twin, `lesson_edit.edit`'s changes), so
    `words={}` checks the file as it stands. Every string in `words` but a key goes through
    `pii.guard` with `names` (`guard_words`).
    """
    stored = load_draft(draft_id, where)
    if not isinstance(words, Mapping):
        raise JwError("help maps step ids to their words", hint='Pass {"q1": {"twin": ...}, ...}.')
    guard_names = pii.names_for(members=list(names))
    # Guarded before anything reads them, keys included, so no message echoes a name (dl-a38n.62).
    words = guard_words(words, guard_names)
    known = [q["step_id"] for q in stored["questions"]]
    errors = [
        {"step_id": s, "message": f"no step {s} in {draft_id}; its steps are {', '.join(known)}"}
        for s in words
        if s not in known
    ]
    path = _lesson_path(where, draft_id)
    as_filed = _file_steps(path)
    steps: dict[str, dict[str, Any]] = {}
    for q in stored["questions"]:
        sid = q["step_id"]
        if sid not in words:
            # Left out: the step as the file holds it, its words, bank twin and edits kept.
            steps[sid] = _guard_step(from_file(q, as_filed[sid]) if sid in as_filed else dict(q),
                                     guard_names)
            errors += [{"step_id": sid, "message": f"help.{key} is empty; write it"}
                       for key in _missing(steps[sid])]
            continue
        given = words.get(sid) or {}
        if not isinstance(given, Mapping):
            errors.append({"step_id": sid, "message": "a step's words are an object"})
            continue
        steps[sid], problems = _apply(q, given)
        errors += [{"step_id": sid, "message": p} for p in problems]

    for field, value in (("title", title), ("reasoning", reasoning)):
        if value is not None and value.strip():
            stored["lesson"][field] = pii.guard(value.strip(), names=guard_names).text
    _make_dirs(where)
    _write_json(path, _file(stored, steps))
    paths = {"lesson_file": str(path), "draft_path": str(path)}
    if errors:
        at = {s: f"script.parts[0].steps[{n}]" for n, s in enumerate(known)}
        findings = [
            _finding(e["step_id"], "words", e["message"], at.get(e["step_id"], ""))
            for e in errors
        ]
        _write_check(where, stored, False, findings)
        return {"ok": False, "findings": findings, "errors": errors, **paths,
                "render": render_of(where, draft_id)}

    answer = _run_check(path, runner)
    findings = _findings(answer)
    _write_check(where, stored, bool(answer.get("ok")), findings, answer.get("mistake_classes"))
    if not answer.get("ok"):
        return {"ok": False, "findings": findings, "errors": answer.get("errors") or [], **paths,
                "render": render_of(where, draft_id)}
    play_path = answer.get("play_path")
    shown: dict[str, Any] = (
        {"findings": findings} if verbose else {"findings": [], "warns": warns_by_rule(findings)}
    )
    return {
        "ok": True,
        "card": {**card({"questions": [steps[s] for s in known]}, full=full), "next": NEXT},
        **shown,
        "render": render_of(where, draft_id),
        **paths,
        "play_path": play_path,
        "lesson_id": answer.get("lesson_id"),
        "questions": answer.get("questions"),
    }


# ---------------------------------------------------------------- the timing -----

# The wave-3 budget in seconds per tool (docs/worklog/dl-a38n/2026-10-31-wave-3.md, decision 10).
BUDGET_S = {"lesson_draft": 8.0, "lesson_check": 5.0, "lesson_publish": 5.0}


def timing(draft_id: str, folder: Path | None = None) -> dict[str, Any]:
    """The draft's tool calls in order with their seconds, the model's seconds before each (the gap
    since the call before returned), and the totals: `{draft_id, calls: [{tool, called_at,
    returned_at, s, model_s, over_budget}], tools_s, model_s, wall_s}`."""
    stored = load_draft(draft_id, folder)
    stamps = sorted(stored.get("timings") or [], key=lambda t: str(t["called_at"]))
    calls: list[dict[str, Any]] = []
    previous: dt.datetime | None = None
    for t in stamps:
        called = dt.datetime.fromisoformat(str(t["called_at"]))
        returned = dt.datetime.fromisoformat(str(t["returned_at"]))
        took = round((returned - called).total_seconds(), 3)
        budget = BUDGET_S.get(str(t["tool"]))
        calls.append({
            **t,
            "s": took,
            "model_s": None if previous is None else round((called - previous).total_seconds(), 3),
            "over_budget": budget is not None and took > budget,
        })
        previous = returned
    tools = round(sum(c["s"] for c in calls), 3)
    model = round(sum(c["model_s"] or 0 for c in calls), 3)
    wall = 0.0
    if stamps:
        first = dt.datetime.fromisoformat(str(stamps[0]["called_at"]))
        wall = round((dt.datetime.fromisoformat(str(stamps[-1]["returned_at"])) - first)
                     .total_seconds(), 3)
    return {"draft_id": draft_id, "calls": calls, "tools_s": tools, "model_s": model,
            "wall_s": wall}


def timing_text(split: Mapping[str, Any]) -> str:
    """The split as lines, for `jw lesson timing`."""
    lines = []
    for c in split["calls"]:
        if c["model_s"] is not None:
            lines.append(f"  model           {c['model_s']:7.2f} s")
        over = "  over budget" if c["over_budget"] else ""
        lines.append(f"  {c['tool']:<15} {c['s']:7.2f} s  ({c['called_at']}){over}")
    lines.append(
        f"tools {split['tools_s']:.2f} s, model {split['model_s']:.2f} s, "
        f"wall {split['wall_s']:.2f} s"
    )
    return "\n".join([f"{split['draft_id']}", *lines])


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


def card(filled: Mapping[str, Any], full: bool = False) -> dict[str, Any]:
    """What a parent reads before the lesson plays: each question's prompt in plain text, its key
    as text, its twin with its source, the credit, and the changes made to the bank's copy when
    there are any; with `full`, each rung and why it was drawn too (wave 3, lead decision 6: the
    check result ≤ 6 KB). left_out is the draft's, not the card's."""
    out = []
    for n, q in enumerate(filled.get("questions") or [], start=1):
        spec = q["question"]
        twin = (spec.get("help") or {}).get("twin") or {}
        credit = q.get("credit") or {}
        source = " ".join(str(credit[k]) for k in ("source", "ref", "url") if credit.get(k))
        line: dict[str, Any] = {
            "n": n,
            "step_id": q.get("step_id"),
            "prompt": _plain_prompt(q.get("say"), spec.get("data")),
            "key": _key_text(spec.get("key")),
            "twin": {
                "prompt": _plain_prompt(twin.get("say"), twin.get("data")),
                "key": _key_text(twin.get("key")),
                "source": _twin_source(twin),
            } if twin else None,
            "source": source,
            "licence": credit.get("licence"),
        }
        changes = list((q.get("based_on") or {}).get("changes") or [])
        if changes:
            line["changes"] = [{k: c.get(k) for k in ("change", "why")} for c in changes]
        if full:
            line["skill"] = _skill_label(str(q.get("skill") or ""))
            line["rungs"] = {k: _plain(v) for k, v in _rungs(spec).items()}
            line["why_drawn"] = q.get("why_drawn")
        out.append(line)
    # One licence for the lesson when every question shares it, once instead of on each.
    licences = {q["licence"] for q in out}
    if len(licences) == 1 and out and not full:
        for q in out:
            del q["licence"]
        return {"licence": licences.pop(), "questions": out}
    return {"questions": out}


def _plain_prompt(say: Any, data: Mapping[str, Any] | None) -> str:
    """The prompt with TeX made plain, each part once: a part another part begins with
    (`6 · 2 =` beside `6 · 2 = ?`) goes."""
    parts = [str(tex_plain(p)) for p in _prompt(say, data).split(" | ") if p.strip()]
    kept = [p for i, p in enumerate(parts)
            if not any(p != o and o.startswith(p) for o in parts) and p not in parts[:i]]
    return " | ".join(kept)


def _plain(value: Any) -> Any:
    """A rung's text, or its lines, with TeX made plain."""
    if isinstance(value, list):
        return [tex_plain(str(v)) for v in value]
    return tex_plain(value) if isinstance(value, str) else value


# TeX a Khan item writes, as plain characters a parent reads (dl-e8ov.5.38.6). The lesson file
# keeps its TeX: the player draws it.
_TEX_SYMBOLS = {
    r"\cdot": "·", r"\times": "×", r"\div": ":", r"\le": "≤", r"\leq": "≤", r"\ge": "≥",
    r"\geq": "≥", r"\lt": "<", r"\gt": ">", r"\neq": "≠", r"\ne": "≠", r"\approx": "≈",
    r"\pm": "±", r"\%": "%", r"\degree": "°", r"\circ": "°", r"\dots": "…", r"\ldots": "…",
    r"\cdots": "…", r"\,": " ", r"\;": " ", r"\quad": " ", r"\qquad": " ", r"\ ": " ",
    r"\log": "log", r"\ln": "ln", r"\pi": "π", r"\sqrt": "√",
}
# Characters TeX escapes, kept as they are: they stand in a private-use character while the `$`
# and braces of the maths go.
_TEX_KEPT = {r"\$": "\ue000", r"\{": "\ue001", r"\}": "\ue002"}
_TEX_FRAC = re.compile(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}")
_TEX_FRAC_DIGITS = re.compile(r"\\[dt]?frac\s*(\d)\s*(\d)")
_TEX_COLOR_ARG = re.compile(r"\\(?:textcolor|color)\s*\{[^{}]*\}")
_TEX_SQRT = re.compile(r"\\sqrt\s*\{([^{}]*)\}")
_TEX_SCRIPT = re.compile(r"([_^])\{([^{}]*)\}")
_TEX_WRAP = re.compile(r"\\([A-Za-z]+)\s*\{([^{}]*)\}")
_TEX_WORD = re.compile(r"\\([A-Za-z]+)")
# Commands that only style what follows (size, colour, spacing, text mode): they go. Any other
# command keeps its name, so a card never silently loses a word it does not know.
_TEX_STYLE = re.compile(
    r"(?:Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|scriptsize|tiny"
    r"|displaystyle|textstyle|scriptstyle|left|right|big|Big|bigg|Bigg|limits|nolimits"
    r"|text|textbf|textit|mathrm|mathbf|mathit|boldsymbol|operatorname|color|textcolor"
    r"|(?:blue|red|green|gold|purple|teal|maroon|orange|pink|gray|grey|black|white|mint)[A-E]?)"
)


def _grouped(part: str) -> str:
    """A fraction's or a root's part in brackets when it is more than one term: `(1+2)/3`."""
    part = part.strip()
    return f"({part})" if re.search(r"[\s+\-−·×:/]", part) else part


def tex_plain(text: Any) -> Any:
    """`text` with its TeX made plain: `$\\Huge{\\blue{6} \\cdot 4} = $` reads `6 · 4 =`.
    Fractions become `a/b` (a part of more than one term in brackets), a root `√x`, a symbol or
    relation its character (`\\lt` `<`), a styling command (size, colour, text mode) goes and
    keeps what it wraps, any other command keeps its name (`\\overline{AB}` reads `overline
    AB`), so no meaning silently drops; the `$` around maths go, and an escaped `\\$` stays."""
    if not isinstance(text, str) or "\\" not in text and "$" not in text:
        return text
    out = text
    for tex, kept in _TEX_KEPT.items():
        out = out.replace(tex, kept)
    out = _TEX_COLOR_ARG.sub("", out)  # \textcolor{red}{7}: the colour's name is no word
    for _ in range(8):  # nested wrappers, from the inside out
        before = out
        out = _TEX_FRAC.sub(lambda m: f"{_grouped(m[1])}/{_grouped(m[2])}", out)
        out = _TEX_FRAC_DIGITS.sub(r"\1/\2", out)
        out = _TEX_SQRT.sub(lambda m: f"√{_grouped(m[1])}", out)
        out = _TEX_SCRIPT.sub(r"\1\2 ", out)
        for tex, plain in sorted(_TEX_SYMBOLS.items(), key=lambda kv: -len(kv[0])):
            out = re.sub(re.escape(tex) + r"(?![A-Za-z])", plain, out)
        out = _TEX_WRAP.sub(lambda m: m[2] if _TEX_STYLE.fullmatch(m[1]) else f"{m[1]} {m[2]}",
                            out)
        if out == before:
            break
    out = _TEX_WORD.sub(lambda m: "" if _TEX_STYLE.fullmatch(m[1]) else m[1], out)
    out = out.replace("$", "")
    out = re.sub(r"[{}]", "", out)
    for tex, kept in _TEX_KEPT.items():
        out = out.replace(kept, tex[1:])
    return re.sub(r"\s+", " ", out).replace("√ ", "√").strip()


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
        lines.append(f"{q['n']}. {q['prompt']}")
        if q.get("skill"):
            lines.append(f"   skill: {q['skill']}")
        lines.append(f"   key: {q['key']}")
        rungs = q.get("rungs")
        if rungs:
            lines += [
                f"   look: {rungs['look']}",
                f"   boost: {rungs['boost']}",
                f"   almost: {' / '.join(rungs['almost'] or [])}",
                f"   worked: {' / '.join(rungs['worked'] or [])}",
            ]
        twin = q.get("twin")
        if twin:
            lines.append(f"   twin: {twin['prompt']} (key: {twin['key']}; {twin['source']})")
        lines.append(f"   source: {q['source']} ({q.get('licence') or card_.get('licence')})")
        lines += [f"   changed ({c['change']}): {c['why']}" for c in q.get("changes") or []]
        if q.get("why_drawn"):
            lines.append(f"   why: {q['why_drawn']}")
    step = card_.get("next")
    if step:
        lines += [f"next: {step['says']}"]
    return "\n".join(lines)
