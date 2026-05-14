#!/usr/bin/env bash
# enable_rdp_windows.sh
# Use this only from Git Bash or WSL on Windows.
# It calls PowerShell to modify Windows RDP settings.
# Run Git Bash as Administrator for best results.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PS1_PATH="$SCRIPT_DIR/enable_rdp_windows.ps1"

if command -v cygpath >/dev/null 2>&1; then
    PS1_WIN_PATH="$(cygpath -w "$PS1_PATH")"
elif command -v wslpath >/dev/null 2>&1; then
    PS1_WIN_PATH="$(wslpath -w "$PS1_PATH")"
else
    echo "Could not convert path for Windows PowerShell."
    echo "Use enable_rdp_windows.ps1 directly from Administrator PowerShell."
    exit 1
fi

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PS1_WIN_PATH"
