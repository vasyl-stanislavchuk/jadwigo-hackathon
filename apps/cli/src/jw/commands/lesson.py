"""jw lesson verbs: draft a lesson from a request, check a filled draft (dl-e8ov.5.38.4).

Each `--json` verb prints what one function in `jw.lesson` returns, and the lesson_draft and
lesson_check MCP tools call the same functions, so a verb and its tool cannot drift apart.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import click

from jw import lesson
from jw.commands.question import _EmitErrorsCommand
from jw.draw import DRAW_RULES
from jw.errors import JwError


@click.group()
def group() -> None:
    """Lessons: draft, check."""


@group.command(cls=_EmitErrorsCommand)
@click.argument("request")
@click.option("--grade", required=True, help="The bare grade number, e.g. 3.")
@click.option("--language", default="pl", show_default=True, type=click.Choice(["pl", "en", "uk"]))
@click.option("--kind", default="practice", show_default=True, type=click.Choice(list(DRAW_RULES)))
@click.option("--count", default=None, type=click.IntRange(min=1), help="Questions to draw.")
@click.option("--skill", "skills", multiple=True, help="Skill id (repeatable).")
@click.option("--json", "json_mode", is_flag=True, help="Print the draft.")
def draft(
    request: str,
    grade: str,
    language: str,
    kind: str,
    count: int | None,
    skills: tuple[str, ...],
    json_mode: bool,
) -> None:
    """Draft a lesson for REQUEST: drawn questions with keys and credit, help left to write."""
    result = lesson.draft(request, grade, language, kind, count, skills)
    if json_mode:
        click.echo(json.dumps(result, ensure_ascii=False))
        return
    lines = [f"{result['lesson_file_skeleton']['id']}  ({result['kind']}, rule not settled)"]
    lines += [f"  {q['step_id']}  {q['item_id']}  {q['say']}" for q in result["questions"]]
    lines += [f"  left out {left['id']}: {left['reason']}" for left in result["left_out"]]
    click.echo("\n".join(lines))


@group.command(cls=_EmitErrorsCommand)
@click.argument("draft_file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--json", "json_mode", is_flag=True, help="Print the check's answer.")
def check(draft_file: Path, json_mode: bool) -> None:
    """Check DRAFT_FILE, a draft with every question's help written, and print its card."""
    try:
        filled: Any = json.loads(draft_file.read_text(encoding="utf-8"))
    except ValueError as exc:
        raise JwError(f"{draft_file} is not JSON: {exc}", hint="Pass the draft as JSON.") from exc
    result = lesson.check(filled)
    if json_mode:
        click.echo(json.dumps(result, ensure_ascii=False))
    elif result["ok"]:
        click.echo(lesson.card_text(result["card"]))
        click.echo(f"lesson file: {result['lesson_file']}\nplay: {result['play_path']}")
    else:
        for error in result["errors"]:
            click.echo(f"step {error['step_id']}: {error['message']}")
    if not result["ok"]:
        raise SystemExit(1)
