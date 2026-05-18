#!/usr/bin/env python3
"""
victim/browser_sim.py
=====================

A toy "user browsing the intranet" loop.

Every <interval> seconds the script:

  1. Resolves a hostname from the rotating target list (bank.lab,
     mail.lab, intranet.lab) using the OS resolver — same code path
     a real browser would use.
  2. If the name resolves, makes a GET request to it on the bank
     port and logs the first line of the body.

In the unspoofed state the names resolve to whatever the host's
dnsmasq returns; once dns_spoof.py is running they will resolve to
the attacker IP and the GET will land on the attacker's HTTP listener
(or fail closed if the attacker has no listener — also a useful
classroom moment).

Why this exists
---------------
Recon is exciting.  Watching nothing happen because no one is making
DNS queries is not.  This loop guarantees there is steady, observable
traffic the instructor can point at during the demo.
"""

from __future__ import annotations

import argparse
import socket
import sys
import time
from itertools import cycle
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402

try:
    import requests
except ImportError:
    colors.die("requests is required: pip3 install requests")


def fetch_once(hostname: str, port: int, timeout: float) -> None:
    """Resolve <hostname>, then GET / on it, logging both steps."""
    # ----- DNS -----
    try:
        ip = socket.gethostbyname(hostname)
        colors.info(f"DNS  {hostname}  ->  {ip}")
    except socket.gaierror as exc:
        colors.warn(f"DNS  {hostname}  FAILED ({exc})")
        return

    # ----- HTTP -----
    url = f"http://{hostname}:{port}/"
    try:
        resp = requests.get(url, timeout=timeout)
        first_line = resp.text.splitlines()[0] if resp.text else "(empty)"
        colors.ok(f"HTTP {url}  [{resp.status_code}]  {first_line}")
    except requests.RequestException as exc:
        colors.bad(f"HTTP {url}  FAILED ({exc.__class__.__name__})")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Periodic DNS + HTTP loop for the Module 5 victim VM.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--targets",  nargs="+",
                   default=list(config.TARGET_HOSTNAMES))
    p.add_argument("--port",     type=int, default=config.BANK_PORT)
    p.add_argument("--interval", type=float,
                   default=config.BROWSER_SIM_INTERVAL_SEC,
                   help="Seconds between requests")
    p.add_argument("--timeout",  type=float, default=3.0)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    colors.banner("victim/browser_sim.py", role="VICTIM / BROWSER SIM")
    colors.info(f"Targets : {', '.join(args.targets)}")
    colors.info(f"Interval: {args.interval}s   Timeout: {args.timeout}s")
    colors.info("Press Ctrl-C to stop.")

    # cycle() rotates through the list forever — keeps DNS traffic
    # varied so the attacker's sniffer has more than one thing to chew.
    rotation = cycle(args.targets)
    try:
        while True:
            fetch_once(next(rotation), args.port, args.timeout)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        colors.warn("Browser sim stopped by user.")


if __name__ == "__main__":
    main()
