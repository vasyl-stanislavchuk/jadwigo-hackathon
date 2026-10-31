"""jw question verbs: search the bank, show a set, list gaps (dl-u1y5.23), read an item, and the
refusals loop: list what is not lesson-ready by shape, assign a shape its bead, flag an item
(dl-a38n.32.11, `jw.refusals`), and the readiness report per language (dl-a38n.32.36,
`jw.readiness`).

Moved from david-learns `dl question` (dl-e8ov.5.2.7, dl-e8ov.5.2.8). Each `--json` verb prints
what one function below returns, and `jw mcp serve` calls the same functions, so a verb and its
MCP tool cannot drift apart.
"""

from __future__ import annotations

import json
from typing import Any

import click

from jw import bank_client, items, readiness, refusals
from jw.errors import JwError, emit


class _EmitErrorsCommand(click.Command):
    """Verbs print the JwError envelope and exit 1 instead of a traceback."""

    def invoke(self, ctx: click.Context) -> Any:
        try:
            return super().invoke(ctx)
        except JwError as exc:
            emit(error=exc, json_mode=ctx.params.get("json_mode", False))


class _EmitErrorsGroup(click.Group):
    """A group that is also a verb: the JwError envelope, as `_EmitErrorsCommand` prints it."""

    def invoke(self, ctx: click.Context) -> Any:
        try:
            return super().invoke(ctx)
        except JwError as exc:
            emit(error=exc, json_mode=ctx.params.get("json_mode", False))


@click.group()
def group() -> None:
    """Question bank: search, show, gaps, item, refusals, flag, readiness."""


# ------------------------------------------------- the functions verbs and tools share ----


def search_envelope(
    *,
    grade: str,
    words: str | None = None,
    words_en: str | None = None,
    skills: list[str] | tuple[str, ...] = (),
    mistakes: list[str] | tuple[str, ...] = (),
    language: str = "pl",
    limit: int = 20,
    arm: str | None = None,
    stage: str | None = None,
) -> dict[str, Any]:
    """`jw question search --json` and the question_search tool."""
    need: dict[str, Any] = {"language": language, "grade": grade}
    if words:
        need["words"] = words
    if words_en:
        need["words_en"] = words_en
    if skills:
        need["skills"] = list(skills)
    if mistakes:
        need["mistakes"] = list(mistakes)
    return bank_client.search(need, arm=arm, limit=limit, stage=stage)


def show_page(set_id: str) -> dict[str, Any]:
    """`jw question show --json` and the question_show tool: one set page."""
    return bank_client.show_set(set_id)


def gaps_report(
    *,
    grade: str,
    words: list[str] | tuple[str, ...] = (),
    skills: list[str] | tuple[str, ...] = (),
    language: str = "pl",
    arm: str | None = None,
) -> dict[str, Any]:
    """`jw question gaps --json` and the question_gaps tool: one need per words and per skill."""
    needs: list[dict[str, Any]] = [
        {"language": language, "grade": grade, "words": w} for w in words
    ] + [{"language": language, "grade": grade, "skills": [s]} for s in skills]
    if not needs:
        raise JwError("gaps needs at least one --words or --skill", hint="Name what to look for.")
    report = bank_client.gaps(needs, arm=arm)
    for row in report["needs"]:
        if row.get("reason") and row.get("not_ready"):
            row["reason"] = _with_cause(row["reason"], row["not_ready"], language)
    return report


def _with_cause(reason: str, set_ids: list[str], language: str) -> str:
    """A gap's reason with the cause most of its sets' items share (dl-a38n.32.36): `no item is
    lesson-ready in pl; most: <cause>, <n> of <m> items (<bead>)`. The reason stays as it was when
    the pages or the converted files cannot say."""
    ids: list[str] = []
    for set_id in set_ids:
        try:
            page = bank_client.show_set(set_id)
        except JwError:
            continue
        ids += [str(i) for i in (page.get("items") or {}).get("ids") or []]
    cause = readiness.dominant_cause(ids, language)
    return f"{reason}; most: {cause}" if cause else reason


def item_view(item_id: str, language: str = "pl") -> dict[str, Any]:
    """`jw question item --json` and the question_item tool: one converted item (dl-e8ov.5.38.2)."""
    return items.load_item(item_id, language)


