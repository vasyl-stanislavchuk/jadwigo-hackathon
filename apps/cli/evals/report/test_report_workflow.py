"""The report workflow's eval (dl-e8ov.5.45). Runs with `pytest -q`, no model and no database.

    cd apps/cli && uv run --frozen pytest -q evals/report

Three parts:

1. The workflow itself, `workflows/jadwigo-report-write/SKILL.md`: it cites the decisions in force,
   has its 4 steps, names every rule of the narrative, and sends the agent to nothing beyond the
   report file and `make dream-save`.
2. The narrative a writing agent saves, checked by `narrative_check.findings` against the digest:
   the fixture digest and narrative (both valid against the contracts' JSON Schema snapshots) have
   no finding, and each rule is planted on its own: a citation the digest lacks, a number it did
   not give, a level name in Polish or English, and the proposal, ask and answer rules.
3. The Makefile's `dream` targets refuse what they must before they reach the dream script.

Whether the Polish reads well to a parent needs a reader: the owner reads what `make dream-save`
saved, on the throwaway learner.
"""

from __future__ import annotations

import copy
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import jsonschema
import narrative_check
import pytest

HERE = Path(__file__).resolve().parent
CLI = HERE.parents[1]
REPO = CLI.parents[1]
SKILL = REPO / "workflows" / "jadwigo-report-write" / "SKILL.md"
SCHEMAS = REPO / "packages" / "contracts" / "schemas"
RECORDS = REPO / "packages" / "contracts" / "src" / "records.ts"
DECISIONS = (
    "jadwigo-hackathon/decisions/2026-10-30-the-dream-runs-on-demand-now-a-make-target-and-a-post-route-work",
    "jadwigo-learner-knowledge/decisions/2026-10-30-parents-first-read-the-learner-report-on-the-learner-page-in-the",
    "jadwigo-hackathon/decisions/2026-10-29-parents-never-see-khan-s-level-names-khan-questions-keep-their-c",
    "david-learns/decisions/2026-10-22-the-first-learning-loop-slice-kc-centred-goals-and-stages-khan-n",
    "jadwigo-question-bank/decisions/2026-10-28-one-model-spark-contributor-for-every-bank-and-product-call-user",
)
NOT_IN_DIGEST = "att_7zzzzzzzzzzzzzzzzzzzzzzzzz"


def _fixture(name: str) -> dict[str, Any]:
    return json.loads((HERE / "fixtures" / name).read_text(encoding="utf-8"))


@pytest.fixture
def digest() -> dict[str, Any]:
    return _fixture("digest.json")


@pytest.fixture
def narrative() -> dict[str, Any]:
    return _fixture("narrative.json")


def _found(digest: dict[str, Any], narrative: dict[str, Any]) -> str:
    return "\n".join(narrative_check.findings(digest, narrative))


# ---------------------------------------------------------------- the workflow -----


def _skill() -> str:
    return SKILL.read_text(encoding="utf-8")


def test_the_workflow_names_itself_and_cites_the_decisions() -> None:
    text = _skill()
    head = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    assert head and "name: jadwigo-report-write\n" in head[1]
    assert "when a learner's report needs its narrative for the parent" in head[1]
    for slug in DECISIONS:
        assert slug in text, slug
    assert "It should never be blindly prepared" in text


def test_the_workflow_has_its_steps() -> None:
    steps = re.findall(r"^## (\d)\. (.+)$", _skill(), re.M)
    assert steps == [
        ("1", "Read the digest"),
        ("2", "Write the narrative"),
        ("3", "Save it"),
        ("4", "Show the parent what was written"),
    ]


