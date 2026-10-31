"""One step of a draft, changed and shown (dl-a38n.29): the lesson_edit and lesson_show tools.

`lesson.check` rebuilds the steps it is sent words for from the bank's copy. `edit(draft_id,
step_id, patch)` changes one step of the draft file as it stands instead, and a later check that
is not sent words for that step keeps the change (dl-a38n.40):
`patch` is a JSON merge patch (RFC 7386) on the step, over `say` and `question` (its `data`, `key`
and `help`, the twin included as `help.twin`). An object merges into what is there, `null`
removes a part, anything else replaces it. A change to a part the bank's copy has (`say`, `data`,
`key`, `help.hints`, `help.worked`, and `help.almost` when the copy filled it) is recorded in
`based_on.changes` as `{change, why, reviewed: false}`, so it needs a `why`; a rung, a twin or a
mistake card the agent writes is not a change to the copy and needs none.

The draft file `<draft_id>.json` is rewritten whole (written beside, then renamed), check.ts runs
on it, `<draft_id>.check.json` is rewritten, and the answer is that step's: its findings, the
page's render findings for it (`lesson.render_of`), and its card. `show(draft_id, step_id?)` is
the draft file's step or steps as data, with their latest findings, so the agent never guesses.
"""

from __future__ import annotations

import copy
import json
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from jw import lesson, pii
from jw.errors import JwError

# The parts of a step a patch may set; the rest (id, question_type, skill_ids, based_on, credit,
# question.family) is the draft's.
PATCHABLE = {"say": None, "question": {"data": None, "key": None, "help": None}}
# The parts of the bank's copy a change to which is recorded in based_on.changes.
COPIED = (("say",), ("question", "data"), ("question", "key"), ("question", "help", "hints"),
          ("question", "help", "worked"), ("question", "help", "almost"))
CHANGE_DEFAULT = "wording"
# The parts a patch replaces whole or merges into, which are objects in a step (dl-a38n.35).
OBJECTS = ("question.data", "question.key", "question.help")


def _merge(target: Any, patch: Any) -> Any:
    """RFC 7386: an object patch merges key by key, `null` removes, any other value replaces."""
    if not isinstance(patch, Mapping):
        return copy.deepcopy(patch)
    out = dict(target) if isinstance(target, Mapping) else {}
    for key, value in patch.items():
        if value is None:
            out.pop(key, None)
        else:
            out[key] = _merge(out.get(key), value)
    return out


def _refused(patch: Mapping[str, Any], allowed: Mapping[str, Any], at: str = "") -> list[str]:
    """Each path in `patch` outside what a patch may set, and each required part it removes."""
    out: list[str] = []
    for key, value in patch.items():
        path = f"{at}{key}"
        if key not in allowed:
            out.append(f"{path}: a patch sets say, question.data, question.key or question.help")
        elif value is None and path in ("say", "question", "question.data", "question.key"):
            out.append(f"{path}: a step needs it; set it instead of removing it")
        elif path == "say" and not isinstance(value, str):
            out.append("say: a string")
        elif path in OBJECTS and value is not None and not isinstance(value, Mapping):
            out.append(f"{path}: an object")
        elif allowed[key] is not None:
            if isinstance(value, Mapping):
                out += _refused(value, allowed[key], f"{path}.")
            else:
                out.append(f"{path}: an object of {', '.join(allowed[key])}")
    return out


def _at(value: Any, path: tuple[str, ...]) -> Any:
    for part in path:
        value = value.get(part) if isinstance(value, Mapping) else None
    return value


def _tidy_help(help_: dict[str, Any], family: str) -> None:
    """The shapes lesson_check takes too: a bare string as a look or boost card or a mistake card,
    and as almost or worked lines."""
    for rung in ("look", "boost"):
        if rung in help_:
            help_[rung] = lesson._card(help_[rung])
    for rung in ("almost", "worked"):
        if rung in help_:
            help_[rung] = lesson._lines(help_[rung])
    if isinstance(help_.get("boost_by_mistake"), Mapping):
        help_["boost_by_mistake"] = {k: lesson._card(v) for k, v in help_["boost_by_mistake"].items()}
    if isinstance(help_.get("twin"), Mapping):
        help_["twin"] = lesson._twin(help_["twin"], family)


