"""What the compose workflow's words must get right, checked by code on a lesson file (dl-u1y5.32).

`findings(lesson_file)` reads the file `lesson_check` wrote (`lesson_file` in its result) and
returns one line per problem with the words a composing agent put on it, `[]` when there is none.
Each rule is one that run A (dl-e8ov.5.38.5) broke:

- a child is told a task is easy (`łatwe`, `proste`), or hears a bare `źle`;
- a twin drops its question's representation (another family, another `data` shape or figure kind,
  its pictures gone);
- an a·b twin leaves its question's fact family (3 · 10 got 3 · 9: the factor its skill names,
  else a 0, 1, 10 or 100, else either factor, is kept), repeats the question, or has a key that is
  not its own product;
- a twin's `say` ends otherwise than its question's (a question mark dropped), or a card has no
  closing stop;
- the same mistake card on two questions (one template for all), or one that names none of its
  question's numbers;
- a card that leans on a product the question never shows (5 · 6 = 30 on 6 · 7); the row next to
  the question's (6 · 8 on 6 · 7) is a child's miss and may be named;
- a card that prints the answer, which the player then drops.

It judges the words, never the child's answers, and calls no model. Whether the words are good
Polish for a child is still the owner's read of the card. From a shell:

    cd apps/cli && uv run --frozen python evals/compose/words_check.py <lesson_file>
"""

from __future__ import annotations

import json
import re
import sys
from collections.abc import Iterator, Mapping
from pathlib import Path
from typing import Any

# Never tell a child a task is easy, and never a bare "wrong" (AGENTS.md house rules).
UNKIND = re.compile(
    r"(?<!\w)(łatw\w*|prost(e|y|a|sze|ego|szy)|łatwizn\w*|źle|banaln\w*)(?!\w)", re.IGNORECASE
)
TIMES = re.compile(r"(\d+)\s*[·×x*]\s*(\d+)")
NUMBER = re.compile(r"\d+")
# A factor that is the fact family by itself: a twin of 3 · 10 stays on 10.
SPECIAL = {0, 1, 10, 100}
CARDS = ("look", "boost")


def _steps(lesson_file: Mapping[str, Any]) -> Iterator[Mapping[str, Any]]:
    for part in (lesson_file.get("script") or {}).get("parts") or []:
        yield from part.get("steps") or []


def _texts(value: Any) -> Iterator[str]:
    """Every string under `value`, skipping picture sources and ids."""
    if isinstance(value, str):
        yield value
    elif isinstance(value, Mapping):
        for k, v in value.items():
            if k not in ("src", "id", "kind", "input", "entry", "family", "labels"):
                yield from _texts(v)
    elif isinstance(value, list):
        for v in value:
            yield from _texts(v)


def _numbers(*values: Any) -> set[int]:
    return {int(n) for v in values for t in _texts(v) for n in NUMBER.findall(t)}


def _product(data: Mapping[str, Any]) -> tuple[int, int] | None:
    """The a · b the question shows in its figure or stem, if it shows one."""
    for field in ("figure", "stem"):
        text = (data.get(field) or {}).get("text") if isinstance(data.get(field), Mapping) else None
        found = TIMES.search(text or "")
        if found:
            return int(found[1]), int(found[2])
    return None


def _accepted(key: Any) -> list[str]:
    return [str(v) for v in (key or {}).get("accept") or []] if isinstance(key, Mapping) else []


def _gives_away(text: str, answers: list[str]) -> bool:
    return any(re.search(rf"(?<![\w]){re.escape(a)}(?![\w])", text) for a in answers if a)


def _has_pictures(value: Any) -> bool:
    if isinstance(value, Mapping):
        return bool(value.get("pictures")) or any(_has_pictures(v) for v in value.values())
    if isinstance(value, list):
        return any(_has_pictures(v) for v in value)
    return False


def _shape(data: Mapping[str, Any]) -> tuple[Any, ...]:
    figure = data.get("figure") if isinstance(data.get("figure"), Mapping) else {}
    return (sorted(data), (figure or {}).get("kind"), data.get("input"), data.get("entry"))


def _family(step: Mapping[str, Any], asked: tuple[int, int]) -> set[int]:
    """The factor a twin of `asked` must keep: the one its skill names (`times-6`), else 0, 1, 10
    or 100 when the question has one. Empty when either factor will do."""
    named = {int(n) for s in step.get("skill_ids") or [] for n in NUMBER.findall(str(s))}
    return (named & set(asked)) or (SPECIAL & set(asked))