def _title(row: dict[str, Any], language: str) -> str:
    titles: dict[str, str] = row.get("titles") or {}
    return titles.get(language) or titles.get("en") or next(iter(titles.values()), "")


def _table(envelope: dict[str, Any], language: str) -> str:
    rows = [
        (str(r["rank"]), r["id"], _title(r, language), r["arm"], f"{r['score']:.3f}")
        for r in envelope["rows"]
    ]
    header = ("rank", "set", "title", "arm", "score")
    widths = [max(len(cells[i]) for cells in [header, *rows]) for i in range(len(header))]
    lines = [
        "  ".join(cell.ljust(w) for cell, w in zip(cells, widths, strict=True)).rstrip()
        for cells in [header, *rows]
    ]
    # A planner must tell "found nothing" from "could not ask": show every arm that was asked.
    for state in envelope["state"]:
        if state["state"] != "not_asked":
            detail = f" ({state['detail']})" if state.get("detail") else ""
            lines.append(f"arm {state['arm']}: {state['state']}{detail}")
    return "\n".join(lines)


@group.command(cls=_EmitErrorsCommand)
@click.option("--json", "json_mode", is_flag=True, help="Print the search envelope.")
@click.option("--words", default=None, help="The need in plain words, in --language.")
@click.option("--words-en", default=None, help="English terms for the keyword arm.")
@click.option("--skill", "skills", multiple=True, help="Skill id (repeatable).")
@click.option("--mistake", "mistakes", multiple=True, help="Mistake class (repeatable).")
@click.option("--language", default="pl", show_default=True, type=click.Choice(["pl", "en", "uk"]))
@click.option("--grade", required=True, help="The bare grade number, e.g. 3.")
@click.option("--limit", default=20, show_default=True, type=click.IntRange(min=1))
@click.option(
    "--arm",
    default=None,
    help="Ask one arm (A, A1, B, B1, C, C2); the bank's own route only.",
)
@click.option(
    "--stage",
    default=None,
    type=click.Choice(["first", "final"]),
    help=(
        "first: vector order, ids and titles; final: reranked, full rows. The bank's own route "
        "only: the /api/v1 route always answers final."
    ),
)
def search(
    json_mode: bool,
    words: str | None,
    words_en: str | None,
    skills: tuple[str, ...],
    mistakes: tuple[str, ...],
    language: str,
    grade: str,
    limit: int,
    arm: str | None,
    stage: str | None,
) -> None:
    """Search the bank for question sets that meet a need."""
    envelope = search_envelope(
        grade=grade,
        words=words,
        words_en=words_en,
        skills=skills,
        mistakes=mistakes,
        language=language,
        limit=limit,
        arm=arm,
        stage=stage,
    )
    click.echo(
        json.dumps(envelope, ensure_ascii=False) if json_mode else _table(envelope, language)
    )


@group.command(cls=_EmitErrorsCommand)
@click.argument("set_id")
@click.option("--json", "json_mode", is_flag=True, help="Print the set page.")
def show(set_id: str, json_mode: bool) -> None:
    """Show one question set page (read from JADWIGO_BANK_DIR)."""
    page = show_page(set_id)
    if json_mode:
        click.echo(json.dumps(page, ensure_ascii=False))
        return
    lines = [f"{page['id']}  {_title(page, 'pl')} / {_title(page, 'en')}"]
    for ptype in page.get("problem_types") or []:
        lines.append(f"  {ptype['name']}: {len(ptype.get('samples') or [])} samples")
    lines.append(f"  items: {len((page.get('items') or {}).get('ids') or [])}")
    click.echo("\n".join(lines))


