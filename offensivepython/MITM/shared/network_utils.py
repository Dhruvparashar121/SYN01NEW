"""
shared/network_utils.py
=======================

Helpers that wrap a few common Scapy / socket calls.

Everything destructive in the attacker scripts (sending ARP replies,
forging DNS) ultimately funnels through `assert_lab_network(ip)`, which
hard-refuses any target outside 192.168.56.0/24.  Treat that function
as a fuse: blow it and the script halts before a single packet leaves.

Public functions
----------------
    assert_lab_network(ip)        # safety guard, raises SystemExit
    get_iface_ip(iface)           # what IP is bound on this iface?
    get_iface_mac(iface)          # what MAC is bound on this iface?
    arp_lookup(ip, iface, ...)    # who-has <ip> → MAC, via Scapy
    list_arp_cache()              # parse /proc/net/arp into rows
    is_root()                     # quick euid check
"""

from __future__ import annotations

import ipaddress
import os
import socket
from typing import Optional

# Scapy is only required when these helpers are actually called — we
# do the import lazily where possible so that, for example, the victim's
# inspect_caches.py can still run if scapy isn't installed (it falls
# back to /proc/net/arp).
try:
    from scapy.all import ARP, Ether, srp, get_if_hwaddr, get_if_addr  # type: ignore
    SCAPY_AVAILABLE = True
except Exception:        # pragma: no cover — best-effort import
    SCAPY_AVAILABLE = False

from . import config
from . import colors


# ---------------------------------------------------------------------------
# Safety guard — the most important function in the project
# ---------------------------------------------------------------------------
def assert_lab_network(ip: str) -> None:
    """
    Refuse to operate on any IP outside the hard-coded lab subnet.

    Every attacker script calls this on its --victim / --gateway args
    BEFORE building any packet.  If a student fat-fingers an internal
    corporate IP or, worse, a public address, this halts the script
    with a loud, red, unmistakable error.

    We do not raise a plain ValueError because we want the message to
    survive even if the caller forgets a try/except — a clean SystemExit
    with a coloured banner is harder to ignore.
    """
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        colors.die(f"'{ip}' is not a valid IP address — refusing to run.")

    if addr not in config.LAB_NETWORK:
        colors.die(
            f"'{ip}' is OUTSIDE the lab network "
            f"{config.LAB_NETWORK_CIDR}. This tool only operates on the "
            f"isolated host-only network. Refusing to continue."
        )


# ---------------------------------------------------------------------------
# Interface inspection
# ---------------------------------------------------------------------------
def get_iface_ip(iface: str) -> Optional[str]:
    """Return the IPv4 address bound to <iface>, or None if unknown."""
    if SCAPY_AVAILABLE:
        try:
            return get_if_addr(iface)
        except Exception:
            return None
    # Fallback: ask the OS via a UDP socket trick (no packet is sent).
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def get_iface_mac(iface: str) -> Optional[str]:
    """Return the MAC address of <iface>, or None if unavailable."""
    if SCAPY_AVAILABLE:
        try:
            return get_if_hwaddr(iface)
        except Exception:
            return None
    # /sys is the most portable Linux fallback.
    path = f"/sys/class/net/{iface}/address"
    try:
        with open(path) as fh:
            return fh.read().strip()
    except OSError:
        return None


# ---------------------------------------------------------------------------
# ARP lookup — "who-has 192.168.56.1, tell me"
# ---------------------------------------------------------------------------
def arp_lookup(ip: str,
               iface: str = config.DEFAULT_IFACE,
               timeout: float = 2.0,
               retries: int = 2) -> Optional[str]:
    """
    Send a broadcast ARP request for <ip> on <iface> and return the
    responding MAC, or None if nobody answered.

    This is the same packet `arping` sends.  We do it ourselves because:

      * It works on a VM that doesn't have `arping` installed.
      * Students can read the Scapy call and SEE what an ARP request
        actually looks like — not just trust a black-box CLI tool.

    We use op=1 (who-has) so the OS receiving the request feels obliged
    to reply.  See arp_spoof.py for the partner trick using op=2.
    """
    if not SCAPY_AVAILABLE:
        colors.bad("scapy not installed; cannot ARP-lookup")
        return None

    # Ether(dst="ff:ff:ff:ff:ff:ff")  — broadcast at layer 2 so every
    # host on the segment processes the request.
    # ARP(pdst=ip)                     — "please tell me the MAC for ip"
    request = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=ip)

    for attempt in range(1, retries + 1):
        # srp = send/receive at layer 2.  verbose=False keeps the
        # student terminal clean during a demo.
        answered, _ = srp(request, iface=iface, timeout=timeout,
                          verbose=False)
        if answered:
            # answered is a list of (sent, received) tuples.
            return answered[0][1].hwsrc
        colors.warn(f"ARP attempt {attempt}/{retries} for {ip} got no reply")
    return None


# ---------------------------------------------------------------------------
# Kernel ARP cache — handy on the victim for inspect_caches.py
# ---------------------------------------------------------------------------
def list_arp_cache() -> list[dict[str, str]]:
    """
    Parse /proc/net/arp into a list of {ip, hw_type, flags, mac, mask, iface}.

    /proc/net/arp format (first line is a header):

        IP address       HW type     Flags       HW address        Mask     Device
        192.168.56.1     0x1         0x2         cc:cc:cc:cc:cc:01 *        eth0

    We use this instead of `arp -n` so we don't depend on the `net-tools`
    package being installed (it isn't, by default, on modern Ubuntu).
    """
    rows: list[dict[str, str]] = []
    try:
        with open("/proc/net/arp") as fh:
            lines = fh.readlines()[1:]    # skip header
    except OSError:
        return rows

    for line in lines:
        parts = line.split()
        if len(parts) < 6:
            continue
        rows.append({
            "ip":      parts[0],
            "hw_type": parts[1],
            "flags":   parts[2],
            "mac":     parts[3],
            "mask":    parts[4],
            "iface":   parts[5],
        })
    return rows


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------
def is_root() -> bool:
    """True if the effective UID is 0.  Scapy needs root for raw sockets."""
    return os.geteuid() == 0


def require_root(script_name: str) -> None:
    """Bail out with a friendly message if we are not running as root."""
    if not is_root():
        colors.die(
            f"{script_name} needs root for raw sockets / ARP. "
            f"Re-run with: sudo -E python3 {script_name}"
        )
