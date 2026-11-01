"""jw workflow verbs: a workflow's language from its record, and its parts in that language
(dl-5ssh.34.23). The workflow_parts MCP tool calls the same function, so they cannot drift."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import click

from jw import workflow
from jw.commands.question import _EmitErrorsCommand
from jw.languages import LANGUAGES


def parts_for(
    name: str, record: dict[str, Any] | None = None, language: str | None = None
) -> dict[str, Any]:
    """The record's language and its parts; a bare `language` is the caller's own pick."""
    if record is not None:
        resolved = workflow.resolve(name, record)
    elif language is not None:
        resolved = workflow.Resolved(language, "argument")
        workflow.resolve(
            "jadwigo-lesson-review", {"language": language}
        )  # refuses an unknown code
    else:
        raise workflow.WorkflowError(
            "give the record the workflow writes to, or a language"
        )
    return workflow.parts(name, resolved)


@click.group()
def group() -> None:
    """Workflows: the language from the record, and the parts in it."""


def _record(path: Path | None) -> dict[str, Any] | None:
    return None if path is None else json.loads(path.read_text(encoding="utf-8"))


@group.command(cls=_EmitErrorsCommand)
@click.argument("name")
@click.option(
    "--record",
    "record_path",
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    help="The record's JSON: a goal, a pod (or Me), or a review batch.",
)
@click.option(
    "--language", type=click.Choice(LANGUAGES), help="A language picked by hand."
)
@click.option("--json", "json_mode", is_flag=True, help="Print the parts.")
def parts(
    name: str, record_path: Path | None, language: str | None, json_mode: bool
) -> None:
    """The language NAME runs in and its parts, or the parts that are missing."""
    found = parts_for(name, _record(record_path), language)
    if json_mode:
        click.echo(json.dumps(found, ensure_ascii=False))
        return
    click.echo(f"{name}: {found['language']} from {found['language_source']}")
    for key in (*found["parts"], *found["examples"]):
        click.echo(f"  {key}")


@group.command(cls=_EmitErrorsCommand)
@click.argument("name")
@click.option(
    "--record",
    "record_path",
    required=True,
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
)
def assemble(name: str, record_path: Path) -> None:
    """Print NAME's prompt in its record's language: the language, the workflow, _shared, _lang."""
    record = _record(record_path) or {}
    click.echo(workflow.assemble(name, workflow.resolve(name, record)), nl=False)
