"""A lesson's explanation for a parent: the drawn questions, said in plain words by the model.

The prompt carries the learner's name and may carry a parent's own note, so every prompt built here
goes through `jw.pii.guard` before `jw.muse.ask` sees it, and the reply has the names put back on
this machine. `prompts()` is the one builder: the guard test runs over everything it returns.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator, Mapping
from typing import Any

from jw import muse
from jw.draw import Draw
from jw.pii import GuardedPrompt, guard, restore_stream

_LANGUAGE_NAMES = {"pl": "Polish", "en": "English", "uk": "Ukrainian"}


def _title(page: Mapping[str, Any] | None, language: str) -> str:
    titles = (page or {}).get("titles") or {}
    return str(titles.get(language) or titles.get("en") or "")


def _lesson_text(
    learner_name: str,
    drawn: Draw,
    pages: Mapping[str, Mapping[str, Any]],
    language: str,
    parent_note: str | None,
) -> str:
    lines = [
        f"You are writing for the parent of {learner_name}, a primary-school learner.",
        f"Write in {_LANGUAGE_NAMES.get(language, language)}, in 3 to 5 short sentences.",
        f"Say what {learner_name} will practise in this {drawn.kind} lesson and why these "
        "questions, in words a parent understands. Name no score and no time limit.",
        "Never give an answer to any question.",
        # The guard turns names into [NAME_1] and the like. Without this line the model writes a
        # name of its own in their place (the 2026-10-28 smoke run got "Eryk"), and restoring
        # the real name then finds nothing to replace.
        "Text in square brackets such as [NAME_1] or [PHONE_1] stands for a person's details. "
        "Copy it exactly as written, brackets included; never replace it with a name of your own, "
        "and use phrasing that does not depend on the learner's gender.",
        "",
        "The questions, in the order they will be played:",
    ]
    for i, q in enumerate(drawn.questions, start=1):
        set_title = _title(pages.get(q.set_id), language)
        text = q.text or "(the question text is not on the page)"
        ptype = q.problem_type or "unknown"
        lines.append(f"{i}. {text} (set: {set_title}; problem type: {ptype})")
    if parent_note:
        lines += ["", "The parent wrote:", parent_note.strip()]
    return "\n".join(lines)


def prompts(
    learner_name: str,
    drawn: Draw,
    pages: Mapping[str, Mapping[str, Any]],
    *,
    language: str = "pl",
    parent_note: str | None = None,
    names: Iterable[str] = (),
) -> list[GuardedPrompt]:
    """Every prompt the lesson explanation sends, already guarded.

    `names` is everyone the guard hides: the learner (name and handle) and the pod's members,
    `jw.pii.names_for`. The learner's own name is always among them.
    """
    hidden = [learner_name, *names]
    text = _lesson_text(learner_name, drawn, pages, language, parent_note)
    return [guard(text, names=hidden)]


def explain(
    learner_name: str,
    drawn: Draw,
    pages: Mapping[str, Mapping[str, Any]],
    *,
    language: str = "pl",
    parent_note: str | None = None,
    names: Iterable[str] = (),
    tag: str = "product:explain",
) -> Iterator[str]:
    """Stream the explanation, names restored, through the product's one model client."""
    for prompt in prompts(
        learner_name, drawn, pages, language=language, parent_note=parent_note, names=names
    ):
        yield from restore_stream(muse.ask(prompt, tag=tag, stream=True), prompt)
