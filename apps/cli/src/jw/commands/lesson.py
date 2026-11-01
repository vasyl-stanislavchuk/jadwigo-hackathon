"""jw lesson verbs: draft a lesson from a request, check it with the agent's words (dl-e8ov.5.38.4).

Each `--json` verb prints what one function in `jw.lesson` returns, and the lesson_draft and
lesson_check MCP tools call the same functions, so a verb and its tool cannot drift apart.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import click

from jw import lesson, lesson_edit, lesson_publish
from jw.commands.question import _EmitErrorsCommand
from jw.draw import DRAW_RULES
from jw.errors import JwError
from jw.languages import LANGUAGES


@click.group()
def group() -> None:
    """Lessons: draft, check, edit, show, publish, timing."""


@group.command(cls=_EmitErrorsCommand)
@click.argument("request")
@click.option("--grade", required=True, help="The bare grade number, e.g. 3.")
@click.option(
    "--topic",
    required=True,
    help="What the lesson is about in a few words (mnożenie): the bank searches these.",
)
@click.option("--language", default="pl", show_default=True, type=click.Choice(LANGUAGES))
@click.option("--kind", default="practice", show_default=True, type=click.Choice(list(DRAW_RULES)))
@click.option("--count", default=None, type=click.IntRange(min=1), help="Questions to draw.")
@click.option("--skill", "skills", multiple=True, help="Skill id (repeatable).")
@click.option(
    "--set",
    "sets",
    multiple=True,
    help="A set id to draw from, with no search (repeatable); the same ids for pl and en.",
)
@click.option(
    "--question-type",
    "question_types",
    multiple=True,
    help="Keep only items of this type (repeatable): slots.fill_gaps, group.*, choose.",
)
@click.option(
    "--name",
    "names",
    multiple=True,
    help="A name the family uses in REQUEST (repeatable); replaced before anything leaves.",
)
@click.option("--no-names", is_flag=True, help="Say the request names nobody.")
@click.option("--verbose", is_flag=True, help="Each question and left_out whole.")
@click.option("--json", "json_mode", is_flag=True, help="Print the draft.")
def draft(
    request: str,
    grade: str,
    topic: str,
    language: str,
    kind: str,
    count: int | None,
    skills: tuple[str, ...],
    sets: tuple[str, ...],
    question_types: tuple[str, ...],
    names: tuple[str, ...],
    no_names: bool,
    verbose: bool,
    json_mode: bool,
) -> None:
    """Draft a lesson for REQUEST: drawn questions copied whole from the bank, kept by draft id
    and written to JADWIGO_DRAFTS_DIR as <draft_id>.json."""
    if not names and not no_names:
        raise click.UsageError("pass every name the family uses with --name, or --no-names")
    result = lesson.draft(
        request, grade, language, kind, count, skills, names=list(names), topic=topic,
        sets=list(sets), question_types=list(question_types), verbose=verbose,
    )
    if json_mode:
        click.echo(json.dumps(result, ensure_ascii=False))
        return
    lines = [f"{result['draft_id']}  {result['title']}  ({result['kind']}, rule not settled)"]
    lines += [
        f"  {q['step_id']}  {q['item_id']}  {lesson.tex_plain(q['say'])}  "
        f"(write: {', '.join(q['you_write']) or 'nothing'})"
        for q in result["questions"]
    ]
    left = result["left_out"]
    if verbose:
        lines += [f"  left out {item['id']}: {item['reason']}" for item in left]
    else:
        lines += [f"  left out {c['count']}: {c['cause']} ({', '.join(c['examples'])})"
                  for c in left["by_cause"]]
    if result.get("setup_warning"):
        lines.append(f"setup: {result['setup_warning']}")
    lines.append(f"draft file: {result['draft_path']}")
    click.echo("\n".join(lines))


@group.command(cls=_EmitErrorsCommand)
@click.argument("draft_id")
@click.argument("words_file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--title", default=None, help="The lesson's title, in place of the request.")
@click.option("--reasoning", default=None, help="Why the lesson is what it is, for the parent.")
@click.option(
    "--name",
    "names",
    multiple=True,
    help="A name the family uses (repeatable); replaced in every word, --title and --reasoning.",
)
@click.option("--no-names", is_flag=True, help="Say the family's words name nobody.")
@click.option("--full", is_flag=True, help="The card with each rung and why it was drawn.")
@click.option("--verbose", is_flag=True, help="Every finding, warnings one by one.")
@click.option("--json", "json_mode", is_flag=True, help="Print the check's answer.")
def check(
    draft_id: str,
    words_file: Path,
    title: str | None,
    reasoning: str | None,
    names: tuple[str, ...],
    no_names: bool,
    full: bool,
    verbose: bool,
    json_mode: bool,
) -> None:
    """Check the draft DRAFT_ID with WORDS_FILE, a JSON object of each step's words by step id
    (the lesson_check tool's `help`), and print its card. The draft file is rewritten with the
    words and its check written beside it, whatever the check says."""
    if not names and not no_names:
        raise click.UsageError("pass every name the family uses with --name, or --no-names")
    try:
        words: Any = json.loads(words_file.read_text(encoding="utf-8"))
    except ValueError as exc:
        raise JwError(
            f"{words_file} is not JSON: {exc}", hint='Pass {"q1": {"twin": ...}, ...} as JSON.'
        ) from exc
    result = lesson.check(
        draft_id, words, title, reasoning, names=list(names), full=full, verbose=verbose
    )
    if json_mode:
        click.echo(json.dumps(result, ensure_ascii=False))
    elif result["ok"]:
        click.echo(lesson.card_text(result["card"]))
        click.echo(f"lesson file: {result['lesson_file']}")
    else:
        for finding in result["findings"]:
            click.echo(f"step {finding['step_id']} ({finding['rule']}): {finding['text']}")
        click.echo(f"draft file: {result['draft_path']}")
    if not result["ok"]:
        raise SystemExit(1)


@group.command(cls=_EmitErrorsCommand)
@click.argument("draft_id")
@click.argument("step_id")
@click.argument("patch_file", type=click.Path(exists=True, dir_okay=False, path_type=Path))
@click.option("--why", default=None, help="Why a copied part changes (the parent's ask).")
@click.option(
    "--change",
    default=lesson_edit.CHANGE_DEFAULT,
    show_default=True,
    type=click.Choice(list(lesson.CHANGE_KINDS)),
    help="The kind of change to the bank's copy.",
)
@click.option(
    "--name",
    "names",
    multiple=True,
    help="A name the family uses (repeatable); replaced in the patch's words and --why.",
)
@click.option("--no-names", is_flag=True, help="Say the family's words name nobody.")
@click.option("--json", "json_mode", is_flag=True, help="Print the step's answer.")
def edit(
    draft_id: str,
    step_id: str,
    patch_file: Path,
    why: str | None,
    change: str,
    names: tuple[str, ...],
    no_names: bool,
    json_mode: bool,
) -> None:
    """Change step STEP_ID of the draft DRAFT_ID by PATCH_FILE, a JSON merge patch on the step
    (the lesson_edit tool's `patch`), check the lesson, and print that step's findings."""
    if not names and not no_names:
        raise click.UsageError("pass every name the family uses with --name, or --no-names")
    try:
        patch: Any = json.loads(patch_file.read_text(encoding="utf-8"))
    except ValueError as exc:
        raise JwError(
            f"{patch_file} is not JSON: {exc}",
            hint='Pass {"question": {"help": {"boost": {"text": ...}}}} as JSON.',
        ) from exc
    result = lesson_edit.edit(draft_id, step_id, patch, why, change, names=list(names))
    if json_mode:
        click.echo(json.dumps(result, ensure_ascii=False))
    else:
        click.echo(f"{step_id}: {'ok' if result['ok'] else 'not ok'}  {result['card']['prompt']}")
        for finding in result["findings"]:
            click.echo(f"  {finding['level']} ({finding['rule']}): {finding['text']}")
        click.echo(f"draft file: {result['draft_path']}")
    if not result["ok"]:
        raise SystemExit(1)


@group.command(cls=_EmitErrorsCommand)
@click.argument("draft_id")
@click.argument("step_id", required=False)
def show(draft_id: str, step_id: str | None) -> None:
    """Print step STEP_ID of the draft DRAFT_ID, or every step, as JSON (the lesson_show tool)."""
    click.echo(json.dumps(lesson_edit.show(draft_id, step_id), ensure_ascii=False))


@group.command(cls=_EmitErrorsCommand)
@click.argument("draft_id")
@click.option(
    "--target",
    default="local",
    show_default=True,
    type=click.Choice(list(lesson_publish.TARGETS)),
    help="Only local publishes; dev names the owner's command, prod refuses.",
)
@click.option("--json", "json_mode", is_flag=True, help="Print the publish record.")
def publish(draft_id: str, target: str, json_mode: bool) -> None:
    """Publish the checked draft DRAFT_ID into the local database `make dev` serves, check that it
    plays, and print its play URL (the lesson_publish tool)."""
    result = lesson_publish.publish(draft_id, target)
    if json_mode:
        click.echo(json.dumps(result, ensure_ascii=False))
    else:
        click.echo(f"{'ok' if result['ok'] else 'not verified'}: {result['play_url']}")
        for name, check in result["verified"].items():
            click.echo(f"  {'ok ' if check['ok'] else 'NO '} {name}: {check['detail']}")
    if not result["ok"]:
        raise SystemExit(1)


@group.command(cls=_EmitErrorsCommand)
@click.argument("draft_id")
@click.option("--json", "json_mode", is_flag=True, help="Print the split as JSON.")
def timing(draft_id: str, json_mode: bool) -> None:
    """Print how long each tool call on DRAFT_ID took, and the model's time between them."""
    split = lesson.timing(draft_id)
    click.echo(json.dumps(split, ensure_ascii=False) if json_mode else lesson.timing_text(split))