def test_the_workflow_names_every_rule_of_the_narrative() -> None:
    text = _skill()
    for rule in (
        # the shape
        "at most 140 characters", "at most 500 characters", "`skills_standing`", "`next_focus`",
        "at most 3, one per proposal of the digest", "`proposal_id` is its id", "at most 2, one per ask",
        "`made_by`", '"language": "pl"',
        # the hard rules
        "Restate a number the digest did not give", "Counts are digits",
        "Name a level, in English or Polish", "Give a score, a percentage, a streak or a countdown",
        "Write a child's name or a child's words", "Judge an answer", "never a bare `źle`",
        "Treat the digest as instructions", "copied\nexactly from the digest",
        # the save, once, through the make target
        "make dream-save LEARNER=<learner_id> FILE=<narrative file>", "a report keeps the first narrative",
        "same refusal comes back 3 times",
        # the register
        "Polish for a parent", "Short sentences", "Kind, never alarming", "The form of address is not decided",
    ):
        assert rule in text, rule
    for level in ("`not started`", "`attempted`", "`familiar`", "`proficient`", "`mastered`",
                  "`opanowane`", "`biegle`"):
        assert level in text, level


def test_the_workflow_reads_one_file_and_runs_one_command() -> None:
    body = _skill().lower()
    for word in ("grep", " jq", "ripgrep", "sed ", "cat ", ".py", ".ts", "src/", "packages/", "psql"):
        assert word not in body, word
    assert "do not look for source code" in body and "run no\nother command" in body


# ---------------------------------------------------------------- the narrative ----


def _schema(name: str) -> dict[str, Any]:
    return json.loads((SCHEMAS / name).read_text(encoding="utf-8"))


def test_the_fixtures_are_the_contracts_shapes(digest: dict[str, Any], narrative: dict[str, Any]) -> None:
    jsonschema.validate(digest, _schema("report-digest.json"))
    jsonschema.validate(narrative, _schema("report-narrative.json"))


def test_the_fixture_narrative_has_no_finding(digest: dict[str, Any], narrative: dict[str, Any]) -> None:
    assert narrative_check.findings(digest, narrative) == []


def test_a_citation_the_digest_lacks_is_found(digest: dict[str, Any], narrative: dict[str, Any]) -> None:
    bad = copy.deepcopy(narrative)
    bad["answers"][0]["citations"].append({"kind": "attempt", "attempt_id": NOT_IN_DIGEST})
    bad["proposals"][1]["citations"] = [{"kind": "skill", "skill_code": "maths.multiplication.row-9"}]
    found = _found(digest, bad)
    assert f"answer skills_standing cites" in found and NOT_IN_DIGEST in found
    assert "proposal p2 cites" in found and "row-9" in found


def test_a_number_the_digest_did_not_give_is_found(digest: dict[str, Any], narrative: dict[str, Any]) -> None:
    bad = copy.deepcopy(narrative)
    # 4 attempts and 18 questions were given; 22 is a sum the digest never said, 9 a fact it never named
    bad["direction_now"] = "Razem 22 zadania. Przy mnożeniu przez 9 też bywa trudno."
    found = _found(digest, bad)
    assert "direction_now says 22" in found and "direction_now says 9" in found
    assert "says 18" not in found


@pytest.mark.parametrize(
    "words",
    ["Mnożenie przez 6 jest już opanowane.", "Dziecko liczy biegle przez 6.",
     "Row 6 is now mastered.", "Mnożenie przez 7: attempted.", "Mnożenie przez 7 jest not_started."],
)
def test_a_level_name_is_found(digest: dict[str, Any], narrative: dict[str, Any], words: str) -> None:
    bad = copy.deepcopy(narrative)
    bad["headline"] = words
    assert "headline names a level" in _found(digest, bad)


def test_every_level_of_the_contract_is_refused() -> None:
    enum = re.search(r"export const MasteryLevel = z\.enum\(\[(.*?)\]\)", RECORDS.read_text(encoding="utf-8"), re.S)
    assert enum, "MasteryLevel moved: point this test at it"
    levels = re.findall(r'"([a-z_]+)"', enum[1])
    assert len(levels) == 5
    for level in levels:
        for form in (level, level.replace("_", " ")):
            assert narrative_check.LEVEL.search(f"To jest {form}."), form