@group.command(cls=_EmitErrorsCommand)
@click.option("--json", "json_mode", is_flag=True, help="Print the gap report.")
@click.option("--words", "words", multiple=True, help="A need in plain words (repeatable).")
@click.option("--skill", "skills", multiple=True, help="A skill id, one need each (repeatable).")
@click.option("--language", default="pl", show_default=True, type=click.Choice(["pl", "en", "uk"]))
@click.option("--grade", required=True, help="The bare grade number, e.g. 3.")
@click.option(
    "--arm",
    default=None,
    help="Ask one arm (A, A1, B, B1, C, C2); the bank's own route only.",
)
def gaps(
    json_mode: bool,
    words: tuple[str, ...],
    skills: tuple[str, ...],
    language: str,
    grade: str,
    arm: str | None,
) -> None:
    """Search each need once and say which find nothing."""
    report = gaps_report(grade=grade, words=words, skills=skills, language=language, arm=arm)
    if json_mode:
        click.echo(json.dumps(report, ensure_ascii=False))
        return
    for row in report["needs"]:
        need = row["need"]
        what = need.get("words") or ", ".join(need.get("skills") or [])
        why = f"  ({row['reason']})" if row.get("reason") else ""
        click.echo(f"{row['verdict']:<9} {row['rows']:>3} rows  {what}{why}")


@group.command(cls=_EmitErrorsCommand)
@click.argument("item_id")
@click.option("--language", default="pl", show_default=True, type=click.Choice(["pl", "en", "uk"]))
@click.option("--json", "json_mode", is_flag=True, help="Print the item.")
def item(item_id: str, language: str, json_mode: bool) -> None:
    """Show one converted item's family step, key and help kept (read from JW_KHAN_CONVERTED)."""
    view = item_view(item_id, language)
    if json_mode:
        click.echo(json.dumps(view, ensure_ascii=False))
        return
    course = view["course"]
    lines = [
        f"{view['id']}  {view['family']} / {view['question_type']}  ({view['language']})",
        f"  say: {view['say']}",
        f"  course: {course['unit_title']} / {course['lesson_title']} / {course['exercise_title']}",
        f"  credit: {view['credit']['source']} {view['credit']['ref']}",
    ]
    click.echo("\n".join(lines))


LANGUAGE = click.option(
    "--lang",
    "language",
    default="pl",
    show_default=True,
    type=click.Choice(["pl", "en"]),
)


def _refusals_text(report: dict[str, Any]) -> str:
    rows = [
        (
            r["rule"],
            r["question_type"] or "-",
            str(r["items"]),
            r["owner"],
            r["issue"] or "-",
            ", ".join(r["examples"]),
        )
        for r in report["shapes"]
    ]
    header = ("rule", "question_type", "items", "owner", "issue", "examples")
    widths = [max(len(cells[i]) for cells in [header, *rows]) for i in range(len(header))]
    lines = [
        f"{report['language']}: {report['items']} items, {report['ready']} lesson-ready, "
        f"{report['not_checked']} not checked, {report['waiting']} waiting, "
        f"{report['refused_before_conversion']} refused before conversion ({report['file']})"
    ]
    if rows:
        lines += [
            "  ".join(cell.ljust(w) for cell, w in zip(cells, widths, strict=True)).rstrip()
            for cells in [header, *rows]
        ]
    else:
        lines.append("no shapes")
    since = report.get("since")
    if since is not None:
        lines.append(f"since {since['bead']}:")
        for shape in since["shapes"]:
            what = f"{shape['rule']} / {shape['question_type'] or '-'}"
            if shape["plays_now"]:
                lines.append(f"  {what}: empty, every item plays now")
            else:
                ids = ", ".join(shape["still_refused"])
                lines.append(f"  {what}: {len(shape['still_refused'])} still refused ({ids})")
        if not since["shapes"]:
            lines.append("  no shape names this bead")
    return "\n".join(lines)


@group.group(cls=_EmitErrorsGroup, invoke_without_command=True, name="refusals")
@LANGUAGE
@click.option("--new", is_flag=True, help="Only the shapes no bead tracks yet.")
@click.option(
    "--since",
    default=None,
    metavar="BEAD",
    help="The shapes a bead tracks, and what still fails.",
)
@click.option("--json", "json_mode", is_flag=True, help="Print the report.")
@click.pass_context
def refusals_group(
    ctx: click.Context, language: str, new: bool, since: str | None, json_mode: bool
) -> None:
    """What is not lesson-ready, by shape (a rule on a question type), with who fixes it."""
    if ctx.invoked_subcommand is not None:
        return
    report = refusals.report(language, new=new, since=since)
    if json_mode:
        click.echo(json.dumps(report, ensure_ascii=False))
        return
    click.echo(_refusals_text(report))


