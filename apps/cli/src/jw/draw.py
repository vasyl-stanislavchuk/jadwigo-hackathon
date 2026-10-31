"""The lesson draw: code picks a lesson's questions from the sets a search found (dl-e8ov.5.2.17).

The bank is searched for question sets, and code draws the questions
(david-learns/decisions/2026-10-25-the-question-bank-is-searched-for-question-sets-by-agents-sendin).
Given the sets (the envelope's rows and the pages fetched for them), a learner's history and a
lesson kind, `draw` returns questions that play in the lesson's language, that this learner has
not seen, that spacing allows, varied by problem type, each with the reason it was drawn. Sets and
items it leaves out come back too, each with its reason, so a planner can see why a set gave
nothing.

**The rule per lesson kind is the owner's to settle.** `DRAW_RULES` below is one table the owner
edits. Its values are a provisional default, not a decision: section 8 of
docs/research/question-and-lesson-model.md lists "the draw rule for each lesson kind" as an open
owner question without options, so each row cites the nearest written source instead. Every draw
carries `rule_settled: false` until the owner rules and `RULES_SETTLED` is flipped.

What a page can tell the draw today: an item's problem type is known only for the samples a page
lists (up to 3 per problem type); the other item ids have no problem type on the page, so they are
drawn only after the typed ones run out. A row without a fetched page has no item ids at all, and
is left out with that reason.

Only lesson-ready items are drawn (dl-a38n.32.10, decisions dl-kaxj and dl-be2l): a page the
readiness stamp built carries `items.ready_ids[lang]` and `items.count.ready[lang]`, and the draw
takes its ids from there; a set with none ready in the lesson's language is left out with
`no item is lesson-ready in <lang>`. A page built before the stamp has neither, so the draw falls
back to `items.ids`, and `jw.items.load_item` then refuses each item as `not checked`: fail-closed.
"""

from __future__ import annotations

import datetime as dt
import re
from collections import deque
from collections.abc import Iterable, Mapping
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

Kind = Literal["practice", "review", "check", "diagnostic"]
Pick = Literal["unseen", "due_or_twin"]


@dataclass(frozen=True)
class DrawRule:
    """How one lesson kind draws. Every field is the owner's to change."""

    count: int  # the most questions drawn for one brief entry
    pick: Pick  # unseen: questions the learner has not seen; due_or_twin: FSRS due, or a twin
    per_skill: int | None  # at most this many per skill (None: no per-skill limit)
    max_same_type_in_row: int  # problem-type variety: no longer run of one type
    min_gap_days: int  # spacing: an item seen fewer days ago than this is held back
    order: Literal["rank", "easy_first"]  # search rank, or the set's place in its course
    source: str  # where this default comes from


# Provisional defaults, NOT DECIDED: the owner settles them (question-and-lesson-model.md §8,
# session 3, "the draw rule for each lesson kind"). Each row says where its values come from.
DRAW_RULES: dict[str, DrawRule] = {
    "practice": DrawRule(
        count=6,
        pick="unseen",
        per_skill=None,
        max_same_type_in_row=3,
        min_gap_days=1,
        order="rank",
        source=(
            "bead dl-e8ov.5.2.17 note of 2026-10-25 (practice and reteach: varied problem types, "
            "unseen); lesson-kinds.md §5, daily lesson (no more than three of one type in a row)"
        ),
    ),
    "review": DrawRule(
        count=5,
        pick="due_or_twin",
        per_skill=None,
        max_same_type_in_row=3,
        min_gap_days=0,
        order="rank",
        source=(
            "bead dl-e8ov.5.2.17 note of 2026-10-25 (review: lesson questions FSRS says are due, "
            "or a twin); lesson-kinds.md §5, review (due skills, mixed)"
        ),
    ),
    "check": DrawRule(
        count=6,
        pick="unseen",
        per_skill=1,
        max_same_type_in_row=1,
        min_gap_days=1,
        order="rank",
        source=(
            "bead dl-e8ov.5.2.17 note of 2026-10-25 (check: one per skill; no help before a real "
            "try is the lesson's, not the draw's); lesson-kinds.md §5, check (mixed topics)"
        ),
    ),
    "diagnostic": DrawRule(
        count=8,
        pick="unseen",
        per_skill=2,
        max_same_type_in_row=2,
        min_gap_days=0,
        order="easy_first",
        source=(
            "lesson-kinds.md §5, placement (one or two questions per skill, from easy to hard); "
            "how a diagnostic is assembled stays open in dl-u1y5.22"
        ),
    ),
}
RULES_SETTLED = False


