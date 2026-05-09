const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const configMeta = [
  {
    "title": "Client wg2.conf",
    "tag": "STEP 1",
    "visual": "assets/config-step1-start.svg",
    "desc": "Copy the Client WireGuard configuration extracted from the uploaded DOCX.",
    "fileName": "client-wg2.conf",
    "cfg": `# CLIENT - /etc/wireguard/wg2.conf
[Interface]
Address = 20.20.20.1/24
PrivateKey = MLp4+2/2tfFzwxi9eum5S1OvtbuqHyJIyIgz6ybWGUU=
ListenPort = 51820
DNS = 8.8.8.8, 1.1.1.1
PreUp = sysctl -w net.ipv4.ip_forward=1

[Peer]
PublicKey = FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
Endpoint = 10.0.10.26:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25`,
    "cmd": `# STEP 1 - Client WireGuard wg2.conf from uploaded DOCX
sudo mkdir -p /etc/wireguard
sudo tee /etc/wireguard/wg2.conf >/dev/null <<'EOF'
[Interface]
Address = 20.20.20.1/24
PrivateKey = MLp4+2/2tfFzwxi9eum5S1OvtbuqHyJIyIgz6ybWGUU=
ListenPort = 51820
DNS = 8.8.8.8, 1.1.1.1
PreUp = sysctl -w net.ipv4.ip_forward=1

[Peer]
PublicKey = FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
Endpoint = 10.0.10.26:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF
sudo chmod 600 /etc/wireguard/wg2.conf
sudo cat /etc/wireguard/wg2.conf`
  },
  {
    "title": "VPS-1 wg2.conf",
    "tag": "STEP 2",
    "visual": "assets/config-step4-vps1.svg",
    "desc": "Configure VPS-1 as the first relay with forwarding toward VPS-2.",
    "fileName": "vps1-wg2.conf",
    "cfg": `# VPS-I - /etc/wireguard/wg2.conf
[Interface]
Address = 20.20.20.2/24
PrivateKey = 6Mm3OkTQoCekHlI24DYrW9P8NKg9L8mRvWSerferZH4=
ListenPort = 51820
Table = 123
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -A FORWARD -i wg2 -j ACCEPT
PostUp = iptables -A FORWARD -o wg2 -j ACCEPT
#PreUp = ip rule add iif wg2 table 123 priority 456
#PreUp = iptables -t nat -A POSTROUTING -o wg2 -j MASQUERADE
#PostDown = ip rule del iif wg2 table 123 priority 456

[Peer]
PublicKey = yAq35PEekG2imnqU3r2IR2urMeJStda4b6Wh2CYbxCY=
AllowedIPs = 20.20.20.1/32
PersistentKeepalive = 25

[Peer]
PublicKey = bH1IsQlTt1Je9kAgd7QlxBzE+KeUkFNDvmzB6UDlPko=
AllowedIPs = 0.0.0.0/0
Endpoint = 10.0.20.102:51820
PersistentKeepalive = 25`,
    "cmd": `# STEP 2 - VPS-1 WireGuard wg2.conf from uploaded DOCX
sudo mkdir -p /etc/wireguard
sudo tee /etc/wireguard/wg2.conf >/dev/null <<'EOF'
[Interface]
Address = 20.20.20.2/24
PrivateKey = 6Mm3OkTQoCekHlI24DYrW9P8NKg9L8mRvWSerferZH4=
ListenPort = 51820
Table = 123
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -A FORWARD -i wg2 -j ACCEPT
PostUp = iptables -A FORWARD -o wg2 -j ACCEPT
#PreUp = ip rule add iif wg2 table 123 priority 456
#PreUp = iptables -t nat -A POSTROUTING -o wg2 -j MASQUERADE
#PostDown = ip rule del iif wg2 table 123 priority 456

[Peer]
PublicKey = yAq35PEekG2imnqU3r2IR2urMeJStda4b6Wh2CYbxCY=
AllowedIPs = 20.20.20.1/32
PersistentKeepalive = 25

[Peer]
PublicKey = bH1IsQlTt1Je9kAgd7QlxBzE+KeUkFNDvmzB6UDlPko=
AllowedIPs = 0.0.0.0/0
Endpoint = 10.0.20.102:51820
PersistentKeepalive = 25
EOF
sudo chmod 600 /etc/wireguard/wg2.conf
sudo cat /etc/wireguard/wg2.conf`
  },
  {
    "title": "VPS-2 wg2.conf",
    "tag": "STEP 3",
    "visual": "assets/config-step5-vps2.svg",
    "desc": "Configure VPS-2 as the second relay and NAT/forwarding stage.",
    "fileName": "vps2-wg2.conf",
    "cfg": `# VPS-II - /etc/wireguard/wg2.conf
[Interface]
Address = 20.20.20.3/24
PrivateKey = 2J3YgghlO7jERE7HNqw2ugVRlmL0LVSWH+IGTBedxU0=
ListenPort = 51820
PreUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -A FORWARD -i wg2 -j ACCEPT
PostDown = iptables -t nat -A POSTROUTING -o ens18 -j MASQUERADE
#PostUp = iptables -A FORWARD -i wg2 -j ACCEPT; iptables -t nat -A POSTROUTING -o ens18 -j MASQUERADE
#PostDown = iptables -D FORWARD -i wg2 -j ACCEPT; iptables -t nat -D POSTROUTING -o ens18 -j MASQUERADE

[peer]
PublicKey = FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
AllowedIPs = 20.20.20.2/32
persistentKeepalive = 25`,
    "cmd": `# STEP 3 - VPS-2 WireGuard wg2.conf from uploaded DOCX
sudo mkdir -p /etc/wireguard
sudo tee /etc/wireguard/wg2.conf >/dev/null <<'EOF'
[Interface]
Address = 20.20.20.3/24
PrivateKey = 2J3YgghlO7jERE7HNqw2ugVRlmL0LVSWH+IGTBedxU0=
ListenPort = 51820
PreUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -A FORWARD -i wg2 -j ACCEPT
PostDown = iptables -t nat -A POSTROUTING -o ens18 -j MASQUERADE
#PostUp = iptables -A FORWARD -i wg2 -j ACCEPT; iptables -t nat -A POSTROUTING -o ens18 -j MASQUERADE
#PostDown = iptables -D FORWARD -i wg2 -j ACCEPT; iptables -t nat -D POSTROUTING -o ens18 -j MASQUERADE

[peer]
PublicKey = FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
AllowedIPs = 20.20.20.2/32
persistentKeepalive = 25
EOF
sudo chmod 600 /etc/wireguard/wg2.conf
sudo cat /etc/wireguard/wg2.conf`
  },
  {
    "title": "Tor / Proxychains SSH",
    "tag": "STEP 4",
    "visual": "assets/config-step6-tor.svg",
    "desc": "Enable OpenSSH Server on the Windows/Tor-side host and connect using SSH.",
    "fileName": "tor-proxychains-ssh.txt",
    "cfg": `# TOR / PROXYCHAINS - SSH enablement on 10.0.40.100
# Run the following commands on Windows PowerShell as Administrator.
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

# SSH format after service is enabled
ssh user@IP`,
    "cmd": `# STEP 4 - Tor / Proxychains SSH preparation from uploaded DOCX
# Run these on Windows PowerShell as Administrator on 10.0.40.100
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

# SSH format after service is enabled
ssh user@IP`,
    "tor": true
  },
  {
    "title": "Key Verification",
    "tag": "STEP 5",
    "visual": "assets/config-step2-client-ip.svg",
    "desc": "Verify the WireGuard private and public keys listed in the uploaded DOCX.",
    "fileName": "wireguard-key-checks.txt",
    "cfg": `# WIREGUARD KEY VERIFICATION OUTPUTS
privatekey_1 = MLp4+2/2tfFzwxi9eum5S1OvtbuqHyJIyIgz6ybWGUU=
privatekey_2 = 6Mm3OkTQoCekHlI24DYrW9P8NKg9L8mRvWSerferZH4=
privatekey_3 = 2J3YgghlO7jERE7HNqw2ugVRlmL0LVSWH+IGTBedxU0=

publickey_1 = yAq35PEekG2imnqU3r2IR2urMeJStda4b6Wh2CYbxCY=
publickey_2 = FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
publickey_3 = bH1IsQlTt1Je9kAgd7QlxBzE+KeUkFNDvmzB6UDlPko=`,
    "cmd": `# STEP 5 - Verify generated WireGuard keys from uploaded DOCX
cd /home/gcon/gu
cat privatekey_1
cat privatekey_2
cat privatekey_3
cat publickey_1
cat publickey_2
cat publickey_3`
  },
  {
    "title": "Traceroute Test",
    "tag": "STEP 6",
    "visual": "assets/config-step3-firewall.svg",
    "desc": `Validate the route from the client using the traceroute output provided in the DOCX.`,
    "fileName": "client-traceroute-validation.txt",
    "cfg": `# CLIENT TRACEROUTE VALIDATION
traceroute 8.8.8.8

# Expected important lab hops from the document:
1  20.20.20.2 (20.20.20.2)
2  20.20.20.3 (20.20.20.3)
3  10.0.20.1 (10.0.20.1)
15 dns.google (8.8.8.8)`,
    "cmd": `# STEP 6 - Client traceroute validation from uploaded DOCX
traceroute 8.8.8.8

# First lab hops expected:
# 1 20.20.20.2
# 2 20.20.20.3
# 3 10.0.20.1
# Final destination: dns.google / 8.8.8.8`
  }
];

