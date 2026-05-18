# Module 5 Classroom Script — what to type in each tmux pane

This is the *instructor's* run-of-show for the live demo. It assumes:

* Both VMs are powered on, with the project cloned to `~/offensive-python-aco03`.
* The host-only adapter is up on both VMs (`ip a` shows 192.168.56.10x).
* `sudo sysctl -w net.ipv4.ip_forward=1` has already been run on the attacker VM.

We use **tmux** so all logs are visible side-by-side on the projector.

---

## Pane layout

Create on each VM:

```bash
tmux new -s aco03         # start a session
# inside tmux:
Ctrl-b "                  # split horizontally
Ctrl-b %                  # split the bottom pane vertically
Ctrl-b q  then number     # jump between panes
```

Recommended layout:

```
+------------------- VICTIM VM (192.168.56.101) -------------------+
| pane V1  bank_server.py           pane V2  browser_sim.py        |
|                                                                  |
| pane V3  arp_watcher.py           pane V4  free shell            |
+------------------------------------------------------------------+

+------------------ ATTACKER VM (192.168.56.102) ------------------+
| pane A1  recon.py / arp_spoof.py                                 |
| pane A2  dns_spoof.py                                            |
| pane A3  http_mitm.py                                            |
| pane A4  free shell (for cleanup.py)                             |
+------------------------------------------------------------------+
```

`cd ~/offensive-python-aco03` in every pane before you start.

---

## Act 1 — Baseline (no attack)

**V4 (victim shell):**

```bash
python3 victim/inspect_caches.py
```

Talking points:
- Default route points at `192.168.56.1` (the host machine, our "gateway").
- ARP cache shows the gateway at its real MAC (`cc:cc:cc:cc:cc:01`).
- `bank.lab` resolves to whatever the host's `dnsmasq` returned — typically the victim itself in this lab.

**V1:**

```bash
python3 victim/bank_server.py
```

You should be able to `curl http://192.168.56.101:8088/` from V4 and see the $1,000,000 greeting.

**V2:**

```bash
python3 victim/browser_sim.py
```

Every 5 seconds it resolves a `.lab` name and tries an HTTP GET. Leave this running for the rest of the demo — it is the traffic generator.

**V3:**

```bash
python3 victim/arp_watcher.py
```

Prints the initial cache, then sits silently until a change happens. *This is the pane the camera should focus on during Act 3.*

---

## Act 2 — Recon

**A1 (attacker pane):**

```bash
sudo python3 attacker/recon.py
```

Discuss with the class:
- The script sends a layer-2 broadcast (`ff:ff:ff:ff:ff:ff`) ARP request.
- Every host on the segment processes it; only the owner of the IP replies.
- We see `aa:...:01` for the victim and `cc:...:01` for the gateway — matches `inspect_caches.py` on the victim.

---

## Act 3 — ARP Poisoning  ← *the headline moment*

**A1:**

```bash
sudo python3 attacker/arp_spoof.py
```

Watch what happens on **V3** within a couple of seconds:

```
CHANGED 192.168.56.1     cc:cc:cc:cc:cc:01 -> bb:bb:bb:bb:bb:02 on eth0 *** SUSPICIOUS ***
```

Talking points:
- The attacker did not modify the gateway; it modified the *victim's belief* about the gateway.
- The "***SUSPICIOUS***" tag fires because the same MAC (`bb:...:02`) now claims two IPs in the cache.
- The browser sim in V2 keeps working because the attacker is forwarding packets (`ip_forward=1`). **This silence is exactly why ARP poisoning is dangerous.**

---

## Act 4 — DNS Spoofing

**A2:**

```bash
sudo python3 attacker/dns_spoof.py
```

Within one browser-sim cycle (5s) you should see on A2:

```
[STEP] Sniffed query for 'bank.lab' (id=12345)
[ OK ] Forged A bank.lab -> 192.168.56.102 (ttl=60)
```

And on V2:

```
DNS  bank.lab  ->  192.168.56.102
```

That is the smoking gun: `bank.lab` now points at the attacker's IP. Any subsequent HTTP request from the victim lands on us.

---

## Act 5 — HTTP MITM

**A3:**

```bash
sudo python3 attacker/http_mitm.py
```

Now V2's browser sim shows the bank greeting being requested over a TCP connection that physically transits the attacker VM. Watch A3:

```
[INFO] REQ   192.168.56.101 -> bank:8088  GET / HTTP/1.1 ...
[INFO] RESP  bank:8088 -> 192.168.56.101  HTTP/1.0 200 OK ...
[STEP] WOULD REWRITE balance $1,000,000 -> $0.01  (passive demo — no packet modified)
```

Discuss with the class:
- We could rewrite the response body to change the balance, redirect to a phishing page, or inject JavaScript.
- This is exactly what HTTPS prevents — the TLS handshake fails if we try to terminate it without the bank's private key.

---

## Act 6 — Cleanup

**A1, A2, A3:** Ctrl-C each script in turn.

`arp_spoof.py`'s atexit handler will print:

```
[STEP] Cleanup: re-broadcasting true ARP bindings
[ OK ] Healing wave 1/5
...
```

Within 2–3 seconds you should see on V3 (arp_watcher):

```
CHANGED 192.168.56.1   bb:bb:bb:bb:bb:02 -> cc:cc:cc:cc:cc:01 on eth0
```

If for any reason `arp_spoof.py` crashed without healing, run from **A4**:

```bash
sudo python3 attacker/cleanup.py
```

Always finish the demo by re-running `victim/inspect_caches.py` on V4 to show the cache is back to its pre-attack state.

---

## One-shot mode (smoke test, not for class)

If you just want to verify the whole chain works without managing four panes:

```bash
sudo python3 attacker/run_attack.py
```

That runs `arp_spoof + dns_spoof + http_mitm` in one process. Ctrl-C once to stop and heal. Useful before the class to make sure the lab is wired correctly.

---

## Makefile shortcuts

From the project root:

| Command            | What it runs                                             |
|--------------------|----------------------------------------------------------|
| `make victim`      | Starts bank_server, browser_sim, arp_watcher in tmux     |
| `make attacker`    | Starts recon → pauses → arp_spoof + dns_spoof + http_mitm |
| `make cleanup`     | Runs `attacker/cleanup.py`                                |
| `make inspect`     | Runs `victim/inspect_caches.py`                           |

(See `Makefile` for exact commands.)
