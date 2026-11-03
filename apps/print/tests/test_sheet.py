"""no-keys (schema): the sheet the Lambda accepts is the contract's whitelist and nothing more.

`packages/contracts/schemas/print-sheet.json` is the contract (dl-1eieq.8.1). Every object in it
is closed, and so is every model in sheet.py: a key, a hint, a boost or a twin anywhere in a sheet
is refused before anything is drawn.
"""

from __future__ import annotations

import copy
import json
import os
from pathlib import Path
from typing import Any, get_args

import pytest
from fixtures import alfik_sheet, draft_sheet, sheet
from pydantic import BaseModel, ValidationError

from printer import sheet as models
from printer.sheet import PrintSheet, parse_sheet

SNAPSHOT = Path(
    os.environ.get("PRINT_SHEET_SCHEMA")
    or Path(__file__).parents[3] / "packages" / "contracts" / "schemas" / "print-sheet.json"
)
needs_snapshot = pytest.mark.skipif(
    not SNAPSHOT.exists(), reason="the PrintSheet snapshot has not landed (dl-1eieq.8.1)"
)


def _snapshot() -> dict[str, Any]:
    return json.loads(SNAPSHOT.read_text())


def test_the_fixtures_parse() -> None:
    for raw in (sheet(), draft_sheet(), alfik_sheet()):
        parse_sheet(json.dumps(raw))


#: Fields of the screen's question that the builder must never copy (the plan's "No keys").
KEYS = ["key", "help", "boost", "near", "worked_solution", "why", "spares", "twins", "hint", "accept"]


def _objects(node: Any, path: tuple[Any, ...] = ()):
    """Every JSON object in a sheet, with its path."""
    if isinstance(node, dict):
        yield path, node
        for k, v in node.items():
            yield from _objects(v, (*path, k))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from _objects(v, (*path, i))


def _at(root: Any, path: tuple[Any, ...]) -> Any:
    for step in path:
        root = root[step]
    return root


@pytest.mark.parametrize("field", KEYS)
def test_a_key_anywhere_is_refused(field: str) -> None:
    base = draft_sheet()
    paths = [p for p, _ in _objects(base) if p[-1:] != ("html",) and p[-1:] != ("media",)]
    assert len(paths) > 100
    for path in paths:
        planted = copy.deepcopy(base)
        _at(planted, path)[field] = "SENTINEL-ANSWER-42"
        with pytest.raises(ValidationError):
            parse_sheet(json.dumps(planted))


def test_a_question_without_a_paper_form_is_refused() -> None:
    planted = draft_sheet()
    planted["questions"][0]["paper"] = "no"
    with pytest.raises(ValidationError):
        parse_sheet(json.dumps(planted))


@needs_snapshot
def test_the_fixtures_meet_the_snapshot() -> None:
    from jsonschema import Draft202012Validator

    validator = Draft202012Validator(_snapshot())
    for raw in (sheet(), draft_sheet(), alfik_sheet()):
        errors = sorted(validator.iter_errors(raw), key=str)
        assert not errors, errors[0].message


def _model_fields(model: type[BaseModel]) -> set[str]:
    return {f.alias or name for name, f in model.model_fields.items()}


def _variants(annotation: Any) -> list[type[BaseModel]]:
    """The models a union (or an Annotated union) names."""
    args = get_args(annotation)
    if args and isinstance(args[0], type) is False and get_args(args[0]):
        args = get_args(args[0])
    return [a for a in args if isinstance(a, type) and issubclass(a, BaseModel)]


@needs_snapshot
def test_each_model_names_the_snapshots_properties() -> None:
    """sheet.py mirrors the snapshot: each $defs object (or union member, by its discriminator)
    has a model with exactly its properties."""
    defs = _snapshot()["$defs"]
    unions = {
        "Figure": (models.Figure, "kind"),
        "OptionContent": (models.OptionContent, "kind"),
        "Gap": (models.Gap, "kind"),
        "PlaceData": (models.PlaceData, "surface"),
        "PrintQuestion": (models.PrintQuestion, "family"),
    }
    checked = 0
    for name, node in defs.items():
        if node.get("type") == "object" and "properties" in node:
            model = getattr(models, name)
            assert _model_fields(model) == set(node["properties"]), name
            checked += 1
        elif name in unions:
            union, tag = unions[name]
            by_tag = {m.model_fields[tag].annotation.__args__[0]: m for m in _variants(union)}
            for member in node.get("oneOf") or node.get("anyOf"):
                const = member["properties"][tag]["const"]
                assert _model_fields(by_tag[const]) == set(member["properties"]), f"{name}.{const}"
                checked += 1
    top = _snapshot()
    assert _model_fields(PrintSheet) == set(top["properties"])
    assert checked > 20


@needs_snapshot
def test_the_question_types_match_the_snapshot() -> None:
    enum = _snapshot()["$defs"]["QuestionType"]["enum"]
    assert set(get_args(models.QuestionType)) == set(enum)