const hints = [
  "Step 1: Paste the Client wg2.conf on the Client/Kali machine and verify it with cat /etc/wireguard/wg2.conf.",
  "Step 2: Paste the VPS-1 wg2.conf on VPS-1 and confirm forwarding plus the two peer blocks.",
  "Step 3: Paste the VPS-2 wg2.conf on VPS-2 and confirm the peer for 20.20.20.2/32.",
  "Step 4: On the Tor/IT-side Windows host 10.0.40.100, enable OpenSSH Server and use ssh user@IP.",
  "Step 5: Verify the WireGuard key files using the cat commands shown in the DOCX.",
  "Step 6: Run traceroute 8.8.8.8 from the client and compare the first hops with 20.20.20.2, 20.20.20.3, and 10.0.20.1."
];


const testingMeta = [
  {
    title: 'Client wg2.conf test',
    tag: 'TEST 1',
    desc: 'Apply Client WireGuard config and verify the first tunnel leg to VPS-1.',
    hint: 'Run on Client/Kali. Blue Team should see WireGuard UDP handshake to VPS-1 and ICMP inside the tunnel.',
    kaliInput: `${configMeta[0].cmd}

# Bring up and validate Client tunnel
sudo wg-quick up wg2
ip addr show wg2
sudo wg show wg2
ping -c 4 20.20.20.2`,
    packets: [
      { src: '20.20.20.1', dst: '10.0.10.26:51820', proto: 'UDP', info: 'WireGuard handshake initiation from Client to VPS-1 endpoint' },
      { src: '10.0.10.26:51820', dst: '20.20.20.1', proto: 'UDP', info: 'WireGuard handshake response from VPS-1' },
      { src: '20.20.20.1', dst: '20.20.20.2', proto: 'ICMP', info: 'Tunnel test: Echo request from Client wg2 to VPS-1 wg2' },
      { src: '20.20.20.2', dst: '20.20.20.1', proto: 'ICMP', info: 'Tunnel test: Echo reply from VPS-1 wg2 to Client wg2' }
    ]
  },
  {
    title: 'VPS-1 relay test',
    tag: 'TEST 2',
    desc: 'Apply VPS-1 config and confirm forwarding between Client and VPS-2.',
    hint: 'Run on VPS-1. Blue Team should see Client peer traffic enter VPS-1 and forwarded traffic toward VPS-2.',
    kaliInput: `${configMeta[1].cmd}

# Start relay and verify forwarding state
sudo wg-quick up wg2
sudo sysctl net.ipv4.ip_forward
sudo iptables -L FORWARD -n -v
sudo wg show wg2
ping -c 4 20.20.20.3`,
    packets: [
      { src: '20.20.20.1', dst: '20.20.20.2', proto: 'VPN', info: 'Client tunnel packet accepted by VPS-1 peer block' },
      { src: '20.20.20.2', dst: '20.20.20.3', proto: 'VPN', info: 'VPS-1 forwards packet toward VPS-2 over wg2' },
      { src: '10.0.10.26:51820', dst: '10.0.20.102:51820', proto: 'UDP', info: 'Outer WireGuard relay flow from VPS-1 endpoint to VPS-2 endpoint' },
      { src: '20.20.20.3', dst: '20.20.20.2', proto: 'ICMP', info: 'VPS-2 reply confirms relay continuity through VPS-1' }
    ]
  },
  {
    title: 'VPS-2 relay / NAT test',
    tag: 'TEST 3',
    desc: 'Apply VPS-2 config and validate the second relay plus outbound path.',
    hint: 'Run on VPS-2. Blue Team should see packets arriving from VPS-1 and then leaving toward the next gateway.',
    kaliInput: `${configMeta[2].cmd}

# Start VPS-2 relay and validate path
sudo wg-quick up wg2
sudo wg show wg2
sudo iptables -t nat -L POSTROUTING -n -v
ping -c 4 10.0.20.1
traceroute -n 8.8.8.8`,
    packets: [
      { src: '20.20.20.2', dst: '20.20.20.3', proto: 'VPN', info: 'VPS-1 to VPS-2 inner tunnel traffic visible on wg2' },
      { src: '20.20.20.3', dst: '10.0.20.1', proto: 'ICMP', info: 'VPS-2 validates next-hop gateway reachability' },
      { src: '10.0.20.102:51820', dst: '10.0.10.26:51820', proto: 'UDP', info: 'WireGuard keepalive / encrypted relay traffic between VPS-2 and VPS-1' },
      { src: '20.20.20.3', dst: '8.8.8.8', proto: 'TRACE', info: 'Traceroute probe leaves second relay toward external DNS target' }
    ]
  },
  {
    title: 'Tor / Proxychains SSH test',
    tag: 'TEST 4',
    desc: 'Enable SSH service on the Tor/IT-side host and verify connection readiness.',
    hint: 'Run OpenSSH commands on Windows PowerShell as Administrator, then verify SSH from Kali using ssh user@IP.',
    kaliInput: `${configMeta[3].cmd}

# Kali-side verification after Windows OpenSSH is enabled
ssh user@10.0.40.100
nc -vz 10.0.40.100 22
proxychains curl http://10.0.40.100`,
    packets: [
      { src: '10.0.40.102', dst: '10.0.40.100:22', proto: 'TCP', info: 'SSH SYN from Tor-side/Kali verification path to Windows OpenSSH service' },
      { src: '10.0.40.100:22', dst: '10.0.40.102', proto: 'TCP', info: 'SSH SYN-ACK confirms OpenSSH is reachable' },
      { src: '10.0.40.102', dst: '10.0.40.100', proto: 'TOR', info: 'Proxychains/Tor-stage HTTP test; destination sees Tor-side source' },
      { src: '10.0.40.100', dst: '10.0.40.102', proto: 'TCP', info: 'Windows host response to Tor-stage request' }
    ]
  },
  {
    title: 'WireGuard key verification test',
    tag: 'TEST 5',
    desc: 'Verify the private/public key files from the uploaded Kali code document.',
    hint: 'Run locally on the key-generation/Kali machine. Blue Team should normally see no lab network packet for local cat commands.',
    kaliInput: `${configMeta[4].cmd}

# Optional local integrity checks
ls -l privatekey_* publickey_*
sha256sum privatekey_* publickey_*`,
    packets: [
      { src: 'Kali local filesystem', dst: 'Kali terminal', proto: 'LOCAL', info: 'cat privatekey_1/privatekey_2/privatekey_3: no network packet expected' },
      { src: 'Kali local filesystem', dst: 'Kali terminal', proto: 'LOCAL', info: 'cat publickey_1/publickey_2/publickey_3: no network packet expected' },
      { src: 'Background network', dst: 'Broadcast / gateway', proto: 'ARP', info: 'Only normal background ARP/DNS may appear during local file verification' }
    ]
  },
  {
    title: 'End-to-end traceroute validation',
    tag: 'TEST 6',
    desc: 'Run client traceroute and validate the first hops from the document.',
    hint: 'Run from Client/Kali. Blue Team should see traceroute probes walking through VPS-1, VPS-2, gateway, and final DNS target.',
    kaliInput: `${configMeta[5].cmd}

# Capture-friendly validation
traceroute -n 8.8.8.8
ping -c 4 8.8.8.8`,
    packets: [
      { src: '20.20.20.1', dst: '20.20.20.2', proto: 'TRACE', info: 'Hop 1: traceroute reaches VPS-1 wg2 address 20.20.20.2' },
      { src: '20.20.20.1', dst: '20.20.20.3', proto: 'TRACE', info: 'Hop 2: traceroute reaches VPS-2 wg2 address 20.20.20.3' },
      { src: '20.20.20.1', dst: '10.0.20.1', proto: 'TRACE', info: 'Hop 3: traceroute reaches gateway 10.0.20.1' },
      { src: '20.20.20.1', dst: '8.8.8.8', proto: 'ICMP', info: 'Final validation: dns.google reachable as per document output' }
    ]
  }
];

