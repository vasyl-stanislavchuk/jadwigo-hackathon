"""`jw doctor`: the 5 checks of `jw.doctor`, printed with a fix under each line that is not ok
(dl-a38n.42). Exits 1 when a check fails, so a script can stop on it."""

from __future__ import annotations

import json

import click

from jw import doctor

_MARK = {doctor.OK: "ok  ", doctor.WARN: "warn", doctor.FAIL: "FAIL"}


@click.command()
@click.option(
    "--language",
    default=None,
    type=click.Choice(["pl", "en"]),
    help="Check one language; without it, pl and en each against its own converted file.",
)
@click.option("--json", "json_mode", is_flag=True, help="Print the result as JSON.")
def command(language: str | None, json_mode: bool) -> None:
    """Check this machine: settings, ready ids, stamps, the bank revision, the local services."""
    result = doctor.run(language)
    if json_mode:
        click.echo(json.dumps(result))
    else:
        for check in result["checks"]:
            click.echo(f"{check['n']}. {check['name']}: {check['status']}")
            for line in check["lines"]:
                click.echo(f"   {_MARK[line['status']]} {line['name']}: {line['detail']}")
                if line["status"] != doctor.OK and line["fix"]:
                    click.echo(f"        fix: {line['fix']}")
        click.echo(f"jw doctor: {result['status']}")
    raise SystemExit(1 if result["status"] == doctor.FAIL else 0)
