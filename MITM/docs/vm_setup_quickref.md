# VM Setup Quick-Reference (Kali / Ubuntu)

Your students already have working Kali (or Ubuntu) VMs. This page is the *short list* of settings to verify or apply before Module 5. Detailed step-by-step screenshots live in `Module5_Lab_Setup_Guide.docx`.

## 1. VirtualBox network adapter (both VMs)

In VirtualBox Manager → VM → **Settings → Network**:

| Field        | Value                              |
|--------------|------------------------------------|
| Adapter 1    | **Host-only Adapter**              |
| Name         | `vboxnet0` (or whatever your host-only network is called) |
| Promiscuous Mode | **Allow All**                  |
| MAC Address  | Victim: `AAAAAAAAAA01` &nbsp;&nbsp; Attacker: `BBBBBBBBBB02` |

> **Why "Allow All" promiscuous?** Scapy's `sniff()` on the attacker VM needs to see traffic addressed to other MACs once we've poisoned the ARP tables. Without this flag VirtualBox silently filters those frames at the virtual switch.

> **Why pinned MACs?** Predictable MACs make the before/after slides match reality and let the demo HTML widget (`ARP_DNS_MITM_Demo.html`) line up with what students see on the wire.

Disable any **Adapter 2** that might be set to NAT or Bridged — you don't want the VMs talking to the real internet during the attack.

## 2. Verify networking inside each VM

```bash
ip -o link show                  # find your interface name
ip a                             # confirm IPs are 192.168.56.101 / .102
ping -c1 192.168.56.1            # gateway (host) reachable?
ping -c1 192.168.56.102          # from victim → attacker (and vice versa)
```

If the interface is **not** `eth0` (Ubuntu often calls it `enp0s8`), either:
- edit `shared/config.py` and change `DEFAULT_IFACE`, or
- pass `--iface enp0s8` on every script's command line.

## 3. Pin static IPs

### Kali / any Debian (NetworkManager)

```bash
sudo nmcli con mod "Wired connection 1" \
    ipv4.method manual \
    ipv4.addresses 192.168.56.101/24 \
    ipv4.gateway 192.168.56.1
sudo nmcli con up "Wired connection 1"
```

(Use `.102` on the attacker VM.)

### Ubuntu Server (netplan)

`/etc/netplan/00-lab.yaml`:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.56.101/24]
      routes:
        - to: default
          via: 192.168.56.1
      nameservers:
        addresses: [192.168.56.1]
```

Then: `sudo netplan apply`.

## 4. Attacker-only — enable IP forwarding

The single most important attacker-side setting. Without this, every poisoned packet hits a black hole and the victim notices.

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

Make it permanent (optional — only do this on a lab VM you'll wipe after the course):

```bash
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-aco03.conf
```

Confirm: `cat /proc/sys/net/ipv4/ip_forward` should print `1`.

## 5. Install Python deps (both VMs)

Kali 2024+ and Ubuntu 23+ ship Python 3.11 with PEP 668 ("externally managed") protection. Either use `--break-system-packages` (fine on a throw-away lab VM) or a venv.

```bash
sudo apt update
sudo apt install -y python3-pip tmux
pip3 install --break-system-packages -r requirements.txt
```

Verify Scapy works as root: `sudo python3 -c "from scapy.all import ARP; print('OK')"`.

## 6. Host machine — DNS for `.lab` names (optional but nicer)

If you want `bank.lab` / `mail.lab` / `intranet.lab` to resolve to *something* in the un-spoofed state, run dnsmasq on the host:

```bash
# /etc/dnsmasq.d/aco03.conf  (on the macOS or Linux host)
listen-address=192.168.56.1
no-resolv
address=/bank.lab/192.168.56.101
address=/mail.lab/192.168.56.101
address=/intranet.lab/192.168.56.101
```

Restart dnsmasq, then on each VM make sure `/etc/resolv.conf` points to `192.168.56.1`.

If you skip this step the unspoofed lookups will just fail with `Name or service not known` — also a fine teaching moment ("look, here is the legitimate baseline failure; now watch what the spoofer changes").

## 7. Last-minute sanity checklist

Before Act 1 of the demo, on each VM:

- [ ] `ip a | grep 192.168.56` shows the right IP
- [ ] `ip neigh show | grep 192.168.56.1` shows the gateway's *real* MAC
- [ ] `python3 -c "import scapy; import requests; print('deps ok')"`
- [ ] Attacker only: `cat /proc/sys/net/ipv4/ip_forward` prints `1`
- [ ] Attacker only: `sudo python3 attacker/cleanup.py` runs without error (proves Scapy + raw sockets work end-to-end)

If all five tick, you're ready to run the classroom script.
