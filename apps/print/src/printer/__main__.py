"""`python -m printer <sheet.json> <out.pdf>`: draws one sheet on this machine (`make sample`)."""

from __future__ import annotations

import sys
from pathlib import Path

from printer.render import render
from printer.sheet import parse_sheet


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python -m printer <sheet.json> <out.pdf>", file=sys.stderr)
        return 2
    sheet = parse_sheet(Path(argv[0]).read_bytes())
    rendered = render(sheet)
    Path(argv[1]).write_bytes(rendered.pdf)
    print(f"{argv[1]}: {rendered.pages} pages, {len(sheet.questions)} questions")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
