"""The happy-path smoke: the whole path from the bank to a child's screen holds (dl-a38n.32.13).

For 3 fixed Polish needs it runs `lesson_draft`, asserts that every drawn step's `based_on` item
is lesson-ready in the converted file (status `plays` with `checked_at`, and no flag in the
refusals file) and that the copy plays as copied, writes plain words for what `you_write` lists,
runs `lesson_check`, and imports the lesson file into the in-memory store (`InMemoryStore` and
`importLessonFile`, run with bun in packages/lesson-import). It prints one line per need and exits
1 on any miss (decisions dl-kaxj and dl-be2l).

    uv run python scripts/smoke_ready.py                 # the planted fixture, a fake bank
    uv run python scripts/smoke_ready.py --fixture DIR   # another fixture laid out the same way
    uv run python scripts/smoke_ready.py --live          # the bank and files jw's settings name

`--fixture` (the default, tests/fixtures/ready) copies the fixture into a temporary bank
checkout, serves its envelope.json as the bank's answer to every need, and points
JADWIGO_BANK_DIR and JW_KHAN_CONVERTED at the copy. `--live` takes the settings as they are: the
nightly run, after the stamp, against the stamped converted file and the bank. It needs bun and a
jadwigo checkout (JADWIGO_REPO_DIR, else this one). It is never part of `make check`: it is not a
test, and pytest does not collect scripts/.
"""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
CLI = HERE.parent
FIXTURE = CLI / "tests" / "fixtures" / "ready"
sys.path[:0] = [str(CLI / "src"), str(CLI / "tests")]

from jw import items, lesson, settings_keys  # noqa: E402
from jw.errors import JwError  # noqa: E402

# (request, grade, topic): Polish, fixed, and naming nobody.
NEEDS = (
    ("6 zadań z mnożenia, klasa 3", "3", "mnożenie"),
    ("zadania z dodawania do 100, klasa 2", "2", "dodawanie do 100"),
    ("zadania z liczb parzystych, klasa 3", "3", "liczby parzyste"),
)
TODAY = dt.date(2026, 10, 30)  # the lesson file's id carries the day; any fixed day will do

# Plain words for what you_write lists, the same for every step: short and kind.
LOOK = {"text": "Przeczytaj zadanie jeszcze raz, powoli."}
BOOST = {"text": "Spróbuj krok po kroku. Dasz radę."}
WORKED = ["Zobacz, jak to policzyć krok po kroku."]
MISTAKE = {"text": "Prawie! Sprawdź jeszcze raz."}

IMPORT_TS = """
import { readFileSync } from "node:fs";
import { InMemoryStore } from "@jadwigo/store";
import { DRAFTS_POD, importLessonFile } from "./src/index.ts";
const raw = JSON.parse(readFileSync(process.argv[1], "utf8"));
const store = new InMemoryStore({ now: () => new Date("2026-10-30T09:00:00Z") });
const { lesson, version, assignment } = await importLessonFile(store, raw, DRAFTS_POD);
const answer = { lesson_id: lesson.id, version: version.version, play: assignment.id };
console.log(JSON.stringify(answer));
"""


class Miss(Exception):
    """One need's path broke; the message says where."""


@contextmanager
def _fixture(source: Path) -> Iterator[None]:
    """The fixture copied into a temporary bank checkout, and a fake bank answering with it."""
    import fake_bank

    envelope = json.loads((source / "envelope.json").read_text(encoding="utf-8"))

    class FixtureBank(fake_bank.FakeBank):
        def answer(self, need: Any, query: dict[str, str]) -> dict[str, Any]:
            return {**copy.deepcopy(envelope), "need": need}

    with tempfile.TemporaryDirectory(prefix="jw-smoke-") as tmp:
        checkout = Path(tmp) / "bank"
        shutil.copytree(source, checkout)
        bank = FixtureBank().start()
        saved = dict(os.environ)
        for name in settings_keys.KEYS:
            os.environ.pop(name, None)
        os.environ.update(
            {
                settings_keys.JW_API_URL: bank.url,
                settings_keys.JW_BANK_ENV_FILE: str(Path(tmp) / "no-bank.env"),
                settings_keys.JADWIGO_BANK_DIR: str(checkout),
                settings_keys.JW_KHAN_CONVERTED: str(checkout / "converted-pl.json"),
                settings_keys.JADWIGO_DRAFTS_DIR: str(Path(tmp) / "drafts"),
            }
        )
        try:
            yield
        finally:
            bank.stop()
            os.environ.clear()
            os.environ.update(saved)


def _converted() -> dict[str, dict[str, Any]]:
    """The converted file's items by id, read here apart from jw's own gate."""
    raw = json.loads(items.converted_path().read_text(encoding="utf-8"))
    listed = raw["items"].values() if isinstance(raw["items"], dict) else raw["items"]
    return {str(i["id"]): i for i in listed}


