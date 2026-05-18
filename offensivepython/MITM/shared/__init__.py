"""
shared/ — common helpers for the Offensive Python (ACO-03) lab.

Everything in here is intentionally dependency-light so both the victim
VM and the attacker VM can import it without pulling in heavy packages.

Modules:
    config         — single source of truth for lab IP/MAC/port values
    network_utils  — ARP lookup, interface helpers, lab-network guard
    colors         — ANSI escape codes + timestamped logging helpers
"""
