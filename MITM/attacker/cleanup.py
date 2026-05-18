#!/usr/bin/env python3
"""
attacker/cleanup.py
===================

The "undo" button for the ARP-poisoning attack.

How an ARP poisoning attack persists
------------------------------------
When we ran arp_spoof.py we told the victim:
    "192.168.56.1 (the gateway) is at bb:bb:bb:bb:bb:02 (us)."
…and we told the gateway:
    "192.168.56.101 (the victim) is at bb:bb:bb:bb:bb:02 (us)."

Both kernels happily wrote those lies into their ARP caches.  Even
after we kill arp_spoof.py, those entries will remain valid for up
to ~60 seconds (Linux default).  During that window the victim still
can't reach the gateway because it's MAC-ing packets to a host that
is no longer forwarding them.

What cleanup.py does
--------------------
It broadcasts the *truth* a handful of times:

    "192.168.56.1   really is at cc:cc:cc:cc:cc:01"
    "192.168.56.101 really is at aa:aa:aa:aa:aa:01"

…by sending unsolicited (op=2) ARP replies.  Modern OSes accept these
"gratuitous" replies even though no one asked, which is exactly the
quirk that made the original attack possible.  Here we use the same
quirk for good: it heals the caches in seconds instead of waiting for
the natural TTL to expire.

This script is designed to be:

  * Standalone — runnable on its own if something crashes mid-attack.
  * Idempotent — safe to run twice in a row.
  * Quick      — finishes in a few seconds, prints a final ARP-table
                  hint so the instructor can verify on the victim.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

# Make `import shared.…` work when run as `python3 attacker/cleanup.py`
# from the project root (i.e. without `pip install -e .`).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402
from shared.network_utils import assert_lab_network     # noqa: E402

try:
    from scapy.all import ARP, Ether, sendp             # type: ignore
except ImportError:
    colors.die("scapy is required: pip3 install scapy")


def build_truth_reply(claimed_ip: str,
                      claimed_mac: str,
                      target_ip: str,
                      target_mac: str) -> "Ether":
    """
    Build a *truthful* unsolicited ARP reply.

    op=2 (is-at) is a reply, not a question.  Most kernels will refresh
    their cache on receipt even though they never sent a who-has — this
    is the same RFC-encouraged behaviour the attack exploits, used here
    to repair the damage.
    """
    return (
        Ether(src=claimed_mac, dst=target_mac)
        / ARP(
            op=2,                  # 2 = is-at  (the reply opcode)
            psrc=claimed_ip,       # "the IP I am announcing"
            hwsrc=claimed_mac,     # "…lives at this MAC"
            pdst=target_ip,        # the host we are telling
            hwdst=target_mac,
        )
    )


def heal(victim_ip: str,
         victim_mac: str,
         gateway_ip: str,
         gateway_mac: str,
         iface: str,
         rounds: int = 5,
         interval: float = 1.0) -> None:
    """
    Send <rounds> waves of corrective ARP replies, <interval>s apart.

    Five waves over five seconds is overkill in a lab but it's cheap
    insurance: a single packet can be dropped by switch buffering or
    ARP-throttling, and during the attack we may have lost the race
    against a stray spoofed packet still in flight.
    """
    # Tell the victim the truth about the gateway.
    fix_victim = build_truth_reply(
        claimed_ip=gateway_ip, claimed_mac=gateway_mac,
        target_ip=victim_ip,   target_mac=victim_mac,
    )
    # Tell the gateway the truth about the victim.
    fix_gateway = build_truth_reply(
        claimed_ip=victim_ip,  claimed_mac=victim_mac,
        target_ip=gateway_ip,  target_mac=gateway_mac,
    )

    for n in range(1, rounds + 1):
        sendp(fix_victim,  iface=iface, verbose=False)
        sendp(fix_gateway, iface=iface, verbose=False)
        colors.ok(f"Healing wave {n}/{rounds} sent on {iface}")
        if n < rounds:
            time.sleep(interval)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Heal ARP caches after the Module 5 MITM attack.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--victim",      default=config.VICTIM_IP)
    p.add_argument("--victim-mac",  default=config.VICTIM_MAC)
    p.add_argument("--gateway",     default=config.GATEWAY_IP)
    p.add_argument("--gateway-mac", default=config.GATEWAY_MAC)
    p.add_argument("--iface",       default=config.DEFAULT_IFACE)
    p.add_argument("--rounds",      type=int,   default=5)
    p.add_argument("--interval",    type=float, default=1.0)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    colors.banner("attacker/cleanup.py", role="ATTACKER / CLEANUP")

    # Safety fuse — refuses to touch anything outside 192.168.56.0/24.
    assert_lab_network(args.victim)
    assert_lab_network(args.gateway)

    colors.step("Re-broadcasting true ARP bindings")
    colors.info(f"victim  : {args.victim}  -> {args.victim_mac}")
    colors.info(f"gateway : {args.gateway} -> {args.gateway_mac}")

    heal(
        victim_ip=args.victim,   victim_mac=args.victim_mac,
        gateway_ip=args.gateway, gateway_mac=args.gateway_mac,
        iface=args.iface,        rounds=args.rounds,
        interval=args.interval,
    )

    colors.ok("Cleanup complete.")
    colors.info("On the victim run:  ip neigh show   (or: arp -n)")
    colors.info("Both gateway and victim should map to their real MACs again.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        colors.warn("Interrupted during cleanup — re-run me to finish.")
        sys.exit(130)
