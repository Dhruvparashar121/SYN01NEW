"""
shared/colors.py
================

Tiny terminal-colour helper.  We deliberately do NOT pull in a library
like `rich` or `colorama` because:

  * The students will read this file and we want the magic to be visible.
  * Kali / Ubuntu terminals already understand ANSI escape codes.
  * Fewer dependencies = fewer things that can break during a live demo.

Usage
-----

    from shared.colors import log, ok, warn, bad, info, banner

    info("Starting ARP poisoner")
    ok("Got victim MAC: aa:aa:aa:aa:aa:01")
    warn("ip_forward is 0 — packets will black-hole")
    bad("Could not resolve gateway MAC, aborting")

Each helper prints a timestamped, colour-prefixed line to stdout and
flushes immediately so output stays in order even when several scripts
share a tmux pane via `tee`.
"""

from __future__ import annotations

import sys
import time
from typing import Final

# ---------------------------------------------------------------------------
# Raw ANSI escape codes.  \033 is ESC; "[<n>m" sets a SGR attribute.
# Reference: https://en.wikipedia.org/wiki/ANSI_escape_code
# ---------------------------------------------------------------------------
RESET: Final[str]  = "\033[0m"
BOLD: Final[str]   = "\033[1m"
DIM: Final[str]    = "\033[2m"

RED: Final[str]    = "\033[31m"
GREEN: Final[str]  = "\033[32m"
YELLOW: Final[str] = "\033[33m"
BLUE: Final[str]   = "\033[34m"
MAGENTA: Final[str] = "\033[35m"
CYAN: Final[str]   = "\033[36m"
WHITE: Final[str]  = "\033[37m"


def _ts() -> str:
    """Return a short HH:MM:SS timestamp for log lines."""
    return time.strftime("%H:%M:%S")


def _emit(colour: str, tag: str, msg: str) -> None:
    """
    Print one coloured, timestamped line.

    We flush after every line so that piping through `tee` or running in
    tmux does not buffer messages until the script exits — important
    during a live classroom demo where you want feedback immediately.
    """
    print(f"{DIM}[{_ts()}]{RESET} {colour}{BOLD}[{tag}]{RESET} {msg}",
          flush=True)


# ---------------------------------------------------------------------------
# Public log helpers — short names because they appear on almost every line.
# ---------------------------------------------------------------------------
def info(msg: str) -> None:
    """Neutral informational message (cyan)."""
    _emit(CYAN, "INFO", msg)


def ok(msg: str) -> None:
    """Something good just happened (green)."""
    _emit(GREEN, " OK ", msg)


def warn(msg: str) -> None:
    """Non-fatal warning the user should notice (yellow)."""
    _emit(YELLOW, "WARN", msg)


def bad(msg: str) -> None:
    """Error or failure (red).  Does NOT call sys.exit — caller decides."""
    _emit(RED, "FAIL", msg)


def step(msg: str) -> None:
    """Marker for a major step in the attack chain (magenta)."""
    _emit(MAGENTA, "STEP", msg)


def log(msg: str) -> None:
    """Plain log line, no colour (still timestamped)."""
    print(f"{DIM}[{_ts()}]{RESET}      {msg}", flush=True)


# ---------------------------------------------------------------------------
# Banner — every attacker script prints this on startup so anyone who walks
# past the screen knows the box is in "lab attack" mode, not production.
# ---------------------------------------------------------------------------
def banner(script_name: str, role: str = "ATTACKER") -> None:
    """Big, hard-to-miss header printed on script startup."""
    bar = "=" * 68
    print(f"{BOLD}{RED}{bar}{RESET}", flush=True)
    print(f"{BOLD}{RED}  Offensive Python (ACO-03) — {role} module{RESET}",
          flush=True)
    print(f"{BOLD}{RED}  {script_name}{RESET}", flush=True)
    print(f"{BOLD}{YELLOW}  LAB USE ONLY — 192.168.56.0/24 host-only network{RESET}",
          flush=True)
    print(f"{BOLD}{RED}{bar}{RESET}", flush=True)


def die(msg: str, code: int = 1) -> None:
    """Print a fatal error in red and exit with the given code."""
    bad(msg)
    sys.exit(code)
