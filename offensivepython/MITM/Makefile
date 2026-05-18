# Offensive Python (ACO-03) — Module 5
# Convenience targets so the instructor types `make foo` instead of
# long python3 invocations during the live demo.
#
# Usage examples:
#     make help          # list targets
#     make victim        # start the three victim services in tmux
#     make attacker      # recon, pause, then launch the attack chain in tmux
#     make cleanup       # heal ARP caches if something crashed
#     make inspect       # one-shot snapshot of the victim's networking
#     make install       # pip install -r requirements.txt
#     make ipforward     # turn on kernel forwarding (attacker VM only)
#     make smoke         # one-process attack run; Ctrl-C heals

PY    ?= python3
PIP   ?= pip3
SUDO  ?= sudo
ROOT  := $(shell pwd)

.PHONY: help install ipforward victim attacker cleanup inspect smoke compile

help:
	@echo "Targets:"
	@echo "  install     pip-install requirements.txt"
	@echo "  ipforward   sysctl net.ipv4.ip_forward=1 (attacker VM)"
	@echo "  victim      tmux: bank_server + browser_sim + arp_watcher"
	@echo "  attacker    recon -> tmux: arp_spoof + dns_spoof + http_mitm"
	@echo "  cleanup     standalone heal of ARP caches"
	@echo "  inspect     one-shot networking snapshot on victim"
	@echo "  smoke       single-process run of the full attack chain"
	@echo "  compile     py_compile every script (syntax check)"

install:
	$(PIP) install --break-system-packages -r requirements.txt

ipforward:
	$(SUDO) sysctl -w net.ipv4.ip_forward=1

victim:
	bash $(ROOT)/scripts/run-victim.sh

attacker:
	$(SUDO) bash $(ROOT)/scripts/run-attacker.sh

cleanup:
	$(SUDO) $(PY) $(ROOT)/attacker/cleanup.py

inspect:
	$(PY) $(ROOT)/victim/inspect_caches.py

smoke:
	$(SUDO) $(PY) $(ROOT)/attacker/run_attack.py

compile:
	$(PY) -m compileall -q shared victim attacker
	@echo "All scripts compile cleanly."
