"""jw bank pull (dl-a38n.43) with a fake git on PATH and a fake sync command: no network, no AWS,
no real bank checkout."""

from __future__ import annotations

import json
import os
import stat
import sys
from pathlib import Path

import pytest
from click.testing import CliRunner

from jw import settings_keys
from jw.cli import main
from jw.commands import bank

FAKE_GIT = """#!/bin/sh
# clone URL DIR | -C DIR rev-parse HEAD | -C DIR pull --ff-only
echo "$@" >> "$FAKE_LOG"
if [ "$1" = clone ]; then mkdir -p "$3/.git"; echo aaaaaaa1 > "$3/.git/sha"; exit 0; fi
if [ "$3" = rev-parse ]; then cat "$2/.git/sha"; exit 0; fi
if [ "$3" = pull ]; then
  if [ -n "$FAKE_PULL_FAILS" ]; then
    echo "fatal: Not possible to fast-forward, aborting." >&2; exit 128
  fi
  if [ -n "$FAKE_PULL_TO" ]; then echo "$FAKE_PULL_TO" > "$2/.git/sha"; fi
  exit 0
fi
exit 1
"""

FAKE_SYNC = """
import json, os, sys
from pathlib import Path
khan = Path(os.environ["JADWIGO_KHAN_DIR"])
khan.mkdir(parents=True, exist_ok=True)
Path(os.environ["FAKE_LOG"]).open("a").write(json.dumps({
    "argv": sys.argv[1:], "cwd": os.getcwd(), "bucket": os.environ.get("JADWIGO_KHAN_BUCKET"),
    "profile": os.environ.get("AWS_PROFILE")}) + "\\n")
(khan / "converted-pl.json").write_text('{"generated_by": "fake", "items": []}')
(khan / "readiness.json").write_text('{"rules_version": "sha256:r2"}')
"""


@pytest.fixture
def fakes(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    git = bin_dir / "git"
    git.write_text(FAKE_GIT)
    git.chmod(git.stat().st_mode | stat.S_IEXEC)
    sync = tmp_path / "fake_sync.py"
    sync.write_text(FAKE_SYNC)
    log = tmp_path / "log"
    monkeypatch.setenv("PATH", f"{bin_dir}{os.pathsep}{os.environ['PATH']}")
    monkeypatch.setenv("FAKE_LOG", str(log))
    monkeypatch.setenv("JADWIGO_KHAN_BUCKET", "test-bucket")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    monkeypatch.setenv("JADWIGO_KHAN_DIR", str(tmp_path / "khan"))
    monkeypatch.setattr(settings_keys, "DEFAULT_BANK_DIR", tmp_path / "share" / "bank")
    monkeypatch.setattr(settings_keys, "KHAN_SYNC_COMMAND", f"{sys.executable} {sync} down")
    return log


def _log(log: Path) -> list[str]:
    return log.read_text().splitlines()


def test_a_clean_machine_clones_the_bank_and_fills_the_khan_dir(
    fakes: Path, tmp_path: Path
) -> None:
    result = CliRunner().invoke(main, ["bank", "pull", "--json"])
    assert result.exit_code == 0, result.output
    out = json.loads(result.output)
    target = tmp_path / "share" / "bank"
    assert out["checkout"] == {"path": str(target), "action": "cloned", "to": "aaaaaaa1"}
    assert [f["name"] for f in out["converted"]["files"]] == ["converted-pl.json", "readiness.json"]
    assert {f["change"] for f in out["converted"]["files"]} == {"new"}
    lines = _log(fakes)
    assert lines[0] == f"clone {settings_keys.BANK_REPO} {target}"
    synced = json.loads(lines[-1])
    assert synced == {
        "argv": ["down", "--prefix", "khan/converted"],
        "cwd": str(target),
        "bucket": "test-bucket",
        "profile": "jadwigo",
    }
    assert (tmp_path / "khan" / "converted-pl.json").is_file()


def test_an_existing_checkout_pulls_fast_forward_and_says_what_moved(
    fakes: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    checkout = tmp_path / "mine"
    (checkout / ".git").mkdir(parents=True)
    (checkout / ".git" / "sha").write_text("1111111\n")
    monkeypatch.setenv("JADWIGO_BANK_DIR", str(checkout))
    monkeypatch.setenv("FAKE_PULL_TO", "2222222")
    CliRunner().invoke(main, ["bank", "pull"])
    result = CliRunner().invoke(main, ["bank", "pull"])
    assert f"bank checkout {checkout}: already at 2222222" in result.output
    assert (
        "converted-pl.json: unchanged" in result.output
        or "converted-pl.json: updated" in result.output
    )
    assert f"-C {checkout} pull --ff-only" in _log(fakes)


def test_a_pull_that_cannot_fast_forward_stops_with_git_s_words(
    fakes: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    checkout = tmp_path / "mine"
    (checkout / ".git").mkdir(parents=True)
    (checkout / ".git" / "sha").write_text("1111111\n")
    monkeypatch.setenv("JADWIGO_BANK_DIR", str(checkout))
    monkeypatch.setenv("FAKE_PULL_FAILS", "1")
    result = CliRunner().invoke(main, ["bank", "pull"])
    assert result.exit_code == 1
    assert "Not possible to fast-forward" in result.output
    assert not any(line.startswith("{") for line in _log(fakes))


def test_a_folder_that_is_not_a_checkout_is_refused(
    fakes: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "plain").mkdir()
    monkeypatch.setenv("JADWIGO_BANK_DIR", str(tmp_path / "plain"))
    result = CliRunner().invoke(main, ["bank", "pull"])
    assert result.exit_code == 1
    assert "is not a git checkout" in result.output


def test_the_bucket_comes_from_ssm_else_the_known_name(
    fakes: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("JADWIGO_KHAN_BUCKET")
    aws = tmp_path / "bin" / "aws"
    aws.write_text('#!/bin/sh\necho "$@" >> "$FAKE_LOG"\necho from-ssm\n')
    aws.chmod(aws.stat().st_mode | stat.S_IEXEC)
    assert bank.bucket() == ("from-ssm", "SSM /jadwigo/bank/content-bucket")
    assert "ssm get-parameter --name /jadwigo/bank/content-bucket" in _log(fakes)[-1]
    aws.write_text("#!/bin/sh\nexit 255\n")
    assert bank.bucket() == (bank.KNOWN_BUCKET, "the known name")


def test_env_example_names_the_default_jw_bank_pull_fills() -> None:
    example = (Path(__file__).parents[1] / ".env.example").read_text()
    line = next(x for x in example.splitlines() if x.startswith("JW_KHAN_CONVERTED="))
    assert "<JADWIGO_KHAN_DIR>/converted-pl.json" in line
    assert "jw bank pull" in line