@refusals_group.command(cls=_EmitErrorsCommand, name="assign")
@click.argument("rule")
@click.argument("question_type")
@click.argument("bead")
@LANGUAGE
def refusals_assign(rule: str, question_type: str, bead: str, language: str) -> None:
    """Write BEAD as the issue of the shape RULE on QUESTION_TYPE ("-" for none)."""
    qtype = None if question_type == "-" else question_type
    path = refusals.assign(rule, qtype, bead, language)
    click.echo(f"{rule} / {question_type}: {bead}, in {path}")


@group.command(cls=_EmitErrorsCommand)
@click.argument("item_id")
@click.argument("reason", required=False, default="")
@LANGUAGE
@click.option("--clear", is_flag=True, help="Remove the flag instead.")
@click.option(
    "--by",
    default=refusals.DEFAULT_BY,
    show_default=True,
    type=click.Choice(refusals.ROLES),
    help="Who pulls it: a role, never a name.",
)
@click.option("--issue", default=None, help="The bead that tracks the fix, when there is one.")
def flag(item_id: str, reason: str, language: str, clear: bool, by: str, issue: str | None) -> None:
    """Pull ITEM_ID from lessons in --lang, saying why (REASON), or --clear the flag."""
    if clear:
        path = refusals.clear(item_id, language)
        click.echo(f"{item_id}: flag cleared in {path}")
        return
    path = refusals.flag(item_id, reason, language, by=by, issue=issue)
    click.echo(f"{item_id}: flagged in {path}; the next draft leaves it out")


def _readiness_text(report: dict[str, Any]) -> str:
    if "missing" in report:
        return f"{report['language']}: nothing to read ({report['missing']})"
    lines = [
        f"{report['language']}: {report['items']} items, {report['ready']} lesson-ready, "
        f"{report['waiting']['items']} waiting, {report['refused']['items']} refused, "
        f"{report['flagged']} flagged, {report['not_checked']} not checked"
    ]
    made = report["generated_at"] or "computed now"
    rules = f", rules {report['rules_version']}" if report["rules_version"] else ""
    lines.append(f"  from {report['source']} ({report['file']}, {made}{rules})")
    for title, block, key in (
        ("waiting, by reason", report["waiting"]["by_reason"], "reason"),
        ("refused, by cause", report["refused"]["by_cause"], "cause"),
    ):
        lines.append(f"  {title}:")
        for row in block:
            owner = f"  [{row['owner']}]" if row.get("owner") else ""
            lines.append(f"    {row['items']:>5}  {row[key]}{owner}  {row['issue'] or 'no bead'}")
        if not block:
            lines.append("    none")
    readmitted = report["readmitted"]
    if readmitted is None:
        lines.append(
            "  re-admitted since the previous run: unknown (computed from the files; the bank's "
            "`make ready` writes readiness.json)"
        )
    else:
        total = sum(r["items"] for r in readmitted)
        lines.append(f"  re-admitted since the previous run: {total}")
        lines += [f"    {r['items']:>5}  {r['cause']}" for r in readmitted]
    sets = report["sets"]
    if sets:
        lines.append(
            f"  sets: {sets.get('indexed')} indexed, {sets.get('skipped_no_ready')} skipped "
            "with no ready item"
        )
    return "\n".join(lines)


@group.command(cls=_EmitErrorsCommand, name="readiness")
@click.option(
    "--lang",
    "language",
    default=None,
    type=click.Choice(["pl", "en"]),
    help="One language; every language when left out.",
)
@click.option(
    "--from-files",
    "computed",
    is_flag=True,
    help="Count from the converted files even when readiness.json is there.",
)
@click.option("--json", "json_mode", is_flag=True, help="Print the reports.")
def readiness_verb(language: str | None, computed: bool, json_mode: bool) -> None:
    """How many items are lesson-ready, and why the rest are not, by cause, with each bead."""
    out = readiness.reports([language] if language else None, computed=computed)
    if json_mode:
        click.echo(json.dumps(out, ensure_ascii=False))
        return
    click.echo("\n\n".join(_readiness_text(r) for r in out["languages"]))
