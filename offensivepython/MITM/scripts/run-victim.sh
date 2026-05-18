#!/usr/bin/env bash
# scripts/run-victim.sh
# Spin up the three victim services in a single tmux session.
# Usage:  ./scripts/run-victim.sh
set -euo pipefail

SESSION="aco03-victim"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Kill any leftover session so re-runs are clean.
tmux kill-session -t "$SESSION" 2>/dev/null || true

# pane 0: bank server
tmux new-session  -d -s "$SESSION" -n victim \
    "cd '$ROOT' && python3 victim/bank_server.py; exec bash"

# pane 1: browser sim
tmux split-window -h -t "$SESSION" \
    "cd '$ROOT' && python3 victim/browser_sim.py; exec bash"

# pane 2: arp watcher
tmux split-window -v -t "$SESSION" \
    "cd '$ROOT' && python3 victim/arp_watcher.py; exec bash"

tmux select-layout -t "$SESSION" tiled
echo "Attach with:  tmux attach -t $SESSION"
