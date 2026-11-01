"""One workflow in every language (dl-5ssh.34.23, docs/research/i18n.md in david-learns, section 6).

A workflow file holds its steps once. The parts that differ by language sit beside it in
`workflows/_lang/<language>/`, and the rules every language shares in `workflows/_shared/`.

- `resolve` takes the language from the record a workflow writes to, never from the text:
  a lesson from its goal's `lesson_language`, a report from its pod's `language`, a review from
  its batch's `language`.
- `assemble` puts the workflow file, `_shared` and `_lang/<language>` into one prompt that names
  its language in its first line, and stops before any model call when a part is missing.
- `check_envelope` checks that an output says the language it was asked for, and that every
  `{text, language}` line in it does too, unless it is a marked quote.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Final

from jw import settings_keys
from jw.errors import JwError
from jw.languages import LANGUAGES, NAMES

# The record each workflow takes its language from, and the field that holds it.
RECORDS: Final = {
    "jadwigo-lesson-compose": "goal",
    "jadwigo-report-write": "pod",
    "jadwigo-lesson-review": "batch",
}
# The parts every language needs before a run, in the order a prompt carries them.
PARTS: Final = ("style.md", "glossary.md", "checklist.md")
EXAMPLES: Final = "examples"


class WorkflowError(JwError):
    """A workflow that cannot run: unknown, no language on its record, or missing parts."""


class MissingParts(WorkflowError):
    default_hint = "write the missing parts and have the reviewer pass their examples (docs/runbooks/add-a-language.md)"

    def __init__(self, language: str, missing: list[str]) -> None:
        super().__init__(
            f"{language} has no reviewed material for this workflow: missing {', '.join(missing)}"
        )
        self.language = language
        self.missing = missing
        self.extra = {"language": language, "missing": missing}


@dataclass(frozen=True)
class Resolved:
    language: str
    language_source: str


def workflows_dir() -> Path:
    """The checkout's workflows/ folder; a jw installed outside a checkout has none."""
    repo = settings_keys.repo_dir()
    if repo is None or not (repo / "workflows").is_dir():
        raise WorkflowError(
            "no workflows folder", hint="set JADWIGO_REPO_DIR to the jadwigo checkout"
        )
    return repo / "workflows"


def _language(value: object, source: str) -> Resolved:
    if not isinstance(value, str) or value not in LANGUAGES:
        raise WorkflowError(
            f"{source} names no language jw speaks: {value!r}",
            hint=f"one of {', '.join(LANGUAGES)}",
        )
    return Resolved(value, source)


def resolve(name: str, record: Mapping[str, Any]) -> Resolved:
    """The language `name` runs in, from its record, and where it came from (`goal:<id>`)."""
    kind = RECORDS.get(name)
    if kind is None:
        raise WorkflowError(
            f"no such workflow: {name}", hint=f"one of {', '.join(sorted(RECORDS))}"
        )
    if kind == "goal":
        goal = record.get("goal", record)
        return _language(goal.get("lesson_language"), f"goal:{goal.get('id', '?')}")
    if kind == "pod":
        pod = record.get("pod") or record
        return _language(pod.get("language"), f"pod:{pod.get('id', '?')}")
    return _language(record.get("language"), "batch")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def missing_parts(language: str, root: Path | None = None) -> list[str]:
    """The `_lang/<language>` parts a run needs and the checkout lacks, repo-relative."""
    lang = (root or workflows_dir()) / "_lang" / language
    missing = [
        f"workflows/_lang/{language}/{part}"
        for part in PARTS
        if not (lang / part).is_file()
    ]
    if not sorted((lang / EXAMPLES).glob("*.md")):
        missing.append(f"workflows/_lang/{language}/{EXAMPLES}/")
    return missing


def parts(name: str, resolved: Resolved, root: Path | None = None) -> dict[str, Any]:
    """The language's parts for `name`, read whole, or `MissingParts` naming what is not there."""
    base = root or workflows_dir()
    if name not in RECORDS:
        raise WorkflowError(
            f"no such workflow: {name}", hint=f"one of {', '.join(sorted(RECORDS))}"
        )
    missing = missing_parts(resolved.language, base)
    if missing:
        raise MissingParts(resolved.language, missing)
    lang = base / "_lang" / resolved.language
    shared = (
        sorted((base / "_shared").glob("*.md")) if (base / "_shared").is_dir() else []
    )
    return {
        "workflow": name,
        "language": resolved.language,
        "language_name": NAMES[resolved.language],
        "language_source": resolved.language_source,
        "shared": {p.name: _read(p) for p in shared},
        "parts": {part.removesuffix(".md"): _read(lang / part) for part in PARTS},
        "examples": {p.name: _read(p) for p in sorted((lang / EXAMPLES).glob("*.md"))},
    }


def assemble(name: str, resolved: Resolved, root: Path | None = None) -> str:
    """One prompt: the target language first, then the workflow file, `_shared`, `_lang`."""
    base = root or workflows_dir()
    found = parts(name, resolved, base)
    lang = found["language_name"]
    blocks = [
        f"Write every line a person reads in {lang} (`{resolved.language}`, from {resolved.language_source}).",
        _read(base / name / "SKILL.md"),
        *found["shared"].values(),
        *(f"## {lang} {key}\n\n{text}" for key, text in found["parts"].items()),
        *(
            f"## {lang} reviewed examples\n\n{text}"
            for text in found["examples"].values()
        ),
    ]
    return "\n\n".join(blocks) + "\n"


def _lines(value: Any, at: str = "$") -> list[tuple[str, Mapping[str, Any]]]:
    """Every `{text, language}` object in an output, with its path."""
    found: list[tuple[str, Mapping[str, Any]]] = []
    if isinstance(value, Mapping):
        if isinstance(value.get("text"), str) and "language" in value:
            found.append((at, value))
        for key, child in value.items():
            found.extend(_lines(child, f"{at}.{key}"))
    elif isinstance(value, list):
        for i, child in enumerate(value):
            found.extend(_lines(child, f"{at}[{i}]"))
    return found


def check_envelope(output: Mapping[str, Any], language: str) -> list[str]:
    """What is wrong with an output's languages; empty when it is all in `language`."""
    findings = []
    if output.get("language") != language:
        findings.append(
            f"the output's language is {output.get('language')!r}, not {language!r}"
        )
    for at, line in _lines(output):
        if line.get("language") != language and not line.get("quote"):
            findings.append(
                f"{at} is in {line.get('language')!r}, not {language!r}, and is not a marked quote"
            )
    return findings
