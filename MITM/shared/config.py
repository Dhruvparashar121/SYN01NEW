"""
shared/config.py
================

Single source of truth for every IP / MAC / port / hostname used in the
Module 5 lab.  Every other script imports its defaults from here so that
re-IPing the lab (say, moving to 10.20.30.0/24) only requires editing
ONE file.

Lab topology — exactly matches the student handout:

       Victim VM             Attacker VM
       192.168.56.101        192.168.56.102
       aa:aa:aa:aa:aa:01     bb:bb:bb:bb:bb:02
       eth0 ─────vboxnet0──────── eth0
                      │
                  host = "gateway"
                  192.168.56.1
                  cc:cc:cc:cc:cc:01
                  (also runs dnsmasq on udp/53 for DNS spoofing demo)

Why hard-code MACs?
-------------------
In a real attack you would never know the victim's MAC up-front — that
is exactly what the recon step discovers.  For the lab we pre-assign
MACs in VirtualBox so:

  * Students can SEE the right answer before recon runs.
  * Demo failures (a typo, a flaky NIC) are easier to diagnose.
  * The "before / after" ARP table in the HTML demo matches reality.
"""

from __future__ import annotations

import ipaddress
from typing import Final

# ---------------------------------------------------------------------------
# Lab network — everything happens inside this /24, full stop.
# The assert_lab_network() helper in network_utils.py refuses to act on any
# IP outside this range; that is our last-line-of-defence guardrail.
# ---------------------------------------------------------------------------
LAB_NETWORK_CIDR: Final[str] = "192.168.56.0/24"
LAB_NETWORK = ipaddress.ip_network(LAB_NETWORK_CIDR)


# ---------------------------------------------------------------------------
# Hosts
# ---------------------------------------------------------------------------
VICTIM_IP: Final[str]    = "192.168.56.101"
VICTIM_MAC: Final[str]   = "aa:aa:aa:aa:aa:01"

ATTACKER_IP: Final[str]  = "192.168.56.102"
ATTACKER_MAC: Final[str] = "bb:bb:bb:bb:bb:02"

GATEWAY_IP: Final[str]   = "192.168.56.1"
GATEWAY_MAC: Final[str]  = "cc:cc:cc:cc:cc:01"


# ---------------------------------------------------------------------------
# Network interface
# ---------------------------------------------------------------------------
# On Ubuntu Server 22.04 in VirtualBox the host-only adapter shows up as
# "enp0s8" or "eth1"; on Kali it's usually "eth0" or "eth1".  We default
# to "eth0" and let students override with --iface on the CLI.
DEFAULT_IFACE: Final[str] = "eth0"


# ---------------------------------------------------------------------------
# Application-layer services
# ---------------------------------------------------------------------------
# Port 8088 instead of 80 so we don't need root just to bind the bank.
BANK_PORT: Final[int]       = 8088
BANK_BALANCE_USD: Final[int] = 1_000_000
BANK_GREETING: Final[str]   = (
    f"Welcome to ACO Bank. Your balance: ${BANK_BALANCE_USD:,}."
)

# Hostnames the browser_sim loop will resolve, and that dns_spoof targets.
# We use ".lab" because it is not a real TLD and cannot leak to the
# Internet even if a misconfigured VM has a default route.
TARGET_HOSTNAMES: Final[tuple[str, ...]] = (
    "bank.lab",
    "mail.lab",
    "intranet.lab",
)

# When DNS is spoofed, every query above answers with this IP — the
# attacker's own address, so the victim's next HTTP request lands on us.
DNS_SPOOF_ANSWER_IP: Final[str] = ATTACKER_IP


# ---------------------------------------------------------------------------
# Timing knobs (seconds) — exposed here so the instructor can speed-up
# or slow-down the demo without editing the scripts.
# ---------------------------------------------------------------------------
ARP_POISON_INTERVAL_SEC: Final[float] = 2.0
BROWSER_SIM_INTERVAL_SEC: Final[float] = 5.0
ARP_WATCHER_POLL_SEC: Final[float] = 1.0
DNS_TTL_SEC: Final[int] = 60   # short TTL keeps the demo lively