def _ready(item_id: str, by_id: dict[str, dict[str, Any]], flagged: set[str]) -> str | None:
    """Why the item a step is based on is not lesson-ready, or None."""
    item = by_id.get(item_id)
    if item is None:
        return f"{item_id} is not in {items.converted_path()}"
    status = item.get("status") or {}
    if status.get("kind") != "plays" or not status.get("checked_at"):
        return f"{item_id} has status {status}"
    if item_id in flagged:
        return f"{item_id} is flagged"
    return None


def _words(stored: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Plain words for every step's you_write: the twin is the copy itself."""
    out: dict[str, dict[str, Any]] = {}
    for q in stored["questions"]:
        spec = q["question"]
        given: dict[str, Any] = {}
        for need in lesson._to_write(q):
            if need == "twin":
                given["twin"] = {
                    "say": q.get("say"),
                    "family": spec["family"],
                    "data": spec["data"],
                    "key": spec["key"],
                }
            elif need == "look":
                given["look"] = LOOK
            elif need == "boost":
                given["boost"] = BOOST
            elif need == "worked":
                given["worked"] = WORKED
            elif need == "boost_by_mistake":
                given["boost_by_mistake"] = {c: MISTAKE for c in q.get("mistake_classes") or []}
        out[q["step_id"]] = given
    return out


def _import(lesson_file: str) -> dict[str, Any]:
    """Import the lesson file into a fresh in-memory store, with bun in packages/lesson-import."""
    repo, _ = lesson.check_script()
    done = subprocess.run(
        ["bun", "-e", IMPORT_TS, lesson_file],
        cwd=repo / "packages" / "lesson-import",
        capture_output=True,
        text=True,
        timeout=lesson.CHECK_TIMEOUT_SECS,
        check=False,
    )
    if done.returncode != 0:
        raise Miss(f"the import failed: {(done.stderr or done.stdout).strip()[-300:]}")
    answer: dict[str, Any] = json.loads(done.stdout.strip().splitlines()[-1])
    return answer


def run_need(request: str, grade: str, topic: str) -> str:
    """One need, bank to store; the line to print. Raises Miss on a break."""
    try:
        view = lesson.draft(request, grade, names=[], topic=topic, today=TODAY)
    except JwError as exc:
        raise Miss(f"lesson_draft: {exc}") from exc
    stored = lesson.load_draft(view["draft_id"])
    if not stored["questions"]:
        left = "; ".join(f"{x['id']}: {x['reason']}" for x in view["left_out"][:3])
        raise Miss(f"lesson_draft drew nothing ({left or 'no left_out'})")
    by_id = _converted()
    flagged = {str(f.get("id")) for f in items.refusals("pl")["flags"]}
    for q in stored["questions"]:
        based_on = str(q["based_on"]["question"]).removeprefix("khan:")
        why = _ready(based_on, by_id, flagged)
        if why:
            raise Miss(f"{q['step_id']} is based on an item that is not lesson-ready: {why}")
    if view["plays_as_copied"] is not True:
        raise Miss(f"plays_as_copied is {view['plays_as_copied']}: {view['copy_errors'][:2]}")
    checked = lesson.check(view["draft_id"], _words(stored))
    if not checked["ok"]:
        errors = [f for f in checked["findings"] if f.get("level") == "error"][:2]
        raise Miss(f"lesson_check: {errors}")
    imported = _import(checked["lesson_file"])
    ids = ", ".join(str(q["item_id"]) for q in stored["questions"])
    return (
        f"{len(stored['questions'])} questions ({ids}), plays as copied, check ok, imported "
        f"{imported['lesson_id']} version {imported['version']}, play /play/{imported['play']}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    where = parser.add_mutually_exclusive_group()
    where.add_argument("--fixture", type=Path, default=FIXTURE, help="a fixture directory")
    where.add_argument("--live", action="store_true", help="the bank jw's settings name")
    args = parser.parse_args(argv)

    def run_all() -> int:
        misses = 0
        for request, grade, topic in NEEDS:
            items._read.cache_clear()
            try:
                line = run_need(request, grade, topic)
                print(f"ok    {topic} (grade {grade}): {line}", flush=True)
            except Miss as miss:
                misses += 1
                print(f"MISS  {topic} (grade {grade}): {miss}", flush=True)
        print(f"{len(NEEDS) - misses} of {len(NEEDS)} needs reached the store", flush=True)
        return 1 if misses else 0

    if args.live:
        return run_all()
    with _fixture(args.fixture.resolve()):
        return run_all()


if __name__ == "__main__":
    raise SystemExit(main())
