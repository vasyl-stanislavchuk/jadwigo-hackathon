"""jw, the jadwigo CLI. The commands arrive with dl-5ssh.34.7."""

import click

from jw import __version__


@click.group()
@click.version_option(__version__, prog_name="jw")
def main() -> None:
    """jw: lessons, questions and the local MCP server for jadwigo."""
