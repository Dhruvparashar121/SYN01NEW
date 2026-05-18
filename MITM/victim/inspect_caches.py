#!/usr/bin/env python3
"""
victim/inspect_caches.py
========================

One-shot snapshot of the victim's networking state — useful for the
"BEFORE / DURING / AFTER" comparison slides:

  * Local interface IPs and MACs
  * Default route (the gateway IP we ought to be reaching)
  * Full ARP cache (with collision warnings)
  * Resolver config (/etc/resolv.conf)

It is intentionally read-only.  Run it at the three demo milestones:

    1. Before any attack          — baseline
    2. During the attack          — see the gateway MAC change
    3. After cleanup.py           — confirm the cache healed
"""

from __future__ import annotations

import argparse
import socket
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import colors                               # noqa: E402
from shared.network_utils import (                      # noqa: E402
    list_arp_cache, get_iface_ip, get_iface_mac, SCAPY_AVAILABLE,
)


def show_interfaces() -> None:
    """List every /sys/class/net interface with its IP and MAC."""
    colors.step("Network interfaces")
    sysnet = Path("/sys/class/net")
    if not sysnet.exists():                              # pragma: no cover
        colors.warn("No /sys/class/net — non-Linux host?")
        return
    for iface_path in sorted(sysnet.iterdir()):
        iface = iface_path.name
        mac = get_iface_mac(iface) or "??"
        ip  = get_iface_ip(iface)  or "(no IPv4)"
        print(f"    {iface:<10}  {ip:<16}  {mac}")


def show_default_route() -> None:
    """Cheap default-route reader — parses /proc/net/route."""
    colors.step("Default route (gateway)")
    try:
        with open("/proc/net/route") as fh:
            lines = fh.readlines()[1:]
    except OSError:
        colors.warn("Could not read /proc/net/route")
        return
    for line in lines:
        parts = line.split()
        # Destination 00000000 means "default route".
        if parts[1] == "00000000":
            # Gateway is stored as little-endian hex; reverse the bytes.
            gw_hex = parts[2]
            gw = ".".join(str(int(gw_hex[i:i+2], 16))
                          for i in (6, 4, 2, 0))
            print(f"    via {gw}   dev {parts[0]}")
            return
    colors.warn("No default route configured.")


def show_arp_cache() -> None:
    """Pretty-print /proc/net/arp and flag MAC collisions."""
    colors.step("ARP cache (/proc/net/arp)")
    rows = list_arp_cache()
    if not rows:
        colors.warn("ARP cache empty — generate some traffic first.")
        return

    mac_counts: dict[str, list[str]] = {}
    for r in rows:
        if r["mac"] != "00:00:00:00:00:00":
            mac_counts.setdefault(r["mac"], []).append(r["ip"])

    for r in rows:
        suspicious = (
            r["mac"] != "00:00:00:00:00:00"
            and len(mac_counts.get(r["mac"], [])) > 1
        )
        tag = "  *** SUSPICIOUS ***" if suspicious else ""
        print(f"    {r['ip']:<16}  {r['mac']}  on {r['iface']}{tag}")


def show_resolver() -> None:
    """Dump /etc/resolv.conf and try one canary lookup."""
    colors.step("Resolver configuration (/etc/resolv.conf)")
    try:
        with open("/etc/resolv.conf") as fh:
            for line in fh:
                if line.strip() and not line.startswith("#"):
                    print(f"    {line.rstrip()}")
    except OSError:
        colors.warn("Could not read /etc/resolv.conf")

    colors.step("Sample DNS lookup")
    try:
        ip = socket.gethostbyname("bank.lab")
        colors.ok(f"bank.lab -> {ip}")
    except socket.gaierror as exc:
        colors.warn(f"bank.lab lookup failed: {exc}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Print a snapshot of the victim's networking state.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    return p.parse_args()


def main() -> None:
    parse_args()
    colors.banner("victim/inspect_caches.py", role="VICTIM / INSPECTOR")
    if not SCAPY_AVAILABLE:
        colors.warn("scapy not installed — falling back to /proc/sys reads only")
    show_interfaces()
    show_default_route()
    show_arp_cache()
    show_resolver()
    print()
    colors.ok("Snapshot complete.")


if __name__ == "__main__":
    main()