def _load(draft_id: str, where: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    """jw's record of the draft and its file as it stands."""
    stored = lesson.load_draft(draft_id, where)
    path = lesson._lesson_path(where, draft_id)
    try:
        file: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise JwError(f"no draft file {path}", hint="Call lesson_draft again.") from exc
    return stored, file


def _steps(file: Mapping[str, Any]) -> list[tuple[str, int, int, dict[str, Any]]]:
    """Each step of the file: its id, part index, step index and the step."""
    return [
        (str(step.get("id")), p, n, step)
        for p, part in enumerate((file.get("script") or {}).get("parts") or [])
        for n, step in enumerate(part.get("steps") or [])
    ]


def _find(file: Mapping[str, Any], draft_id: str, step_id: str) -> tuple[int, int, dict[str, Any]]:
    steps = _steps(file)
    for sid, p, n, step in steps:
        if sid == step_id:
            return p, n, step
    raise JwError(
        f"no step {step_id} in {draft_id}",
        hint=f"Its steps are {', '.join(s for s, *_ in steps)}; lesson_show lists them.",
    )


def _question(stored: Mapping[str, Any], step: Mapping[str, Any]) -> dict[str, Any]:
    """The step as `lesson.card` reads a question: jw's record of it, with the file's parts."""
    q = next((q for q in stored["questions"] if q["step_id"] == step.get("id")), {})
    return {**lesson.from_file(q, step), "step_id": step.get("id")}


def _step_card(stored: Mapping[str, Any], step: Mapping[str, Any]) -> dict[str, Any]:
    (one,) = lesson.card({"questions": [_question(stored, step)]})["questions"]
    return one


def _latest(where: Path, draft_id: str) -> list[dict[str, Any]]:
    """The findings of the last check, from `<draft_id>.check.json`, or none."""
    try:
        raw: Any = json.loads(lesson._check_path(where, draft_id).read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return []
    return [f for f in raw.get("findings") or [] if isinstance(f, Mapping)]


def _refusal(
    stored: Mapping[str, Any],
    step: Mapping[str, Any],
    step_id: str,
    problems: list[str],
    at: str,
    where: Path,
    draft_id: str,
) -> dict[str, Any]:
    """A refused patch's answer: nothing written, each problem a finding with rule `edit`."""
    return {
        "ok": False,
        "step_id": step_id,
        "findings": [lesson._finding(step_id, "edit", m, at) for m in problems],
        "render": lesson.render_of(where, draft_id, step_id),
        "card": _step_card(stored, step),
        "lesson_ok": None,
        "draft_path": str(lesson._lesson_path(where, draft_id)),
    }


def edit(
    draft_id: str,
    step_id: str,
    patch: Mapping[str, Any],
    why: str | None = None,
    change: str = CHANGE_DEFAULT,
    *,
    names: Sequence[str] = (),
    runner: lesson.Runner | None = None,
    folder: Path | None = None,
) -> dict[str, Any]:
    """Change one step of the draft file by a JSON merge patch, check the lesson, and return that
    step's answer: `{ok, step_id, findings, render, card, lesson_ok, draft_path}`.

    `ok` is that no finding for this step is an error; `lesson_ok` is check.ts's answer for the
    whole lesson. A patch refused here (a part it may not set, a copied part changed without a
    `why`) changes nothing and comes back as findings with rule `edit`, before anything merges
    (dl-a38n.35). Every string in the patch but a key, and `why`, goes through `pii.guard` with
    `names`, the family's names as for lesson_draft (dl-a38n.36).
    """
    where = folder or lesson.drafts_dir()
    stored, file = _load(draft_id, where)
    if not isinstance(patch, Mapping) or not patch:
        raise JwError("a patch is an object", hint='Pass e.g. {"question": {"help": {"boost": ...}}}.')
    p, n, step = _find(file, draft_id, step_id)
    at = f"script.parts[{p}].steps[{n}]"
    path = lesson._lesson_path(where, draft_id)
    problems = _refused(patch, PATCHABLE)
    if problems:
        return _refusal(stored, step, step_id, problems, at, where, draft_id)
    family = pii.names_for(members=list(names))
    patch = lesson.guard_words(patch, family)
    why = pii.guard(why, names=family).text if why else why

    edited = _merge(copy.deepcopy(step), patch)
    help_ = (edited.get("question") or {}).get("help")
    if isinstance(help_, dict):
        _tidy_help(help_, str(edited["question"].get("family") or ""))
    copy_q = next((q for q in stored["questions"] if q["step_id"] == step_id), None)
    copied = [c for c in COPIED if c[-1] != "almost" or "almost" in ((copy_q or {}).get(
        "question", {}).get("help") or {})]
    moved = [".".join(c) for c in copied if _at(step, c) != _at(edited, c)]
    if moved:
        if change not in lesson.CHANGE_KINDS:
            problems.append(f"change is one of {', '.join(lesson.CHANGE_KINDS)}")
        if not (why or "").strip():
            problems.append(
                f"{', '.join(moved)}: a change to the bank's copy says why (the parent's ask)"
            )
    if problems:
        return _refusal(stored, step, step_id, problems, at, where, draft_id)

    if moved:
        based_on = dict(edited.get("based_on") or {})
        based_on["changes"] = [*(based_on.get("changes") or []),
                               {"change": change, "why": str(why).strip(), "reviewed": False}]
        edited["based_on"] = based_on
    file["script"]["parts"][p]["steps"][n] = edited
    lesson._make_dirs(where)
    lesson._write_json(path, file)

    answer = lesson._run_check(path, runner)
    findings = lesson._findings(answer)
    lesson._write_check(where, stored, bool(answer.get("ok")), findings,
                        answer.get("mistake_classes"))
    mine = [f for f in findings if f.get("step_id") == step_id]
    return {
        "ok": not any(f.get("level") == "error" for f in mine),
        "step_id": step_id,
        "findings": mine,
        "render": lesson.render_of(where, draft_id, step_id),
        "card": _step_card(stored, edited),
        "lesson_ok": bool(answer.get("ok")),
        "draft_path": str(path),
    }


def show(draft_id: str, step_id: str | None = None, *, folder: Path | None = None) -> dict[str, Any]:
    """The draft file's step (or every step) as data, with the last check's findings and the
    page's render findings for it: `{draft_id, draft_path, title, steps: [{step, findings}],
    render}`."""
    where = folder or lesson.drafts_dir()
    stored, file = _load(draft_id, where)
    if step_id is None:
        steps = [step for *_, step in _steps(file)]
    else:
        steps = [_find(file, draft_id, step_id)[2]]
    latest = _latest(where, draft_id)
    return {
        "draft_id": draft_id,
        "draft_path": str(lesson._lesson_path(where, draft_id)),
        "title": file.get("title"),
        "steps": [
            {"step": step, "findings": [f for f in latest if f.get("step_id") == step.get("id")]}
            for step in steps
        ],
        "render": lesson.render_of(where, draft_id, step_id),
    }
