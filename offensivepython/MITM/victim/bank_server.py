#!/usr/bin/env python3
"""
victim/bank_server.py
=====================

The world's smallest "bank" — a tiny HTTP server bound to port 8088
that returns a single line containing the account balance.

Its only job in the lab is to give the attacker something tangible to
observe / threaten to rewrite in http_mitm.py:

    $ curl http://192.168.56.101:8088/
    Welcome to ACO Bank. Your balance: $1,000,000.

We use the stdlib `http.server` instead of Flask/FastAPI so the file is
short, has no install requirements on the victim VM, and the request
handling is fully visible to students.

We bind to 8088, not 80, so the server can run as an unprivileged user.
"""

from __future__ import annotations

import argparse
import signal
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402


class BankHandler(BaseHTTPRequestHandler):
    """One handler instance is created per request; keep it stateless."""

    # Override the noisy default logger so our coloured one wins.
    def log_message(self, fmt: str, *args) -> None:    # noqa: D401, N802
        colors.info(f"{self.client_address[0]}  {fmt % args}")

    def do_GET(self) -> None:                          # noqa: N802
        body = (config.BANK_GREETING + "\n").encode("utf-8")
        self.send_response(200, "OK")
        self.send_header("Content-Type",   "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # Disable keep-alive: each request gets a fresh TCP connection.
        # That makes the captures in http_mitm.py easier to read for
        # students who are seeing HTTP-over-TCP for the first time.
        self.send_header("Connection",     "close")
        self.end_headers()
        self.wfile.write(body)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Tiny HTTP 'bank' server for the Module 5 victim VM.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--bind", default="0.0.0.0",
                   help="Interface to bind to (0.0.0.0 = all)")
    p.add_argument("--port", type=int, default=config.BANK_PORT)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    colors.banner("victim/bank_server.py", role="VICTIM / BANK")

    # ThreadingHTTPServer lets multiple students hit the server at once.
    server = ThreadingHTTPServer((args.bind, args.port), BankHandler)
    colors.ok(f"Listening on http://{args.bind}:{args.port}/")
    colors.info(f"Response: {config.BANK_GREETING}")
    colors.info("Press Ctrl-C to stop.")

    # Polite Ctrl-C: shutdown the socket first so the kernel can
    # immediately reuse the port if you restart in a tight loop.
    def _sig(signum, _frame):
        colors.warn(f"Caught signal {signum} — shutting down")
        # shutdown() must NOT be called from the same thread as
        # serve_forever(); but here we're in the signal-handling
        # context, so we set a flag and call from main.
        server.shutdown()
    signal.signal(signal.SIGINT,  _sig)
    signal.signal(signal.SIGTERM, _sig)

    try:
        server.serve_forever()
    finally:
        server.server_close()
        colors.ok("Bank server stopped cleanly.")


if __name__ == "__main__":
    main()
