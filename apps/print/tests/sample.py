"""`make sample`: draws a fixture sheet with this machine's pango, its pictures served from memory as
the tests serve them, so the sample shows every picture instead of the alt text of one that the
test media host (media.jadwigo.test) never answers. The Lambda's own path is `python -m printer`."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from conftest import offline_fetcher

from printer.render import render
from printer.sheet import PrintSheet


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python tests/sample.py <sheet.json> <out.pdf>", file=sys.stderr)
        return 2
    raw = json.loads(Path(argv[0]).read_bytes())
    sheet = PrintSheet.model_validate(raw)
    rendered = render(sheet, offline_fetcher(raw))
    Path(argv[1]).write_bytes(rendered.pdf)
    print(f"{argv[1]}: {rendered.pages} pages, {len(sheet.questions)} questions")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
