"""Lets a Mac find Homebrew's pango, for the tests and `make sample` (never the Lambda, on Linux).

WeasyPrint opens pango, gobject and harfbuzz by their bare names, and `uv run` drops the
DYLD_FALLBACK_LIBRARY_PATH that would point dlopen at Homebrew. This retries a name that failed
under Homebrew's lib directory, before weasyprint is imported.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

PREFIXES = (os.environ.get("HOMEBREW_PREFIX", ""), "/opt/homebrew", "/usr/local")


def install() -> None:
    if sys.platform != "darwin":
        return
    import cffi

    libs = [Path(p) / "lib" for p in PREFIXES if p and (Path(p) / "lib").is_dir()]
    original = cffi.FFI.dlopen

    def dlopen(self, name, flags=0):  # type: ignore[no-untyped-def]
        try:
            return original(self, name, flags)
        except OSError:
            for lib in libs:
                for candidate in (lib / name, lib / f"{name}.dylib"):
                    if candidate.exists():
                        return original(self, str(candidate), flags)
            raise

    cffi.FFI.dlopen = dlopen  # type: ignore[method-assign]


install()
