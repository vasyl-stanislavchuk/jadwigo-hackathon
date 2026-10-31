"""`jw bank pull`: bring this machine's bank to the bucket's current stamp (dl-a38n.43, wave-3 lead
decision 8: a clean machine works).

1. The bank checkout (`settings_keys.bank_dir()`: JADWIGO_BANK_DIR, else
   ~/.local/share/jadwigo/bank): `git pull --ff-only`, or a clone of BANK_REPO when it is not there.
2. The converted files: `KHAN_SYNC_COMMAND --prefix khan/converted` run in that checkout, which
   downloads the bucket's khan/converted/ into JADWIGO_KHAN_DIR (default ~/.cache/jadwigo-bank/khan)
   as converted-pl.json, converted.json and readiness.json (TOP_FILES in jadwigo-bank
   tools/khan/sync.py). The bucket is JADWIGO_KHAN_BUCKET, else SSM /jadwigo/bank/content-bucket,
   else its known name; AWS_PROFILE defaults to jadwigo.

It prints what changed: the checkout's commits and each converted file, new, updated or unchanged.
"""

from __future__ import annotations

import json
import os
import shlex
import subprocess
from pathlib import Path
from typing import Any

import click

from jw import settings_keys
from jw.errors import JwError, emit

BUCKET = "JADWIGO_KHAN_BUCKET"
BUCKET_PARAMETER = "/jadwigo/bank/content-bucket"
KNOWN_BUCKET = "jadwigo-content-843109108289"  # infra/terraform/modules/content/variables.tf
DEFAULT_PROFILE = "jadwigo"
REGION = "eu-central-1"
PREFIX = "khan/converted"
# What the converted prefix lands as in the Khan dir (jadwigo-bank tools/khan/sync.py TOP_FILES).
FILES = ("converted-pl.json", "converted.json", "converted-pl.refused.json", "readiness.json")


class PullFailed(JwError):
    """A step of `jw bank pull` failed; the message names the step and its own words."""


def _run(argv: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> str:
    try:
        done = subprocess.run(  # noqa: S603
            argv, cwd=cwd, env=env, capture_output=True, text=True, check=False
        )
    except FileNotFoundError as exc:
        raise PullFailed(f"{argv[0]} is not installed", hint=f"Install {argv[0]}.") from exc
    if done.returncode != 0:
        said = (done.stderr or done.stdout).strip().splitlines()
        raise PullFailed(
            f"`{' '.join(argv[:3])}` exited {done.returncode}: {said[-1] if said else 'no output'}",
            hint="Fix that, then run jw bank pull again.",
        )
    return done.stdout


def _head(checkout: Path) -> str:
    return _run(["git", "-C", str(checkout), "rev-parse", "HEAD"]).strip()


def checkout(target: Path) -> dict[str, Any]:
    """Pull the bank checkout fast-forward only, or clone it when it is not there."""
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        _run(["git", "clone", settings_keys.BANK_REPO, str(target)])
        return {"path": str(target), "action": "cloned", "to": _head(target)}
    if not (target / ".git").exists():
        raise PullFailed(
            f"{target} is not a git checkout",
            hint=f"Point JADWIGO_BANK_DIR at a jadwigo-bank checkout, or move {target} away.",
        )
    before = _head(target)
    _run(["git", "-C", str(target), "pull", "--ff-only"])
    after = _head(target)
    action = "unchanged" if before == after else "pulled"
    return {"path": str(target), "action": action, "from": before, "to": after}


def bucket() -> tuple[str, str]:
    """The content bucket and where its name came from."""
    named = os.environ.get(BUCKET, "").strip()
    if named:
        return named, BUCKET
    profile = os.environ.get("AWS_PROFILE") or DEFAULT_PROFILE
    try:
        value = _run(
            [
                "aws",
                "ssm",
                "get-parameter",
                "--name",
                BUCKET_PARAMETER,
                "--query",
                "Parameter.Value",
                "--output",
                "text",
                "--profile",
                profile,
                "--region",
                REGION,
            ]
        ).strip()
    except PullFailed:
        value = ""
    return (value, f"SSM {BUCKET_PARAMETER}") if value else (KNOWN_BUCKET, "the known name")


def _snapshot(khan: Path) -> dict[str, tuple[int, int] | None]:
    out: dict[str, tuple[int, int] | None] = {}
    for name in FILES:
        path = khan / name
        out[name] = (path.stat().st_size, path.stat().st_mtime_ns) if path.is_file() else None
    return out


def sync(bank: Path) -> dict[str, Any]:
    """Download the bucket's converted files into the Khan dir; report each file's change."""
    khan = settings_keys.khan_dir()
    name, source = bucket()
    env = {
        **os.environ,
        settings_keys.JADWIGO_KHAN_DIR: str(khan),
        BUCKET: name,
        "AWS_PROFILE": os.environ.get("AWS_PROFILE") or DEFAULT_PROFILE,
    }
    before = _snapshot(khan)
    _run([*shlex.split(settings_keys.KHAN_SYNC_COMMAND), "--prefix", PREFIX], cwd=bank, env=env)
    after = _snapshot(khan)
    files = []
    for file in FILES:
        if after[file] is None:
            continue
        change = (
            "new"
            if before[file] is None
            else "unchanged"
            if before[file] == after[file]
            else "updated"
        )
        files.append({"name": file, "bytes": after[file][0], "change": change})
    return {"khan_dir": str(khan), "bucket": name, "bucket_from": source, "files": files}


def pull() -> dict[str, Any]:
    target = settings_keys.bank_dir()
    repo = checkout(target)
    return {"checkout": repo, "converted": sync(target)}


@click.group()
def group() -> None:
    """The bank on this machine: its checkout and the converted items."""


@group.command(name="pull")
@click.option("--json", "json_mode", is_flag=True, help="Print the result as JSON.")
def pull_command(json_mode: bool) -> None:
    """Pull the bank checkout and download the bucket's converted files."""
    try:
        result = pull()
    except JwError as exc:
        emit(error=exc, json_mode=json_mode)
    if json_mode:
        click.echo(json.dumps({"ok": True, **result}))
        return
    repo = result["checkout"]
    moved = {
        "cloned": f"cloned at {repo['to'][:7]}",
        "pulled": f"pulled {repo.get('from', '')[:7]}..{repo['to'][:7]}",
        "unchanged": f"already at {repo['to'][:7]}",
    }[repo["action"]]
    click.echo(f"bank checkout {repo['path']}: {moved}")
    converted = result["converted"]
    click.echo(
        f"converted files in {converted['khan_dir']} (bucket from {converted['bucket_from']}):"
    )
    for file in converted["files"]:
        click.echo(f"  {file['name']}: {file['change']}, {file['bytes']:,} bytes")
    if not converted["files"]:
        click.echo("  none: the bucket has no khan/converted files")
