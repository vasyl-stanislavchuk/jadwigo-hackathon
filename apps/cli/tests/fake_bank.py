"""A fake of the bank's search route, for the contract test and for trying `jw question search`.

It answers POST /questions/search with tests/fixtures/bank/envelope.json, echoing the need it was
sent and the arm and stage query fields. It records every request, and can be told to fail with
a status or to stall past a client's timeout.

    uv run python tests/contract/fake_bank.py --port 8765
"""

from __future__ import annotations

import argparse
import contextlib
import copy
import json
import threading
import time
import urllib.parse
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

ROUTES = ("/api/v1/question-searches", "/questions/search")
FIXTURE = Path(__file__).resolve().parent / "fixtures" / "bank" / "envelope.json"


@dataclass
class Seen:
    path: str
    query: dict[str, str]
    headers: dict[str, str]
    body: Any


@dataclass
class FakeBank:
    status: int = 200  # anything but 200 answers with an empty error body
    delay: float = 0.0  # seconds to stall before answering
    requests: list[Seen] = field(default_factory=list)
    server: ThreadingHTTPServer | None = None

    @property
    def url(self) -> str:
        assert self.server is not None
        host, port = self.server.server_address[:2]
        return f"http://{host!s}:{port}"

    def answer(self, need: Any, query: dict[str, str]) -> dict[str, Any]:
        envelope: dict[str, Any] = copy.deepcopy(json.loads(FIXTURE.read_text(encoding="utf-8")))
        envelope["need"] = need
        if "arm" in query:
            arm = query["arm"]
            envelope["arm"] = arm
            for row in envelope["rows"]:
                row["arm"] = arm
            envelope["state"] = [
                {"arm": s["arm"], "state": "ok" if s["arm"] == arm else "not_asked"}
                for s in envelope["state"]
            ]
        if query.get("stage") == "first":
            envelope["stage"] = "first"
            keep = ("id", "rank", "score", "arm", "titles")
            envelope["rows"] = [{k: r[k] for k in keep} for r in envelope["rows"]]
        return envelope

    def start(self, port: int = 0) -> FakeBank:
        bank = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                parsed = urllib.parse.urlsplit(self.path)
                query = dict(urllib.parse.parse_qsl(parsed.query))
                length = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(length) or b"null")
                bank.requests.append(Seen(parsed.path, query, dict(self.headers.items()), body))
                if bank.delay:
                    time.sleep(bank.delay)
                if parsed.path not in ROUTES:
                    self.send_response(404)
                    self.end_headers()
                    return
                if bank.status != 200:
                    self.send_response(bank.status)
                    self.end_headers()
                    return
                payload = json.dumps(bank.answer(body, query)).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                # The client may already have given up (the timeout test).
                with contextlib.suppress(BrokenPipeError, ConnectionResetError):
                    self.wfile.write(payload)

            def log_message(self, format: str, *args: Any) -> None:
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
        self.server.daemon_threads = True
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        return self

    def stop(self) -> None:
        if self.server is not None:
            self.server.shutdown()
            self.server.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    bank = FakeBank().start(args.port)
    print(f"fake bank on {bank.url} (JW_API_URL={bank.url}); Ctrl-C stops it", flush=True)
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        bank.stop()
