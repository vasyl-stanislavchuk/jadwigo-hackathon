"""jw, the jadwigo CLI. Commands are `jw <record> <verb>` (apps/cli/AGENTS.md)."""

import click

from jw import __version__
from jw.commands import doctor, lesson, mcp, question


@click.group()
@click.version_option(__version__, prog_name="jw")
def main() -> None:
    """jw: lessons, questions and the local MCP server for jadwigo."""


main.add_command(question.group, name="question")
main.add_command(mcp.group, name="mcp")
main.add_command(lesson.group, name="lesson")
main.add_command(doctor.command, name="doctor")