@dataclass(frozen=True)
class History:
    """What the draw needs to know about one learner, keyed by bank item id."""

    seen: Mapping[str, dt.date] = field(default_factory=dict)  # the last day each item was shown
    due: Mapping[str, dt.date] = field(default_factory=dict)  # FSRS due day, items with a card


@dataclass(frozen=True)
class Drawn:
    item_id: str
    set_id: str
    problem_type: str | None
    text: str | None  # the sample's text in the lesson language, when the page has it
    skill: str  # the item's skill ids joined by ", ", as one label
    reason: str
    skills: tuple[str, ...] = ()  # the item's skill ids, each as the bank wrote it


@dataclass(frozen=True)
class Left:
    id: str  # a set id or an item id
    reason: str


@dataclass
class Draw:
    kind: str
    rule: dict[str, Any]
    rule_settled: bool
    questions: list[Drawn]
    left_out: list[Left]

    def to_json(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class _Candidate:
    item_id: str
    set_id: str
    rank: int
    problem_type: str | None
    text: str | None
    skills: tuple[str, ...]
    order: int  # the set's place in its course, for easy_first

    @property
    def skill(self) -> str:
        return ", ".join(self.skills)


def _set_skills(row: Mapping[str, Any] | None, page: Mapping[str, Any]) -> list[str]:
    """The set's skill ids: the row's, else the page's enrichment, else the set id itself."""
    skills = list((row or {}).get("skill_ids") or [])
    if not skills:
        skills = list(((page.get("enrichment") or {}).get("skill_ids") or {}).get("value") or [])
    return [str(s) for s in skills] or [str(page["id"])]


def _numbers(text: str) -> set[str]:
    return set(re.findall(r"\d+", text))


def _type_skills(set_skills: list[str], ptype: Mapping[str, Any] | None) -> tuple[str, ...]:
    """A problem type's skill ids (dl-n9fr.55): its own `skill_ids` when the page gives them, else
    the one set skill whose last part carries a number the type's name carries ("Mult by 6" is
    `row-6`), else every skill of the set, never only the first."""
    if ptype is None:
        return tuple(set_skills)
    own = [str(s) for s in ptype.get("skill_ids") or []]
    if own:
        return tuple(own)
    named = _numbers(str(ptype.get("name") or ""))
    matched = [s for s in set_skills if named & _numbers(s.rsplit(".", 1)[-1])]
    return (matched[0],) if len(matched) == 1 else tuple(set_skills)


# An item the page does not list as ready; `jw.lesson` replaces it with load_item's own reason.
NOT_READY_ITEM = "not lesson-ready"


def not_ready_reason(language: str) -> str:
    """Why a set with no lesson-ready item in `language` gives nothing."""
    return f"no item is lesson-ready in {language}"


def ready_ids(page: Mapping[str, Any], language: str) -> list[str] | None:
    """The page's lesson-ready item ids in `language`, or None for a page with no `ready_ids`
    (built before the stamp, or counted but not listed): then every id is drawn and load_item
    judges each one, its refusal the reason in left_out."""
    ready = (page.get("items") or {}).get("ready_ids")
    if isinstance(ready, Mapping):
        return [str(i) for i in ready.get(language) or []]
    return None


def ready_count(page: Mapping[str, Any], language: str) -> int | None:
    """How many items are lesson-ready in `language`: `count.ready[lang]`, else the length of
    `ready_ids[lang]`, else None for a page built before the stamp."""
    page_items = page.get("items") or {}
    counted = (page_items.get("count") or {}).get("ready")
    if isinstance(counted, Mapping):
        return int(counted.get(language) or 0)
    listed = ready_ids(page, language)
    return None if listed is None else len(listed)


def _plays(page: Mapping[str, Any], language: str) -> str | None:
    """Why the set does not play in `language`, or None when it does."""
    if not (page.get("languages") or {}).get(language):
        return f"the source has no {language} version"
    count = ((page.get("items") or {}).get("count") or {}).get(language)
    if count == 0:
        return f"no items in {language}"
    if (page.get("items") or {}).get("plays_share") == 0:
        return "no item plays (plays_share 0)"
    if ready_count(page, language) == 0:
        return not_ready_reason(language)
    return None


def _candidates(
    rows: list[Mapping[str, Any]],
    pages: Mapping[str, Mapping[str, Any]],
    language: str,
    flagged: set[str],
    left: list[Left],
) -> list[_Candidate]:
    by_id = {str(r["id"]): r for r in rows}
    # The envelope names the sets; a page the search did not return is not drawn from.
    ranked = [str(r["id"]) for r in sorted(rows, key=lambda r: int(r["rank"]))]
    out: list[_Candidate] = []
    for rank, set_id in enumerate(ranked, start=1):
        page = pages.get(set_id)
        if page is None:
            left.append(Left(set_id, "no page fetched for this row, so no item ids to draw"))
            continue
        why_not = _plays(page, language)
        if why_not:
            left.append(Left(set_id, why_not))
            continue
        skills = _set_skills(by_id.get(set_id), page)
        order = int((page.get("source_place") or {}).get("order") or 0)
        ready = ready_ids(page, language)
        ids = [str(i) for i in (page.get("items") or {}).get("ids") or []]
        typed: set[str] = set()
        for ptype in page.get("problem_types") or []:
            typed_skills = _type_skills(skills, ptype)
            for sample in ptype.get("samples") or []:
                item = str(sample["item_id"])
                typed.add(item)
                if ready is not None and item not in ready:
                    left.append(Left(item, NOT_READY_ITEM))
                    continue
                if item in flagged:
                    left.append(Left(item, "its media is flagged (raster words or no alt)"))
                    continue
                if not sample.get(language):
                    left.append(Left(item, f"the sample has no {language} text"))
                    continue
                out.append(
                    _Candidate(
                        item, set_id, rank, ptype["name"], sample[language], typed_skills, order
                    )
                )
        for item in [*ids, *(i for i in ready or [] if i not in ids)]:
            if item in typed:
                continue
            if ready is not None and item not in ready:
                left.append(Left(item, NOT_READY_ITEM))
                continue
            if item in flagged:
                left.append(Left(item, "its media is flagged (raster words or no alt)"))
                continue
            out.append(_Candidate(item, set_id, rank, None, None, tuple(skills), order))
    return out


def _interleave(cands: list[_Candidate], rule: DrawRule, reasons: Mapping[str, str]) -> list[Drawn]:
    """Take turns across (set, problem type) queues so types vary; typed items before untyped."""
    if rule.order == "easy_first":
        cands = sorted(cands, key=lambda c: (c.order, c.rank))
    queues: dict[tuple[str, str | None], deque[_Candidate]] = {}
    for c in cands:
        queues.setdefault((c.set_id, c.problem_type), deque()).append(c)
    # Items whose problem type the page does not give wait until every typed queue is empty.
    rotation = deque(k for k in queues if k[1] is not None)
    untyped = deque(k for k in queues if k[1] is None)
    per_skill: dict[str, int] = {}
    picked: list[Drawn] = []
    while rotation and len(picked) < rule.count:
        progressed = False
        for _ in range(len(rotation)):
            key = rotation[0]
            rotation.rotate(-1)
            queue = queues[key]
            if not queue:
                continue
            head = queue[0]
            if rule.per_skill is not None and per_skill.get(head.skill, 0) >= rule.per_skill:
                queue.clear()
                continue
            run = [d.problem_type for d in picked[-rule.max_same_type_in_row :]]
            if (
                head.problem_type is not None
                and len(run) == rule.max_same_type_in_row
                and all(t == head.problem_type for t in run)
            ):
                continue
            queue.popleft()
            per_skill[head.skill] = per_skill.get(head.skill, 0) + 1
            ptype = head.problem_type or "not on the page"
            picked.append(
                Drawn(
                    head.item_id,
                    head.set_id,
                    head.problem_type,
                    head.text,
                    head.skill,
                    f"{reasons[head.item_id]}; problem type {ptype}; set {head.set_id} "
                    f"(rank {head.rank}); skill {head.skill}",
                    head.skills,
                )
            )
            progressed = True
            if len(picked) >= rule.count:
                break
        rotation = deque(k for k in rotation if queues[k])
        if not rotation and untyped:
            rotation, untyped = untyped, deque()
            continue
        if not progressed:
            if untyped:  # every typed queue is blocked by the same-type limit
                rotation.extend(untyped)
                untyped.clear()
                continue
            break
    return picked


def draw(
    envelope: Mapping[str, Any],
    pages: Mapping[str, Mapping[str, Any]],
    *,
    kind: str,
    history: History | None = None,
    language: str = "pl",
    today: dt.date | None = None,
    flagged: Iterable[str] = (),
    rules: Mapping[str, DrawRule] | None = None,
) -> Draw:
    """Draw one brief entry's questions for a lesson of `kind` from a search's sets.

    `pages` maps set id to its fetched page (`jw.bank_client.show_set`); only sets the envelope's
    rows name are drawn from, in their rank order. `flagged` is the item ids
    whose media is flagged for the lesson's language or for voice. `rules` replaces DRAW_RULES (a
    planner tuning a count); the result says which rule ran and that it is not settled.
    """
    table = rules if rules is not None else DRAW_RULES
    if kind not in table:
        raise ValueError(f"unknown lesson kind {kind!r}; the table has {', '.join(table)}")
    rule = table[kind]
    hist = history or History()
    day = today or dt.date.today()
    left: list[Left] = []
    cands = _candidates(list(envelope.get("rows") or []), pages, language, set(flagged), left)
    reasons: dict[str, str] = {}
    keep: list[_Candidate] = []

    if rule.pick == "unseen":
        for c in cands:
            last = hist.seen.get(c.item_id)
            if last is not None and (day - last).days < rule.min_gap_days:
                left.append(Left(c.item_id, f"seen on {last}, spacing holds it back"))
            elif last is not None:
                left.append(Left(c.item_id, f"already seen on {last}"))
            else:
                reasons[c.item_id] = "unseen"
                keep.append(c)
    else:  # due_or_twin
        by_item = {c.item_id: c for c in cands}
        twins_used: set[str] = set()
        for item, due in sorted(hist.due.items(), key=lambda kv: kv[1]):
            if due > day:
                continue
            if item in by_item:
                reasons[item] = f"due by FSRS on {due}"
                keep.append(by_item[item])
                continue
            # The due item does not play here: draw an unseen twin of the same set and type.
            twin = _twin_of(item, pages, cands, hist, twins_used)
            if twin is None:
                left.append(Left(item, f"due on {due} but does not play, and has no twin here"))
                continue
            twins_used.add(twin.item_id)
            reasons[twin.item_id] = f"twin of {item}, due by FSRS on {due}"
            keep.append(twin)
        if not keep:
            left.append(Left("(review)", "nothing in these sets is due for this learner"))

    return Draw(
        kind=kind,
        rule=asdict(rule),
        rule_settled=RULES_SETTLED,
        questions=_interleave(keep, rule, reasons),
        left_out=left,
    )


def _twin_of(
    item: str,
    pages: Mapping[str, Mapping[str, Any]],
    cands: list[_Candidate],
    hist: History,
    used: set[str],
) -> _Candidate | None:
    for set_id, page in pages.items():
        for ptype in page.get("problem_types") or []:
            if any(s["item_id"] == item for s in ptype.get("samples") or []):
                for c in cands:
                    if (
                        c.set_id == set_id
                        and c.problem_type == ptype["name"]
                        and c.item_id not in hist.seen
                        and c.item_id not in used
                    ):
                        return c
                return None
    return None
