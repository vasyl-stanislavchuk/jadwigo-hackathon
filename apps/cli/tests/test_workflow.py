"""One workflow in every language (dl-5ssh.34.23): the language from the record, the parts of
workflows/_lang assembled, a run with missing parts stopped, and the output envelope checked."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import pytest
from click.testing import CliRunner

from jw import workflow
from jw.cli import main
from jw.languages import LANGUAGES

REPO = Path(__file__).resolve().parents[3]
WORKFLOWS = REPO / "workflows"
POLISH_GOAL = {"goal": {"id": "gl_test1", "lesson_language": "pl", "name": "Mnożenie"}}
ENGLISH_POD = {"pod": {"id": "pd_test1", "language": "en", "name": "home"}}


@pytest.fixture(autouse=True)
def _repo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JADWIGO_REPO_DIR", str(REPO))


def test_jw_speaks_the_languages_the_config_lists() -> None:
    config = (REPO / "packages" / "config" / "src" / "languages.ts").read_text(
        encoding="utf-8"
    )
    assert tuple(re.findall(r'^\s+code: "([a-z]+)",$', config, re.M)) == LANGUAGES


def test_no_verb_offers_ukrainian() -> None:
    runner = CliRunner()
    for args in (["lesson", "draft"], ["question", "search"], ["workflow", "parts"]):
        help_text = runner.invoke(main, [*args, "--help"]).output
        assert "uk" not in re.findall(r"\[([a-z|]+)\]", help_text)[0].split("|"), args


def test_the_language_comes_from_the_record() -> None:
    assert workflow.resolve("jadwigo-lesson-compose", POLISH_GOAL) == workflow.Resolved(
        "pl", "goal:gl_test1"
    )
    assert workflow.resolve("jadwigo-report-write", ENGLISH_POD) == workflow.Resolved(
        "en", "pod:pd_test1"
    )
    me = {"account": None, "pod": {"id": "pd_test2", "language": "pl"}, "learners": []}
    assert (
        workflow.resolve("jadwigo-report-write", me).language_source == "pod:pd_test2"
    )
    assert (
        workflow.resolve(
            "jadwigo-lesson-review", {"language": "en", "lines": []}
        ).language
        == "en"
    )


@pytest.mark.parametrize(
    ("name", "record"),
    [
        ("jadwigo-lesson-compose", {"goal": {"id": "gl_x", "lesson_language": "uk"}}),
        ("jadwigo-lesson-compose", {"goal": {"id": "gl_x"}}),
        ("jadwigo-report-write", {"pod": {"id": "pd_x", "language": "de"}}),
        ("jadwigo-question-translate", {"language": "pl"}),
    ],
)
def test_a_record_with_no_language_jw_speaks_is_refused(
    name: str, record: dict[str, object]
) -> None:
    with pytest.raises(workflow.WorkflowError):
        workflow.resolve(name, record)


def test_a_polish_lesson_and_an_english_report_run_from_the_same_files() -> None:
    compose = workflow.assemble(
        "jadwigo-lesson-compose",
        workflow.resolve("jadwigo-lesson-compose", POLISH_GOAL),
    )
    report = workflow.assemble(
        "jadwigo-report-write", workflow.resolve("jadwigo-report-write", ENGLISH_POD)
    )
    assert (
        compose.splitlines()[0]
        == "Write every line a person reads in Polish (`pl`, from goal:gl_test1)."
    )
    assert (
        report.splitlines()[0]
        == "Write every line a person reads in English (`en`, from pod:pd_test1)."
    )
    for prompt, name in (
        (compose, "jadwigo-lesson-compose"),
        (report, "jadwigo-report-write"),
    ):
        assert (WORKFLOWS / name / "SKILL.md").read_text(
            encoding="utf-8"
        ).strip() in prompt
    pl = WORKFLOWS / "_lang" / "pl"
    en = WORKFLOWS / "_lang" / "en"
    assert (pl / "checklist.md").read_text(encoding="utf-8").strip() in compose
    assert (en / "checklist.md").read_text(encoding="utf-8").strip() in report
    assert "**en-2 US English.**" not in compose and "**pl-9 Spelling" not in report


def _without(tmp_path: Path, language: str, *parts: str) -> Path:
    root = tmp_path / "workflows"
    shutil.copytree(WORKFLOWS, root, symlinks=True)
    for part in parts:
        target = root / "_lang" / language / part
        shutil.rmtree(target) if target.is_dir() else target.unlink()
    return root


def test_a_run_whose_language_lacks_its_parts_stops_naming_them(tmp_path: Path) -> None:
    root = _without(tmp_path, "en", "checklist.md", "examples")
    resolved = workflow.resolve("jadwigo-report-write", ENGLISH_POD)
    with pytest.raises(workflow.MissingParts) as raised:
        workflow.assemble("jadwigo-report-write", resolved, root)
    assert raised.value.missing == [
        "workflows/_lang/en/checklist.md",
        "workflows/_lang/en/examples/",
    ]
    assert workflow.assemble(
        "jadwigo-lesson-compose",
        workflow.resolve("jadwigo-lesson-compose", POLISH_GOAL),
        root,
    )


def test_the_verb_stops_with_the_missing_parts_in_its_envelope(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    shutil.copytree(
        _without(tmp_path, "en", "style.md"), repo / "workflows", symlinks=True
    )
    monkeypatch.setenv("JADWIGO_REPO_DIR", str(repo))
    record = tmp_path / "pod.json"
    record.write_text(json.dumps(ENGLISH_POD), encoding="utf-8")
    result = CliRunner().invoke(
        main,
        [
            "workflow",
            "parts",
            "jadwigo-report-write",
            "--record",
            str(record),
            "--json",
        ],
    )
    assert result.exit_code == 1
    envelope = json.loads(result.output)
    assert envelope["ok"] is False and envelope["error"]["type"] == "MissingParts"
    assert envelope["missing"] == ["workflows/_lang/en/style.md"]


def test_the_verb_prints_the_parts_of_the_records_language(tmp_path: Path) -> None:
    record = tmp_path / "goal.json"
    record.write_text(json.dumps(POLISH_GOAL), encoding="utf-8")
    result = CliRunner().invoke(
        main,
        [
            "workflow",
            "parts",
            "jadwigo-lesson-compose",
            "--record",
            str(record),
            "--json",
        ],
    )
    assert result.exit_code == 0, result.output
    found = json.loads(result.output)
    assert (found["language"], found["language_source"]) == ("pl", "goal:gl_test1")
    assert (
        sorted(found["parts"]) == ["checklist", "glossary", "style"]
        and found["examples"]
    )


def test_the_envelope_check_finds_a_line_in_another_language() -> None:
    narrative = {
        "language": "en",
        "headline": {"text": "Your child counted equal groups.", "language": "en"},
        "said": {"text": "dwa razy trzy", "language": "pl", "quote": True},
    }
    assert workflow.check_envelope(narrative, "en") == []
    narrative["headline"] = {"text": "Dziecko liczyło grupy.", "language": "pl"}
    assert workflow.check_envelope(narrative, "en") == [
        "$.headline is in 'pl', not 'en', and is not a marked quote"
    ]
    assert workflow.check_envelope({"language": "pl"}, "en") == [
        "the output's language is 'pl', not 'en'"
    ]