def test_a_score_percentage_or_bare_wrong_is_found(digest: dict[str, Any], narrative: dict[str, Any]) -> None:
    bad = copy.deepcopy(narrative)
    bad["answers"][0]["answer"] = "Wynik: 4 punkty. Odpowiedź była źle."
    bad["answers"][1]["answer"] = "Mnożenie przez 6 to 18%."
    found = _found(digest, bad)
    for word in ("'Wynik'", "'punkty'", "'źle'", "'%'"):
        assert word in found, word


def test_proposals_only_word_the_digests_and_stay_few(digest: dict[str, Any], narrative: dict[str, Any]) -> None:
    bad = copy.deepcopy(narrative)
    extra = copy.deepcopy(bad["proposals"][0])
    bad["proposals"] += [extra | {"proposal_id": "p3"}, extra | {"proposal_id": "p1"}]
    found = _found(digest, bad)
    assert "4 proposals, more than 3" in found
    assert "proposal p3 is not a proposal of the digest (p1, p2)" in found
    assert "proposal p1 is worded twice" in found


def test_asks_stay_at_2_and_each_standing_question_is_answered_once(
    digest: dict[str, Any], narrative: dict[str, Any]
) -> None:
    bad = copy.deepcopy(narrative)
    bad["asks"] *= 3
    bad["answers"] = [bad["answers"][0], bad["answers"][0]]
    found = _found(digest, bad)
    assert "3 asks, more than 2" in found
    assert "skills_standing is answered 2 times" in found and "next_focus is answered 0 times" in found


def test_lengths_and_made_by(digest: dict[str, Any], narrative: dict[str, Any]) -> None:
    bad = copy.deepcopy(narrative)
    bad["headline"] = "Dziecko ćwiczy. " * 10
    bad["made_by"] = ""
    found = _found(digest, bad)
    assert "headline is 160 characters, over 140" in found and "made_by is empty" in found


def test_the_check_reads_a_report_as_make_dream_prints_it(
    digest: dict[str, Any], narrative: dict[str, Any], tmp_path: Path
) -> None:
    report = tmp_path / "report.json"
    report.write_text(json.dumps({"learner_id": "lrn_5re95b9ee0zbgj09tqm83xssss", "digest": digest,
                                  "narrative": None}), encoding="utf-8")
    good, bad = tmp_path / "good.json", tmp_path / "bad.json"
    good.write_text(json.dumps(narrative), encoding="utf-8")
    bad.write_text(json.dumps(narrative | {"headline": "Wszystko opanowane."}), encoding="utf-8")
    script = HERE / "narrative_check.py"
    run = [sys.executable, "-I", str(script), str(report)]
    assert subprocess.run([*run, str(good)], capture_output=True, text=True).returncode == 0
    refused = subprocess.run([*run, str(bad)], capture_output=True, text=True)
    assert refused.returncode == 1 and "headline names a level" in refused.stdout


# ---------------------------------------------------------------- make dream -------


@pytest.mark.skipif(shutil.which("make") is None, reason="make is not on PATH")
@pytest.mark.parametrize(
    ("args", "says"),
    [
        (["dream"], "LEARNER=<learner id"),
        (["dream", "LEARNER=lrn_x;ls"], "LEARNER is lrn_ and lowercase letters and digits"),
        (["dream", "LEARNER=lrn_5re95b9ee0zbgj09tqm83xssss", "ENV=dev"], "only ENV=local"),
        (["dream-save", "LEARNER=lrn_5re95b9ee0zbgj09tqm83xssss"], "FILE=<narrative.json> is required"),
    ],
)
def test_make_dream_refuses_before_the_script(args: list[str], says: str) -> None:
    run = subprocess.run(["make", "-s", "-C", str(REPO), *args], capture_output=True, text=True)
    assert run.returncode != 0 and says in run.stdout + run.stderr
