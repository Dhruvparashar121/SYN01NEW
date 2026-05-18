#!/usr/bin/env python3
"""
victim/arp_watcher.py
=====================

Real-time ARP-change detector for the victim VM.

How it works
------------
Every <interval> seconds we read /proc/net/arp, compare it to the
previous snapshot, and print a coloured diff:

    [10:23:14]  NEW   192.168.56.102  bb:bb:bb:bb:bb:02 on eth0
    [10:23:18]  CHANGED 192.168.56.1   cc:cc:cc:...:01 -> bb:bb:bb:...:02   *** SUSPICIOUS ***

The "*** SUSPICIOUS ***" tag fires when the new MAC matches the IP of
another host already in the cache — that is exactly the fingerprint of
ARP poisoning (one MAC suddenly claims two IPs).  This is the headline
moment for the class: they watch the row for the gateway change MAC in
real time the instant arp_spoof.py starts on the attacker VM.

Why poll /proc/net/arp instead of sniffing?
-------------------------------------------
Two reasons:

  * No root required.  Students can run this from a normal shell.
  * It shows the KERNEL'S view of the world, which is the view that
    actually matters — what packets will be addressed to.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402
from shared.network_utils import list_arp_cache         # noqa: E402


def snapshot() -> dict[str, tuple[str, str]]:
    """Return {ip: (mac, iface)} from the current ARP cache."""
    out: dict[str, tuple[str, str]] = {}
    for row in list_arp_cache():
        # Skip incomplete entries — "00:00:00:00:00:00" means the
        # kernel has an IP listed but never resolved it.
        if row["mac"] == "00:00:00:00:00:00":
            continue
        out[row["ip"]] = (row["mac"], row["iface"])
    return out


def detect_collisions(table: dict[str, tuple[str, str]]) -> set[str]:
    """
    Return the set of MAC addresses that appear against MORE THAN ONE
    IP.  One MAC + multiple IPs is the canonical ARP-spoofing footprint.
    """
    counts: dict[str, list[str]] = {}
    for ip, (mac, _iface) in table.items():
        counts.setdefault(mac, []).append(ip)
    return {mac for mac, ips in counts.items() if len(ips) > 1}


def diff_and_log(prev: dict[str, tuple[str, str]],
                 curr: dict[str, tuple[str, str]]) -> None:
    """Print a coloured line for every change between the two snapshots."""
    suspicious_macs = detect_collisions(curr)

    # NEW / CHANGED
    for ip, (mac, iface) in curr.items():
        if ip not in prev:
            tag = "*** SUSPICIOUS ***" if mac in suspicious_macs else ""
            colors.ok(f"NEW     {ip:<16}  {mac}  on {iface}  {tag}")
        elif prev[ip][0] != mac:
            tag = "*** SUSPICIOUS ***" if mac in suspicious_macs else ""
            colors.warn(
                f"CHANGED {ip:<16}  {prev[ip][0]} -> {mac}  on {iface}  {tag}"
            )

    # REMOVED
    for ip in prev:
        if ip not in curr:
            colors.info(f"GONE    {ip:<16}  {prev[ip][0]}  (no longer in cache)")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Watch /proc/net/arp for poisoning-style changes.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--interval", type=float,
                   default=config.ARP_WATCHER_POLL_SEC,
                   help="Seconds between cache polls")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    colors.banner("victim/arp_watcher.py", role="VICTIM / ARP WATCHER")
    colors.info(f"Polling /proc/net/arp every {args.interval}s. Ctrl-C to stop.")

    prev = snapshot()
    # Print the initial state once so the operator has a baseline.
    colors.step("Initial ARP cache:")
    for ip, (mac, iface) in sorted(prev.items()):
        print(f"    {ip:<16}  {mac}  on {iface}")

    try:
        while True:
            time.sleep(args.interval)
            curr = snapshot()
            if curr != prev:
                diff_and_log(prev, curr)
                prev = curr
    except KeyboardInterrupt:
        colors.warn("Watcher stopped by user.")


if __name__ == "__main__":
    main()
