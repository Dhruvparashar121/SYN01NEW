#!/usr/bin/env python3
"""
attacker/recon.py
=================

Step 1 of the attack chain — passive/active recon.

Before we can poison anyone's ARP cache we need to know:

  1. What MAC address is really bound to the victim's IP?
  2. What MAC address is really bound to the gateway's IP?

Why?  An ARP poisoning attack works by IMPERSONATING those two hosts to
each other.  We do not need their MACs to forge the lie — we only need
to know who we are sending the lie *to*, and from what L2 address we
should pretend to be on each side.  Knowing the real MACs lets us:

  * Cross-check that the recon worked.  If we ARP-scan 192.168.56.101
    and don't get aa:aa:aa:aa:aa:01 back, the lab is misconfigured.
  * Pass the real MACs to cleanup.py so it can heal the caches with
    correct data, not whatever we hard-coded.

Recon technique — active ARP request
------------------------------------
We send a layer-2 broadcast "who-has X.X.X.X, tell me" packet.  The
host that owns that IP is REQUIRED by RFC 826 to reply with its MAC.
This is exactly the same packet `arping` sends, and exactly the same
packet your own kernel sends when it needs to L2-deliver a packet to
a neighbour it has never spoken to before.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402
from shared.network_utils import (                      # noqa: E402
    assert_lab_network, arp_lookup, get_iface_ip, get_iface_mac, require_root,
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Discover victim + gateway MACs on the lab segment.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--victim",  default=config.VICTIM_IP)
    p.add_argument("--gateway", default=config.GATEWAY_IP)
    p.add_argument("--iface",   default=config.DEFAULT_IFACE)
    p.add_argument("--timeout", type=float, default=2.0,
                   help="Seconds to wait for each ARP reply")
    return p.parse_args()


def recon(victim_ip: str,
          gateway_ip: str,
          iface: str,
          timeout: float) -> tuple[str | None, str | None]:
    """Return (victim_mac, gateway_mac) — either may be None on failure."""
    colors.step(f"ARP-scanning victim  {victim_ip}")
    v_mac = arp_lookup(victim_ip, iface=iface, timeout=timeout)
    if v_mac:
        colors.ok(f"victim  {victim_ip} is at {v_mac}")
    else:
        colors.bad(f"No ARP reply from {victim_ip} on {iface}")

    colors.step(f"ARP-scanning gateway {gateway_ip}")
    g_mac = arp_lookup(gateway_ip, iface=iface, timeout=timeout)
    if g_mac:
        colors.ok(f"gateway {gateway_ip} is at {g_mac}")
    else:
        colors.bad(f"No ARP reply from {gateway_ip} on {iface}")

    return v_mac, g_mac


def main() -> None:
    args = parse_args()
    colors.banner("attacker/recon.py", role="ATTACKER / RECON")

    assert_lab_network(args.victim)
    assert_lab_network(args.gateway)
    require_root("attacker/recon.py")

    # Sanity print of our own L2/L3 — useful for the demo so students
    # can compare the attacker's identity to what shows up in the
    # victim's poisoned ARP table later.
    my_ip  = get_iface_ip(args.iface)  or "(unknown)"
    my_mac = get_iface_mac(args.iface) or "(unknown)"
    colors.info(f"Local iface : {args.iface}  ip={my_ip}  mac={my_mac}")

    v_mac, g_mac = recon(args.victim, args.gateway, args.iface, args.timeout)

    print()
    colors.step("Recon summary")
    print(f"    Victim  : {args.victim:<16}  -> {v_mac or 'UNKNOWN'}")
    print(f"    Gateway : {args.gateway:<16}  -> {g_mac or 'UNKNOWN'}")
    print(f"    Attacker: {my_ip:<16}  -> {my_mac}")

    # Non-zero exit if either lookup failed so wrapper scripts / Makefiles
    # can decide not to proceed to the poisoning step.
    if not v_mac or not g_mac:
        colors.die("Recon incomplete — refusing to advance to ARP poisoning.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