const allConfigText = configMeta.map(x => `# ${x.title}
# File: ${x.fileName || 'configuration.txt'}
${x.cfg}`).join('\n\n');

function renderConfigOverview() {
  return `<div class="article"><h3>Configuration Files Overview</h3><p>The following snippets and command blocks were extracted from the uploaded Kali codes document and are used in the Configuration module.</p><div class="config-file-list">${configMeta.map(item => `<div class="config-file-box"><h4>${escapeHtml(item.fileName || item.title)}</h4><p>${escapeHtml(item.title)}</p><h5>Configuration / Extracted Text</h5><pre>${escapeHtml(item.cfg)}</pre><h5>Commands for This Step</h5><pre>${escapeHtml(item.cmd)}</pre></div>`).join('')}<div class="config-file-box"><h4>all-configs.conf</h4><p>Combined lab configuration summary</p><pre>${escapeHtml(allConfigText)}</pre></div></div></div>`;
}

const topics = {
  what: "<div class=\"article\"><img class=\"ai-visual\" src=\"assets/what-framework.svg\" alt=\"AI generated anonymity framework visual\"><h3>What is an Anonymity Framework?</h3><p><strong>Basic:</strong> An anonymity framework is a controlled routing model that hides the direct source identity of a client by passing traffic through multiple privacy layers.</p><p><strong>Intermediate:</strong> Instead of allowing a destination host to see the original client directly, traffic is represented as moving through a firewall, relay servers, VPN-like hops, and a Tor-like exit layer.</p><p><strong>Advanced:</strong> In a professional training lab, this framework teaches routing separation, traffic masking, visibility gaps, packet monitoring, source attribution challenges, DNS leakage awareness, and defensive log correlation.</p><div class=\"article-grid\"><div class=\"info-tile\"><h4>Client</h4><p>Origin workstation used by the tester in the isolated lab.</p></div><div class=\"info-tile\"><h4>Relays</h4><p>Intermediate nodes that visually change the observable source path.</p></div><div class=\"info-tile\"><h4>Blue Team</h4><p>Observer role that monitors traffic changes in Wireshark-style logs.</p></div></div></div>",
  importance: "<div class=\"article\"><img class=\"ai-visual\" src=\"assets/importance.svg\" alt=\"AI generated importance visual\"><h3>Importance of the Framework</h3><p><strong>For ethical hackers:</strong> It teaches how network paths, proxy layers, VPN relays, and Tor-like routing affect source visibility during authorized testing.</p><p><strong>For defenders:</strong> It shows how traffic can look different at each monitoring point, and why packet evidence must be correlated with firewall, endpoint, and gateway logs.</p><p><strong>For students:</strong> It connects theory with visual demonstration: normal traffic, VPN-routed traffic, multi-hop relay traffic, and traceroute analysis can be compared side by side.</p><p><strong>Advanced lesson:</strong> IP masking alone does not guarantee anonymity. Browser fingerprints, timing analysis, DNS leaks, endpoint logs, authentication events, and misconfigured routes can still reveal identity.</p></div>",
  configs: renderConfigOverview(),
  setup: "<div class=\"article\"><img class=\"ai-visual\" src=\"assets/detailed-setup.svg\" alt=\"AI generated detailed setup visual\"><h3>Detailed Setup Steps</h3><ol><li><strong>Client:</strong> Create <code>/etc/wireguard/wg2.conf</code> with address <code>20.20.20.1/24</code> and peer endpoint <code>10.0.10.26:51820</code>.</li><li><strong>VPS-1:</strong> Create <code>/etc/wireguard/wg2.conf</code> with address <code>20.20.20.2/24</code>, forwarding enabled, and peers for Client and VPS-2.</li><li><strong>VPS-2:</strong> Create <code>/etc/wireguard/wg2.conf</code> with address <code>20.20.20.3/24</code> and the peer route to <code>20.20.20.2/32</code>.</li><li><strong>Tor / Proxychains stage:</strong> Enable OpenSSH Server on <code>10.0.40.100</code> using the PowerShell commands from the DOCX.</li><li><strong>Validation:</strong> Verify keys with <code>cat</code> commands, then run <code>traceroute 8.8.8.8</code> from the client.</li></ol><p>These entries are extracted from the uploaded Kali codes document and formatted for guided copy/paste practice.</p></div>"
};