def _taught(product: tuple[int, int], shown: set[int], asked: tuple[int, int] | None) -> bool:
    """Whether a card's a · b is one the question shows, or the row next to it (a child's
    neighbour_row miss: 6 · 6 or 6 · 8 on 6 · 7)."""
    if set(product) <= shown:
        return True
    if asked is None:
        return False
    a, b = product
    x, y = asked
    return any(p == q and abs(r - s) <= 1 for p, r in ((a, b), (b, a)) for q, s in ((x, y), (y, x)))


def _twin(sid: str, step: Mapping[str, Any]) -> list[str]:
    spec = step.get("question") or {}
    twin = (spec.get("help") or {}).get("twin") or {}
    if not twin:
        return [f"{sid}: no twin"]
    out: list[str] = []
    data, tdata = spec.get("data") or {}, twin.get("data") or {}
    if twin.get("family", spec.get("family")) != spec.get("family"):
        out.append(f"{sid}: twin is a {twin.get('family')} question; its question is {spec.get('family')}")
    if _shape(tdata) != _shape(data):
        out.append(f"{sid}: twin's data is not in its question's shape: {_shape(tdata)} for {_shape(data)}")
    if _has_pictures(data) and not _has_pictures(tdata):
        out.append(f"{sid}: twin dropped its question's pictures")
    say, tsay = str(step.get("say") or "").strip(), str(twin.get("say") or "").strip()
    if not tsay:
        out.append(f"{sid}: twin has no say")
    elif say[-1:] in "?.!" and tsay[-1:] != say[-1:]:
        out.append(f"{sid}: twin's say ends {tsay[-1:]!r}, its question's ends {say[-1:]!r}: {tsay}")
    asked, given = _product(data), _product(tdata)
    if asked and given:
        if sorted(asked) == sorted(given):
            out.append(f"{sid}: twin asks its question again: {given[0]} · {given[1]}")
        family = _family(step, asked)
        if not set(asked) & set(given) or (family and not family & set(given)):
            out.append(
                f"{sid}: twin {given[0]} · {given[1]} left the fact family of {asked[0]} · {asked[1]}"
            )
        if _accepted(twin.get("key")) and str(given[0] * given[1]) not in _accepted(twin.get("key")):
            out.append(f"{sid}: twin's key {_accepted(twin.get('key'))} is not {given[0]} · {given[1]}")
    return out


def _cards(step: Mapping[str, Any]) -> Iterator[tuple[str, str]]:
    """Each card the agent writes on a step, as (where, text)."""
    help_ = (step.get("question") or {}).get("help") or {}
    for rung in CARDS:
        card = help_.get(rung)
        if isinstance(card, Mapping) and isinstance(card.get("text"), str):
            yield rung, card["text"]
    for cls, card in (help_.get("boost_by_mistake") or {}).items():
        if isinstance(card, Mapping) and isinstance(card.get("text"), str):
            yield f"boost_by_mistake.{cls}", card["text"]


def findings(lesson_file: Mapping[str, Any]) -> list[str]:
    """Every problem with the agent's words on `lesson_file`, one line each."""
    out: list[str] = []
    seen: dict[str, str] = {}  # a mistake card's text -> the step that has it
    for step in _steps(lesson_file):
        sid = str(step.get("id"))
        spec = step.get("question") or {}
        help_ = spec.get("help") or {}
        for text in _texts([step.get("say"), spec.get("data"), help_]):
            if found := UNKIND.search(text):
                out.append(f"{sid}: a child reads {found[0]!r}: {text}")
        out += _twin(sid, step)
        shown = _numbers(step.get("say"), spec.get("data"), spec.get("key"), help_.get("hints"),
                         help_.get("worked"))
        answers = _accepted(spec.get("key"))
        for where, text in _cards(step):
            if text.strip()[-1:] not in ".?!":
                out.append(f"{sid}: {where} ends without . ? or !: {text}")
            if _gives_away(text, answers):
                out.append(f"{sid}: {where} prints the answer, so the player drops it: {text}")
            for a, b in TIMES.findall(text):
                if not _taught((int(a), int(b)), shown, _product(spec.get("data") or {})):
                    out.append(f"{sid}: {where} leans on {a} · {b}, which the question never shows")
            if where.startswith("boost_by_mistake"):
                if seen.get(text, sid) != sid:
                    out.append(f"{sid}: {where} is {seen[text]}'s card word for word")
                seen.setdefault(text, sid)
                if shown and not _numbers(text) & shown:
                    out.append(f"{sid}: {where} names none of its question's numbers: {text}")
    return out


if __name__ == "__main__":
    problems = findings(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")))
    print("\n".join(problems) or "no findings")
    sys.exit(1 if problems else 0)
