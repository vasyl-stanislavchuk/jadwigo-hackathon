"""The GPL and LGPL tools, each in a subprocess on our server only (decision dl-n2wys).

- LibreOffice's soffice turns a DOCX into a PDF.
- poppler's pdfinfo reads a PDF's page count and encryption, and pdftoppm renders its pages.
- libheif's heif-convert decodes a HEIC.

Each runs in its own process group under a timeout, and the whole group is killed when it runs
over, soffice.bin included (the pattern lambda-docx-conversion proved). Every file sits in the
caller's work directory under /tmp. A tool's own output is never logged or raised: it can quote
the file.
"""

from __future__ import annotations

import contextlib
import os
import re
import shutil
import signal
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from converter.errors import ENCRYPTED, TOO_MANY_PAGES, UNREADABLE, Refused

#: LIMITS.documentPages in packages/contracts: a PDF or DOCX of more pages is refused whole.
MAX_PAGES: Final = 10
#: pdftoppm's resolution: an A4 page is 1240 x 1755 px, under the 2000 px re-encode.
DPI: Final = 150

SOFFICE_TIMEOUT_S: Final = float(os.environ.get("SOFFICE_TIMEOUT_S", "75"))
TOOL_TIMEOUT_S: Final = float(os.environ.get("TOOL_TIMEOUT_S", "30"))


@dataclass(frozen=True)
class Ran:
    returncode: int
    stdout: str
    stderr: str


def binary(name: str, env: str) -> str:
    """The tool's path: the Dockerfile's env var when it names a file, else PATH."""
    configured = os.environ.get(env, "")
    if configured and Path(configured).exists():
        return configured
    found = shutil.which(name)
    if found:
        return found
    raise RuntimeError(f"{name} is not installed; set {env} to its path in the image")


def run(cmd: list[str], timeout: float) -> Ran:
    """Run cmd in its own process group. Running over the timeout is the file's refusal."""
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True
    )
    try:
        out, err = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise Refused(UNREADABLE) from exc
    finally:
        if proc.poll() is None:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            with contextlib.suppress(subprocess.TimeoutExpired):
                proc.communicate(timeout=10)
    return Ran(
        proc.returncode, out.decode("utf-8", "replace"), err.decode("utf-8", "replace")
    )


def docx_to_pdf(src: Path, workdir: Path) -> Path:
    """The DOCX as a PDF beside it, through a private LibreOffice profile."""
    soffice = binary("soffice", "SOFFICE_BIN")
    profile = workdir / "lo-profile"
    outdir = workdir / "lo-out"
    outdir.mkdir()
    ran = run(
        [
            soffice,
            "--headless",
            "--norestore",
            "--nolockcheck",
            f"-env:UserInstallation={profile.as_uri()}",
            "--convert-to",
            "pdf",
            "--outdir",
            str(outdir),
            str(src),
        ],
        SOFFICE_TIMEOUT_S,
    )
    out = outdir / f"{src.stem}.pdf"
    if ran.returncode != 0 or not out.exists() or not out.read_bytes().startswith(b"%PDF"):
        raise Refused(UNREADABLE)
    return out


_PAGES = re.compile(r"^Pages:\s+(\d+)\s*$", re.MULTILINE)
_ENCRYPTED = re.compile(r"^Encrypted:\s+yes", re.MULTILINE)


def pdf_pages(src: Path) -> int:
    """The page count, after the refusals: encrypted, unreadable, more than MAX_PAGES."""
    ran = run([binary("pdfinfo", "PDFINFO_BIN"), str(src)], TOOL_TIMEOUT_S)
    if ran.returncode != 0:
        # A user password stops pdfinfo itself; anything else it cannot open is unreadable.
        raise Refused(ENCRYPTED if "password" in ran.stderr.lower() else UNREADABLE)
    if _ENCRYPTED.search(ran.stdout):
        raise Refused(ENCRYPTED)
    found = _PAGES.search(ran.stdout)
    if not found or int(found.group(1)) < 1:
        raise Refused(UNREADABLE)
    pages = int(found.group(1))
    if pages > MAX_PAGES:
        raise Refused(TOO_MANY_PAGES)
    return pages


_PAGE_FILE = re.compile(r"^page-(\d+)\.jpg$")


def pdf_to_jpegs(src: Path, workdir: Path, pages: int) -> list[Path]:
    """Pages 1 to pages, rendered at DPI, in page order."""
    outdir = workdir / "pages"
    outdir.mkdir()
    ran = run(
        [
            binary("pdftoppm", "PDFTOPPM_BIN"),
            "-jpeg",
            "-jpegopt",
            "quality=95",
            "-r",
            str(DPI),
            "-f",
            "1",
            "-l",
            str(min(pages, MAX_PAGES)),
            str(src),
            str(outdir / "page"),
        ],
        TOOL_TIMEOUT_S * 2,
    )
    numbered = sorted(
        (int(m.group(1)), path)
        for path in outdir.iterdir()
        if (m := _PAGE_FILE.match(path.name))
    )
    if ran.returncode != 0 or len(numbered) != pages:
        raise Refused(UNREADABLE)
    return [path for _, path in numbered]


def heic_to_jpeg(src: Path, workdir: Path) -> Path:
    """The HEIC's image as a JPEG. A file of several images gives the first, numbered, one."""
    outdir = workdir / "heif"
    outdir.mkdir()
    ran = run(
        [binary("heif-convert", "HEIF_CONVERT_BIN"), "-q", "95", str(src), str(outdir / "image.jpg")],
        TOOL_TIMEOUT_S,
    )
    written = sorted(outdir.glob("image*.jpg"))
    if ran.returncode != 0 or not written:
        raise Refused(UNREADABLE)
    return written[0]