let currentStep = 0;
let currentIP = '10.0.30.10';
let packetNo = 0;
const torIPs = ['10.0.40.102', '10.0.40.106', '10.0.40.110'];
let torIndex = 0;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setTopic(topic) {
  $$('.topic-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.topic === topic));
  $('#topicContent').innerHTML = topic === 'diagram' ? $('#diagramTemplate').innerHTML : topics[topic];
}

function renderConfigCards() {
  const wrap = $('#configStepCards');
  wrap.innerHTML = configMeta.map((item, index) => `
    <div class="config-card ${item.tor ? 'tor' : ''} ${index === currentStep ? 'active' : ''}" data-step="${index}">
      <span class="tag">${item.tag}</span>
      <h4>${item.title}</h4>
      <p>${item.desc}</p>
    </div>`).join('');
  $$('.config-card').forEach(card => card.addEventListener('click', () => loadConfigStep(Number(card.dataset.step))));
}

function loadConfigStep(stepIndex) {
  currentStep = stepIndex;
  renderConfigCards();
  const meta = configMeta[stepIndex];
  $('#stepNumber').textContent = `Step ${stepIndex + 1}`;
  $('#hintText').textContent = hints[stepIndex];
  $('#configEditor').value = meta.cfg;
  $('#commandEditor').value = meta.cmd;
  $('#progressBar').style.width = `${((stepIndex + 1) / configMeta.length) * 100}%`;
}

function terminalLine(target, text) {
  const row = document.createElement('div');
  row.innerHTML = `<span class="prompt">root@kali</span>:~$ ${escapeHtml(text)}`;
  target.appendChild(row);
  target.scrollTop = target.scrollHeight;
}

function systemLine(target, text, cls = 'ok') {
  const row = document.createElement('div');
  row.className = cls;
  row.textContent = text;
  target.appendChild(row);
  target.scrollTop = target.scrollHeight;
}

function applyConfig() {
  terminalLine($('#configTerminal'), `apply-config --step ${currentStep + 1}`);
  systemLine($('#configTerminal'), `Loaded configuration for ${configMeta[currentStep].title}`, 'ok');
  systemLine($('#configTerminal'), hints[currentStep], 'warn-text');
}

async function copyCommand() {
  if (!$('#commandEditor')) return;
  await navigator.clipboard.writeText($('#commandEditor').value);
  systemLine($('#configTerminal'), 'Kali command block copied to clipboard. Paste it into your Kali terminal for this lab step.', 'ok');
}

function runCommandSimulation() {
  const target = $('#configTerminal');
  const lines = $('#commandEditor').value.split('\n').filter(Boolean);
  terminalLine(target, `execute-step --safe-simulation ${currentStep + 1}`);
  lines.slice(0, 10).forEach(line => {
    const clean = line.length > 96 ? `${line.slice(0, 96)}…` : line;
    if (clean.trim().startsWith('#')) systemLine(target, clean.replace(/^#\s*/, ''), 'warn-text');
    else systemLine(target, clean, 'ok');
  });
  systemLine(target, `Step ${currentStep + 1} command simulation completed successfully.`, 'ok');
}

function addPacket(src, dst, proto, info) {
  const body = $('#packetBody');
  if (!body) return;
  packetNo += 1;
  const tr = document.createElement('tr');
  tr.className = 'new-packet';
  const now = new Date().toLocaleTimeString();
  const p = proto.toLowerCase();
  const cls = p.includes('icmp') ? 'icmp' : p.includes('vpn') ? 'vpn' : p.includes('tor') ? 'tor' : p.includes('trace') ? 'vpn' : 'tcp';
  tr.innerHTML = `<td>${packetNo}</td><td>${now}</td><td>${src}</td><td>${dst}</td><td><span class="proto ${cls}">${proto}</span></td><td>${info}</td>`;
  body.prepend(tr);
}


let currentTestStep = 0;
let testPacketNo = 0;
let testTimers = [];

function getTestProtoClass(proto) {
  const p = String(proto).toLowerCase();
  if (p.includes('icmp')) return 'icmp';
  if (p.includes('vpn') || p.includes('wg') || p.includes('trace')) return 'vpn';
  if (p.includes('tor')) return 'tor';
  if (p.includes('local')) return 'local-proto';
  if (p.includes('arp')) return 'arp-proto';
  return 'tcp';
}

function clearTestTimers() {
  testTimers.forEach(id => clearTimeout(id));
  testTimers = [];
}

function renderTestingCards() {
  const wrap = $('#testStepCards');
  if (!wrap) return;
  wrap.innerHTML = testingMeta.map((item, index) => `
    <button class="test-step-btn ${index === currentTestStep ? 'active' : ''}" data-test-step="${index}">
      <span>${item.tag}</span>
      <strong>${item.title}</strong>
    </button>`).join('');
  $$('.test-step-btn').forEach(btn => btn.addEventListener('click', () => playTestingStep(Number(btn.dataset.testStep), false)));
}

function loadTestingStep(stepIndex) {
  currentTestStep = stepIndex;
  renderTestingCards();
  const meta = testingMeta[stepIndex];
  if ($('#testStepNumber')) $('#testStepNumber').textContent = `Test ${stepIndex + 1}`;
  if ($('#testHintText')) $('#testHintText').textContent = meta.hint;
  if ($('#testCommandEditor')) $('#testCommandEditor').value = meta.kaliInput;
  if ($('#testProgressBar')) $('#testProgressBar').style.width = `${((stepIndex + 1) / testingMeta.length) * 100}%`;
}

function testTerminalLine(text) {
  const target = $('#testKaliTerminal');
  if (!target) return;
  const div = document.createElement('div');
  const isComment = String(text).trim().startsWith('#');
  if (isComment) {
    div.className = 'warn-text';
    div.textContent = text.replace(/^#\s*/, '');
  } else {
    div.innerHTML = `<span class="prompt">root@kali</span>:<span class="test-path">/etc/wireguard</span># ${escapeHtml(text)}`;
  }
  target.appendChild(div);
  target.scrollTop = target.scrollHeight;
}

function testSystemLine(text, cls = 'ok') {
  const target = $('#testKaliTerminal');
  if (!target) return;
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  target.appendChild(div);
  target.scrollTop = target.scrollHeight;
}

function addTestPacket(stepLabel, src, dst, proto, info) {
  const body = $('#testPacketBody');
  if (!body) return;
  testPacketNo += 1;
  const tr = document.createElement('tr');
  tr.className = 'new-packet';
  const now = new Date().toLocaleTimeString();
  tr.innerHTML = `<td>${testPacketNo}</td><td>${escapeHtml(stepLabel)}</td><td>${now}</td><td>${escapeHtml(src)}</td><td>${escapeHtml(dst)}</td><td><span class="proto ${getTestProtoClass(proto)}">${escapeHtml(proto)}</span></td><td>${escapeHtml(info)}</td>`;
  body.appendChild(tr);
  body.closest('.packet-table-scroll')?.scrollTo({ top: body.closest('.packet-table-scroll').scrollHeight, behavior: 'smooth' });
}

function setTestCaptureStatus(text) {
  const el = $('#testCaptureStatus');
  if (el) el.textContent = text;
}

function resetStepTesting(keepSelection = true) {
  clearTestTimers();
  const term = $('#testKaliTerminal');
  const body = $('#testPacketBody');
  if (term) term.innerHTML = '';
  if (body) body.innerHTML = '';
  testPacketNo = 0;
  setTestCaptureStatus('● Ready');
  testSystemLine('Step-wise testing reset. Select a step or click Run All Steps.', 'warn-text');
  if (!keepSelection) loadTestingStep(0);
}

function playTestingStep(stepIndex, append = false) {
  if (!append) resetStepTesting(true);
  loadTestingStep(stepIndex);
  const meta = testingMeta[stepIndex];
  setTestCaptureStatus(`● Capturing ${meta.tag}`);
  testSystemLine('────────────────────────────────────────', 'warn-text');
  testSystemLine(`${meta.tag} - ${meta.title}`, 'action-text');
  testSystemLine(meta.hint, 'warn-text');

  const lines = meta.kaliInput.split('\n').filter(line => line.trim().length > 0);
  lines.forEach((line, idx) => {
    const timer = setTimeout(() => testTerminalLine(line), idx * 55);
    testTimers.push(timer);
  });

  const packetBase = Math.min(lines.length * 55 + 180, 1200);
  meta.packets.forEach((pkt, idx) => {
    const timer = setTimeout(() => addTestPacket(meta.tag, pkt.src, pkt.dst, pkt.proto, pkt.info), packetBase + (idx * 260));
    testTimers.push(timer);
  });

  const doneTimer = setTimeout(() => {
    testSystemLine(`${meta.tag} completed. Wireshark evidence rows added for this step.`, 'ok');
    setTestCaptureStatus(`● ${meta.tag} Complete`);
  }, packetBase + meta.packets.length * 270 + 120);
  testTimers.push(doneTimer);
}

async function copyTestingCommand() {
  if (!$('#testCommandEditor')) return;
  await navigator.clipboard.writeText($('#testCommandEditor').value);
  testSystemLine('Selected Kali input block copied to clipboard.', 'ok');
}

function runSelectedTestingStep() {
  playTestingStep(currentTestStep, false);
}

function runAllTestingSteps() {
  resetStepTesting(true);
  clearTestTimers();
  testSystemLine('Running all six testing steps in sequence.', 'action-text');
  let delay = 250;
  testingMeta.forEach((_, index) => {
    const timer = setTimeout(() => playTestingStep(index, true), delay);
    testTimers.push(timer);
    delay += 2350;
  });
  const finalTimer = setTimeout(() => {
    loadTestingStep(testingMeta.length - 1);
    setTestCaptureStatus('● All Steps Complete');
    testSystemLine('All testing steps completed. Review Wireshark rows for each configuration stage.', 'ok');
  }, delay + 300);
  testTimers.push(finalTimer);
}

function startPing() {
  terminalLine($('#kaliTerminal'), 'ping 10.0.40.100');
  let i = 0;
  const timer = setInterval(() => {
    i += 1;
    addPacket(currentIP, '10.0.40.100', 'ICMP', `Echo request seq=${i}`);
    addPacket('10.0.40.100', currentIP, 'ICMP', `Echo reply seq=${i}`);
    if (i >= 4) clearInterval(timer);
  }, 700);
}

function enableVpn() {
  currentIP = '10.0.10.26';
  terminalLine($('#kaliTerminal'), 'vpn --enable --relay VPS-1');
  systemLine($('#kaliTerminal'), 'VPN relay enabled. Observable source changed to VPS-1: 10.0.10.26', 'warn-text');
  addPacket(currentIP, '10.0.40.100', 'VPN', 'Source changed to VPN relay IP');
}

function enableTor() {
  terminalLine($('#kaliTerminal'), 'tor --enable --route-via-relays');
  let i = 0;
  const timer = setInterval(() => {
    currentIP = torIPs[torIndex % torIPs.length];
    torIndex += 1;
    i += 1;
    systemLine($('#kaliTerminal'), `Tor-side visible IP selected: ${currentIP}`, 'warn-text');
    addPacket(currentIP, '10.0.40.100', 'TOR', 'Simulated Tor-side visible IP');
    if (i >= 4) clearInterval(timer);
  }, 900);
}

function clearLab() {
  const kali = $('#kaliTerminal');
  const packets = $('#packetBody');
  if (!kali || !packets) return;
  kali.innerHTML = '';
  packets.innerHTML = '';
  currentIP = '10.0.30.10';
  packetNo = 0;
  terminalLine(kali, 'ready');
  systemLine(kali, 'Lab reset. Current IP: 10.0.30.10', 'ok');
  resetTraceroute();
}

const TRACE_DATA = {
  client: {
    label: 'Attacker / Client',
    subtitle: 'Selected destination level: Attacker / Client',
    insight: 'This reverse view starts from the IT Network and walks backward through Tor, VPS-2, VPS-1, and the attacker/client endpoint so students can understand destination-side attribution limits.',
    objective: 'Visualize the complete reverse route from the protected IT Network toward the attacker/client level.',
    pathNodes: ['it', 'tor', 'vps2', 'vps1', 'firewall', 'client'],
    hops: [
      { node: 'it', name: 'IT Network / Victim Side', ip: '10.0.40.100', ms: [0.21, 0.24, 0.22], ttl: 64, note: 'Starting observation point' },
      { node: 'tor', name: 'Tor Visible Node', ip: '10.0.40.102', ms: [9.88, 9.79, 9.83], ttl: 63, note: 'Last visible anonymity hop' },
      { node: 'vps2', name: 'VPS-2 Relay', ip: '10.0.20.102', ms: [38.17, 38.22, 38.19], ttl: 62, note: 'Secondary relay identified' },
      { node: 'vps1', name: 'VPS-1 Relay', ip: '10.0.10.26', ms: [56.14, 56.28, 56.20], ttl: 61, note: 'Primary relay identified' },
      { node: 'client', name: 'Attacker / Incoming Client', ip: '10.0.30.17', ms: [78.21, 78.03, 78.37], ttl: 60, note: 'Selected destination level' }
    ]
  },
  vps1: {
    label: 'VPS-1',
    subtitle: 'Selected destination level: VPS-1 relay',
    insight: 'This reverse view stops at VPS-1, showing how an observer can map the path back only to the first relay layer without continuing to the attacker/client.',
    objective: 'Understand reverse tracing from IT Network to VPS-1 relay visibility.',
    pathNodes: ['it', 'tor', 'vps2', 'vps1'],
    hops: [
      { node: 'it', name: 'IT Network / Victim Side', ip: '10.0.40.100', ms: [0.18, 0.20, 0.19], ttl: 64, note: 'Starting observation point' },
      { node: 'tor', name: 'Tor Visible Node', ip: '10.0.40.102', ms: [8.72, 8.44, 8.68], ttl: 63, note: 'Tor-side source visible' },
      { node: 'vps2', name: 'VPS-2 Relay', ip: '10.0.20.102', ms: [36.14, 36.28, 36.20], ttl: 62, note: 'Second relay boundary' },
      { node: 'vps1', name: 'VPS-1 Relay', ip: '10.0.10.26', ms: [58.21, 58.07, 58.18], ttl: 61, note: 'Selected destination level' }
    ]
  },
  vps2: {
    label: 'VPS-2',
    subtitle: 'Selected destination level: VPS-2 relay',
    insight: 'This reverse view stops at VPS-2, demonstrating that deeper relays shorten the visible attribution chain from the IT Network side.',
    objective: 'Learn how reverse visibility changes when the selected level is VPS-2.',
    pathNodes: ['it', 'tor', 'vps2'],
    hops: [
      { node: 'it', name: 'IT Network / Victim Side', ip: '10.0.40.100', ms: [0.16, 0.18, 0.17], ttl: 64, note: 'Starting observation point' },
      { node: 'tor', name: 'Tor Visible Node', ip: '10.0.40.102', ms: [7.31, 7.29, 7.30], ttl: 63, note: 'Tor-side source visible' },
      { node: 'vps2', name: 'VPS-2 Relay', ip: '10.0.20.102', ms: [39.81, 39.72, 39.77], ttl: 62, note: 'Selected destination level' }
    ]
  },
  tor: {
    label: 'Tor',
    subtitle: 'Selected destination level: Tor-side visibility',
    insight: 'This reverse view stops at Tor, showing that the immediate visible hop from the IT Network is the Tor-side node.',
    objective: 'Visualize the shortest reverse path from IT Network to the Tor visible node.',
    pathNodes: ['it', 'tor'],
    hops: [
      { node: 'it', name: 'IT Network / Victim Side', ip: '10.0.40.100', ms: [0.11, 0.10, 0.12], ttl: 64, note: 'Starting observation point' },
      { node: 'tor', name: 'Tor Visible Node', ip: '10.0.40.102', ms: [9.88, 9.79, 9.83], ttl: 63, note: 'Selected destination level' }
    ]
  }
};

const TRACE_NODE_ORDER = ['client', 'firewall', 'vps1', 'vps2', 'tor', 'it'];
const TRACE_CONNECTORS = [
  { id: 'client-firewall', from: 'client', to: 'firewall' },
  { id: 'firewall-vps1', from: 'firewall', to: 'vps1' },
  { id: 'vps1-vps2', from: 'vps1', to: 'vps2' },
  { id: 'vps2-tor', from: 'vps2', to: 'tor' },
  { id: 'tor-target', from: 'tor', to: 'it' }
];

let traceSource = 'client';
let traceAnimating = false;
let traceCompleted = false;
let traceTimers = [];

function avg(arr) {
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
}

function getTraceData() {
  return TRACE_DATA[traceSource];
}

function clearTraceTimers() {
  traceTimers.forEach(id => clearTimeout(id));
  traceTimers = [];
}

function hasTracePanel() {
  return !!($('#traceTableBody') && $('#traceSummary') && $('#traceStatus'));
}

function getVisualPathForRows(data, rows) {
  if (!rows.length) return [];
  const lastNode = rows[rows.length - 1].node;
  const lastIdx = data.pathNodes.indexOf(lastNode);
  return lastIdx >= 0 ? data.pathNodes.slice(0, lastIdx + 1) : rows.map(x => x.node);
}

function setTraceSource(source) {
  if (!hasTracePanel()) return;
  clearTraceTimers();
  traceAnimating = false;
  traceCompleted = false;
  traceSource = source;
  $$('.trace-source-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.traceSource === source));
  const data = getTraceData();
  $('#traceSubtitle').textContent = data.subtitle;
  $('#traceInsightText').textContent = data.insight;
  $('#traceObjectiveText').textContent = data.objective;
  renderTraceTimeline([]);
  updateTraceVisual([], false);
  $('#traceTableBody').innerHTML = '';
  $('#traceSummary').innerHTML = `Selected destination level: <strong>${data.label}</strong>. Click <strong>Start Traceroute</strong> to visualize the reverse path from IT Network.`;
  setTraceStatus('Ready', 'ready');
}

function setTraceStatus(text, cls) {
  const badge = $('#traceStatus');
  if (!badge) return;
  badge.textContent = text;
  badge.className = `trace-status ${cls}`;
}

function renderTraceTable(rows) {
  const body = $('#traceTableBody');
  if (!body) return;
  body.innerHTML = rows.map((hop, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${hop.name}</strong><br><span class="trace-hop-note">${hop.note || 'Reverse hop'}</span></td>
      <td>${hop.ip}</td>
      <td>${hop.ms[0].toFixed(2)}</td>
      <td>${hop.ms[1].toFixed(2)}</td>
      <td>${hop.ms[2].toFixed(2)}</td>
      <td>${avg(hop.ms)}</td>
      <td>${hop.ttl}</td>
    </tr>`).join('');
}

function renderTraceTimeline(rows) {
  const wrap = $('#traceTimeline');
  if (!wrap) return;
  if (!rows.length) {
    wrap.innerHTML = `<div class="trace-timeline-empty">Timeline will populate from <strong>IT Network</strong> toward the selected level.</div>`;
    return;
  }
  wrap.innerHTML = rows.map((hop, idx) => `
    <div class="trace-timeline-item active">
      <div class="trace-timeline-badge">${idx + 1}</div>
      <div class="trace-timeline-copy"><strong>${hop.name}</strong><span>${hop.ip} • ${hop.note || 'Reverse hop'}</span></div>
    </div>`).join('');
}

function updateTraceVisual(activeNodes = [], flowing = false) {
  if (!hasTracePanel()) return;
  const activeSet = new Set(activeNodes);
  const currentNode = activeNodes.length ? activeNodes[activeNodes.length - 1] : null;
  const activeIndexes = activeNodes.map(n => TRACE_NODE_ORDER.indexOf(n)).filter(i => i >= 0);
  const minIdx = activeIndexes.length ? Math.min(...activeIndexes) : -1;
  const maxIdx = activeIndexes.length ? Math.max(...activeIndexes) : -1;
  const reverseFlow = activeNodes.length > 1 && TRACE_NODE_ORDER.indexOf(activeNodes[0]) > TRACE_NODE_ORDER.indexOf(activeNodes[activeNodes.length - 1]);

  $$('.trace-node').forEach(nodeEl => {
    const name = nodeEl.dataset.node;
    const idx = TRACE_NODE_ORDER.indexOf(name);
    const withinPathSpan = activeNodes.length > 0 && idx >= minIdx && idx <= maxIdx;
    nodeEl.classList.toggle('dimmed', activeNodes.length > 0 && !withinPathSpan);
    nodeEl.classList.toggle('reached', activeSet.has(name));
    nodeEl.classList.toggle('current', name === currentNode && !!currentNode);
  });

  $$('.trace-connector').forEach(connEl => {
    const c = TRACE_CONNECTORS.find(x => x.id === connEl.dataset.connector);
    const active = activeSet.has(c.from) && activeSet.has(c.to);
    const fromIdx = TRACE_NODE_ORDER.indexOf(c.from);
    const toIdx = TRACE_NODE_ORDER.indexOf(c.to);
    const withinPathSpan = activeNodes.length > 0 && fromIdx >= minIdx && toIdx <= maxIdx;
    connEl.classList.toggle('active', active);
    connEl.classList.toggle('flowing', active && flowing);
    connEl.classList.toggle('reverse', reverseFlow);
    connEl.classList.toggle('dimmed', activeNodes.length > 0 && !withinPathSpan);
  });
}

function resetTraceroute() {
  if (!hasTracePanel()) return;
  clearTraceTimers();
  traceAnimating = false;
  traceCompleted = false;
  $('#traceTableBody').innerHTML = '';
  renderTraceTimeline([]);
  updateTraceVisual([], false);
  $('#traceSummary').innerHTML = 'Select a destination level and click <strong>Start Traceroute</strong> to begin the reverse hop-by-hop learning view.';
  setTraceStatus('Ready', 'ready');
}

function runTraceroute(flowing = false) {
  if (!hasTracePanel()) return;
  if (traceAnimating) return;
  clearTraceTimers();
  traceAnimating = true;
  traceCompleted = false;
  $('#traceTableBody').innerHTML = '';
  renderTraceTimeline([]);
  updateTraceVisual([], false);
  setTraceStatus('Reverse tracing…', 'running');

  const data = getTraceData();
  const rows = [];
  data.hops.forEach((hop, idx) => {
    const timer = setTimeout(() => {
      rows.push(hop);
      renderTraceTable(rows);
      renderTraceTimeline(rows);
      const visualPath = getVisualPathForRows(data, rows);
      updateTraceVisual(visualPath, flowing);
      const nextHop = data.hops[idx + 1];
      addPacket(hop.ip, nextHop ? nextHop.ip : hop.ip, 'TRACE', `Reverse traceroute hop ${idx + 1}: ${hop.name}`);

      if (idx === data.hops.length - 1) {
        traceAnimating = false;
        traceCompleted = true;
        setTraceStatus('Completed', 'complete');
        const total = avg(data.hops[data.hops.length - 1].ms);
        $('#traceSummary').innerHTML = `Reverse trace complete. Path travelled from <strong>IT Network</strong> to <strong>${data.label}</strong> across <strong>${data.hops.length} visible hops</strong>. Final hop average: <strong>${total} ms</strong>.`;
      }
    }, idx * 620);
    traceTimers.push(timer);
  });
}

function showAnimatedFlowOnly() {
  if (!hasTracePanel()) return;
  const data = getTraceData();
  updateTraceVisual(data.pathNodes, true);
  renderTraceTimeline(data.hops);
  if (!traceCompleted) {
    $('#traceSummary').innerHTML = `Reverse animation enabled from <strong>IT Network</strong> toward <strong>${data.label}</strong>. Click <strong>Start Traceroute</strong> to populate hop measurements.`;
  }
}

function getSshCredentials(showError = true) {
  const host = ($('#sshHostInput')?.value || '').trim();
  const username = ($('#sshUserInput')?.value || '').trim();
  const password = ($('#sshPasswordInput')?.value || '');
  const portRaw = ($('#sshPortInput')?.value || '22').trim();
  const port = Number(portRaw || 22);
  const hint = $('#sshCredentialHint');
  const missing = [];
  if (!host) missing.push('IP');
  if (!username) missing.push('username');
  if (!password) missing.push('password');
  if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push('valid port');

  if (hint) {
    if (missing.length) {
      hint.textContent = showError ? `Required before SSH: ${missing.join(', ')}.` : 'Fill IP, username, and password, then connect the SSH terminal.';
      hint.classList.toggle('error', !!showError);
    } else {
      hint.textContent = `Ready to connect: ${username}@${host}:${port}`;
      hint.classList.remove('error');
    }
  }
  if (missing.length) {
    if (showError) liveLine(`[INPUT REQUIRED] Enter SSH ${missing.join(', ')} before starting this step.`, 'bad');
    return null;
  }
  $('#liveHostLabel') && ($('#liveHostLabel').textContent = host);
  return { host, username, password, port };
}

function maskPassword(password) {
  if (!password) return 'not entered';
  return '•'.repeat(Math.min(Math.max(password.length, 6), 12));
}

function buildLiveFireStep(key) {
  const creds = getSshCredentials(key === 'host' || key === 'direct');
  const hostIp = creds?.host || 'manual-host-ip';
  const user = creds?.username || 'username';
  const passwordMask = creds ? maskPassword(creds.password) : '********';
  const steps = {
    host: {
      title: 'STEP 1 - SSH into manually entered host machine',
      lines: [
        `ssh ${user}@${hostIp}`,
        `password: ${passwordMask}`,
        `[OK] SSH session configured for ${user}@${hostIp}`,
        '[INFO] All next actions are launched from this manually selected host session.'
      ],
      packet: null,
      requiresCredentials: true
    },
    direct: {
      title: 'STEP 2 - Direct victim test with wg0 down',
      lines: [
        'cd /etc/wireguard && sudo wg-quick down wg0',
        'curl http://10.0.40.100',
        `[WIRESHARK] Direct traffic visible from source IP ${hostIp}`
      ],
      packet: { src: hostIp, dst: '10.0.40.100', proto: 'HTTP', info: 'Direct curl request; wg0 down; source is manually entered host machine' },
      requiresCredentials: true
    },
    vps1: {
      title: 'STEP 3 - Enable VPS-1 route through wg0',
      lines: [
        'cd /etc/wireguard && sudo wg-quick up wg0',
        'ping 10.0.40.100',
        '[WIRESHARK] ICMP traffic now visible from VPS-1 IP 10.0.10.26'
      ],
      packet: { src: '10.0.10.26', dst: '10.0.40.100', proto: 'VPN', info: 'wg0 up; observable source changed to VPS-1' }
    },
    vps2: {
      title: 'STEP 4 - SSH into VPS-1 and enable wg1 toward VPS-2',
      lines: [
        'sudo ssh book@10.0.10.26',
        'password: ********',
        'cd /etc/wireguard && sudo wg-quick up wg1',
        'curl http://10.0.40.100',
        '[WIRESHARK] Victim-side packets now show VPS-2 IP 10.0.20.102'
      ],
      packet: { src: '10.0.20.102', dst: '10.0.40.100', proto: 'VPN', info: 'wg1 up via VPS-1; observable source changed to VPS-2' }
    },
    tor: {
      title: 'STEP 5 - SSH into Tor and start SOCKS tunnel',
      lines: [
        'sudo ssh book@10.0.40.102',
        'password: ********',
        'sudo ssh -D 0.0.0.0:1080 administrator@10.0.40.102',
        'curl http://10.0.40.100',
        '[WIRESHARK] Victim-side packets now show Tor IP 10.0.40.102'
      ],
      packet: { src: '10.0.40.102', dst: '10.0.40.100', proto: 'TOR', info: 'SOCKS tunnel active; observable source changed to Tor node' }
    }
  };
  if (steps[key]?.requiresCredentials && !creds) return null;
  return steps[key];
}

let xterm = null;
let sshSocket = null;
let sshConnected = false;

function liveLine(text, cls = 'ok') {
  const target = $('#liveFireTerminal');
  if (!target) return;
  const isCmd = /^(sudo|cd |curl|ping|ip |wg-quick|ssh )/.test(text);
  const display = isCmd ? `livefire@host:~$ ${text}` : text;
  if (xterm) {
    xterm.writeln(display);
    return;
  }
  const div = document.createElement('div');
  if (isCmd) div.innerHTML = `<span class="prompt">livefire@host</span>:~$ ${escapeHtml(text)}`;
  else {
    div.className = cls;
    div.textContent = text;
  }
  target.appendChild(div);
  target.scrollTop = target.scrollHeight;
}

function setSshStatus(text, online) {
  const el = $('#sshStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('online', !!online);
  el.classList.toggle('offline', !online);
}

function initRealTerminal() {
  const target = $('#liveFireTerminal');
  if (!target) return false;
  if (xterm) return true;
  if (window.Terminal) {
    xterm = new Terminal({
      cursorBlink: true,
      convertEol: true,
      theme: { background: '#020617', foreground: '#22c55e' },
      fontFamily: 'Consolas, monospace',
      fontSize: 14,
      rows: 24
    });
    xterm.open(target);
    xterm.writeln('Anonymity Framework Live Fire Terminal');
    xterm.writeln('Enter SSH IP, username, and password above, then click "Connect SSH Terminal".');
    xterm.onData(data => {
      if (sshSocket && sshConnected) sshSocket.emit('terminal-input', data);
      else xterm.write('\r\n[not connected] Enter credentials and click Connect SSH Terminal first.\r\n');
    });
    target.addEventListener('click', () => xterm.focus());
  }
  return true;
}

function connectSshTerminal() {
  if (!initRealTerminal()) return;
  const creds = getSshCredentials(true);
  if (!creds) return;
  if (sshSocket && sshConnected) {
    xterm?.writeln('\r\nAlready connected. Disconnect first to change SSH target.');
    return;
  }
  setSshStatus(`● Connecting to ${creds.host}...`, false);
  xterm?.writeln(`\r\n[bridge] Connecting to SSH host ${creds.username}@${creds.host}:${creds.port} ...`);
  sshSocket = io();
  sshSocket.on('connect', () => sshSocket.emit('ssh-connect', creds));
  sshSocket.on('ssh-ready', msg => {
    sshConnected = true;
    setSshStatus(`● SSH connected to ${creds.host} — manual input enabled`, true);
    xterm?.writeln(`\r\n[bridge] ${msg}`);
    xterm?.writeln('[bridge] Manual terminal ready. Type commands directly here.');
    xterm?.focus();
  });
  sshSocket.on('terminal-output', data => xterm?.write(data));
  sshSocket.on('ssh-error', msg => {
    sshConnected = false;
    setSshStatus('● SSH bridge error', false);
    xterm?.writeln(`\r\n[error] ${msg}`);
  });
  sshSocket.on('disconnect', () => {
    sshConnected = false;
    setSshStatus('● SSH bridge offline', false);
    xterm?.writeln('\r\n[bridge] disconnected');
  });
}

function disconnectSshTerminal() {
  if (sshSocket) {
    sshSocket.emit('ssh-disconnect');
    sshSocket.disconnect();
  }
  sshSocket = null;
  sshConnected = false;
  setSshStatus('● SSH bridge offline', false);
}

function sendToRealTerminal(cmd) {
  if (!xterm) initRealTerminal();
  if (sshSocket && sshConnected) sshSocket.emit('terminal-input', `${cmd}\n`);
  else xterm?.writeln(`[not connected] ${cmd}`);
}

function focusManualTerminal() {
  if (initRealTerminal() && xterm) {
    xterm.focus();
    xterm.writeln('\r\n[bridge] Focused. Type your command directly in this terminal.');
  }
}

function sendManualCommand() {
  const input = $('#manualCommand');
  if (!input) return;
  const cmd = input.value.trim();
  if (!cmd) return;
  if (sshSocket && sshConnected) {
    sshSocket.emit('terminal-input', `${cmd}\n`);
    input.value = '';
    xterm?.focus();
  } else if (xterm) {
    xterm.writeln(`\r\n[not connected] Enter credentials and click Connect SSH Terminal first. Command not sent: ${cmd}`);
  }
}

function sendCtrlC() {
  if (sshSocket && sshConnected) {
    sshSocket.emit('terminal-input', '\x03');
    xterm?.focus();
  } else if (xterm) {
    xterm.writeln('\r\n[not connected] Ctrl+C not sent.');
  }
}

function runLiveFireStep(key) {
  const step = buildLiveFireStep(key);
  if (!step) return;
  liveLine('────────────────────────────────────────', 'warn-text');
  liveLine(step.title, 'warn-text');
  step.lines.forEach((line, idx) => {
    setTimeout(() => {
      liveLine(line, line.startsWith('[WIRESHARK]') ? 'action-text' : 'ok');
      if (key !== 'host' && !line.startsWith('[') && !line.startsWith('password:')) sendToRealTerminal(line);
    }, idx * 260);
  });
  if (step.packet) {
    setTimeout(() => {
      currentIP = step.packet.src;
      addPacket(step.packet.src, step.packet.dst, step.packet.proto, step.packet.info);
      if (step.packet.proto === 'VPN' || step.packet.proto === 'TOR') addPacket(step.packet.dst, step.packet.src, step.packet.proto, 'Victim response to current live-fire route');
    }, step.lines.length * 270);
  }
}

function resetLiveFire() {
  const lf = $('#liveFireTerminal');
  if (xterm) xterm.clear();
  else if (lf) lf.innerHTML = '';
  liveLine('ready');
  liveLine('Live Fire reset. Enter SSH target IP, username, and password, then connect the terminal.', 'warn-text');
  getSshCredentials(false);
}

function bindEvents() {
  $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.tab-panel').forEach(p => p.classList.remove('active'));
    $(`#${btn.dataset.tab}`).classList.add('active');
  }));

  $$('.topic-btn').forEach(btn => btn.addEventListener('click', () => setTopic(btn.dataset.topic)));
  $('#applyConfig').addEventListener('click', applyConfig);
  $('#copyConfig').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('#configEditor').value);
    systemLine($('#configTerminal'), 'Configuration copied to clipboard.', 'ok');
  });
  $('#copyCommand')?.addEventListener('click', copyCommand);
  $('#runCommand')?.addEventListener('click', runCommandSimulation);
  $('#resetConfig').addEventListener('click', () => loadConfigStep(0));

  $('#copyTestCommand')?.addEventListener('click', copyTestingCommand);
  $('#runTestStep')?.addEventListener('click', runSelectedTestingStep);
  $('#runAllTestSteps')?.addEventListener('click', runAllTestingSteps);
  $('#resetStepTesting')?.addEventListener('click', () => resetStepTesting(true));

  $('#startPing')?.addEventListener('click', startPing);
  $('#enableVpn')?.addEventListener('click', enableVpn);
  $('#enableTor')?.addEventListener('click', enableTor);
  $('#clearLab')?.addEventListener('click', clearLab);

  $$('.trace-source-btn').forEach(btn => btn.addEventListener('click', () => {
    traceCompleted = false;
    setTraceSource(btn.dataset.traceSource);
  }));
  $('#startTraceroute')?.addEventListener('click', () => runTraceroute(true));
  $('#replayTraceroute')?.addEventListener('click', () => runTraceroute(true));
  $('#showAnimatedFlow')?.addEventListener('click', showAnimatedFlowOnly);
  $('#resetTraceroute')?.addEventListener('click', resetTraceroute);

  $('#lfHost')?.addEventListener('click', () => runLiveFireStep('host'));
  $('#lfDirect')?.addEventListener('click', () => runLiveFireStep('direct'));
  $('#lfVps1')?.addEventListener('click', () => runLiveFireStep('vps1'));
  $('#lfVps2')?.addEventListener('click', () => runLiveFireStep('vps2'));
  $('#lfTor')?.addEventListener('click', () => runLiveFireStep('tor'));
  $('#lfReset')?.addEventListener('click', resetLiveFire);
  $('#connectSsh')?.addEventListener('click', connectSshTerminal);
  $('#focusTerminal')?.addEventListener('click', focusManualTerminal);
  $('#disconnectSsh')?.addEventListener('click', disconnectSshTerminal);
  $('#sendManualCommand')?.addEventListener('click', sendManualCommand);
  $('#manualCommand')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendManualCommand(); });
  $('#sendCtrlC')?.addEventListener('click', sendCtrlC);
  ['#sshHostInput', '#sshUserInput', '#sshPasswordInput', '#sshPortInput'].forEach(sel => {
    $(sel)?.addEventListener('input', () => getSshCredentials(false));
  });
}

renderConfigCards();
renderTestingCards();
setTopic('what');
loadConfigStep(0);
loadTestingStep(0);
resetStepTesting(true);
setTraceSource('client');
resetLiveFire();
initRealTerminal();
bindEvents();
