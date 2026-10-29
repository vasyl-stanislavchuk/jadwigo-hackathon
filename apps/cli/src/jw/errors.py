"""Typed CLI errors with hints, and the envelope a verb prints when one is raised.

Moved from david-learns src/dl/errors.py (DlError and emit), trimmed to what the question verbs,
the MCP server and the model client use, and printed with plain Click instead of rich.
"""

from __future__ import annotations

import json
from typing import Any, NoReturn

import click


class JwError(Exception):
    """Base class for every user-facing error jw raises."""

    default_hint: str = ""

    def __init__(self, message: str, *, hint: str | None = None) -> None:
        super().__init__(message)
        self.hint = hint if hint is not None else self.default_hint
        # Additive top-level keys on the error envelope; empty for every error jw has today.
        self.extra: dict[str, Any] = {}


def print_error(error: JwError) -> None:
    click.echo(f"error: {error}", err=True)
    if error.hint:
        click.echo(f"hint: {error.hint}", err=True)


def emit(
    payload: dict[str, Any] | None = None,
    error: JwError | None = None,
    json_mode: bool = False,
) -> NoReturn:
    """Print the envelope and exit: 0 with a payload, 1 with an error."""
    if error is not None:
        if json_mode:
            click.echo(
                json.dumps(
                    {
                        "ok": False,
                        "error": {
                            "type": type(error).__name__,
                            "message": str(error),
                            "hint": error.hint,
                        },
                        **error.extra,
                    }
                )
            )
        else:
            print_error(error)
        raise SystemExit(1)
    if payload is None:
        raise TypeError("emit needs a payload or an error")
    if json_mode:
        click.echo(json.dumps({"ok": True, **payload}))
    else:
        click.echo(json.dumps(payload, indent=2))
    raise SystemExit(0)
