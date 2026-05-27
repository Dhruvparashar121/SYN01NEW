const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const configSteps = [
  {
    tag: 'STEP 1',
    title: 'Client WireGuard wg2.conf',
    short: 'Prepare Kali/Client as the first tunnel endpoint.',
    fileName: 'client-wg2.conf',
    explanation: "**Purpose:** create `/etc/wireguard/wg2.conf` on the Kali client.\n- **Tunnel IP:** Kali receives `20.20.20.1/24`.\n- **Endpoint:** Kali sends WireGuard traffic to VPS-1 at `10.0.10.26:51820`.\n- **Routing:** `AllowedIPs = 0.0.0.0/0` means the client default route moves through the tunnel.\n- **Success check:** `wg show wg2` must show the peer and endpoint.",
    setup: 'Create the client WireGuard config and verify file permissions.',
    command: `sudo mkdir -p /etc/wireguard
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
sudo wg-quick up wg2
sudo wg show wg2
ip addr show wg2`,
    output: `[sudo] password for kali:
net.ipv4.ip_forward = 1
[#] ip link add wg2 type wireguard
[#] wg setconf wg2 /dev/fd/63
[#] ip -4 address add 20.20.20.1/24 dev wg2
[#] ip link set mtu 1420 up dev wg2
interface: wg2
  public key: yAq35PEekG2imnqU3r2IR2urMeJStda4b6Wh2CYbxCY=
peer: FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
  endpoint: 10.0.10.26:51820
  allowed ips: 0.0.0.0/0`
  },
  {
    tag: 'STEP 2',
    title: 'VPS-1 Relay wg2.conf',
    short: 'Configure first relay and forwarding toward VPS-2.',
    fileName: 'vps1-wg2.conf',
    explanation: "**Purpose:** make VPS-1 the first relay between Kali and VPS-2.\n- **Relay IP:** VPS-1 receives `20.20.20.2/24`.\n- **Client peer:** Kali is allowed as `20.20.20.1/32`.\n- **Next hop:** default traffic is forwarded to VPS-2 at `10.0.20.102:51820`.\n- **Forwarding:** iptables permits packets entering and leaving `wg2`.",
    setup: 'Create VPS-1 WireGuard config, enable forwarding, and start wg2.',
    command: `sudo mkdir -p /etc/wireguard
sudo tee /etc/wireguard/wg2.conf >/dev/null <<'EOF'
[Interface]
Address = 20.20.20.2/24
PrivateKey = 6Mm3OkTQoCekHlI24DYrW9P8NKg9L8mRvWSerferZH4=
ListenPort = 51820
Table = 123
PostUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -A FORWARD -i wg2 -j ACCEPT
PostUp = iptables -A FORWARD -o wg2 -j ACCEPT

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
sudo wg-quick up wg2
sudo sysctl net.ipv4.ip_forward
sudo wg show wg2`,
    output: `net.ipv4.ip_forward = 1
interface: wg2
  public key: FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
  listening port: 51820
peer: yAq35PEekG2imnqU3r2IR2urMeJStda4b6Wh2CYbxCY=
  allowed ips: 20.20.20.1/32
peer: bH1IsQlTt1Je9kAgd7QlxBzE+KeUkFNDvmzB6UDlPko=
  endpoint: 10.0.20.102:51820
  allowed ips: 0.0.0.0/0`
  },
  {
    tag: 'STEP 3',
    title: 'VPS-2 Relay / NAT wg2.conf',
    short: 'Configure the second relay and outbound gateway path.',
    fileName: 'vps2-wg2.conf',
    explanation: "**Purpose:** make VPS-2 the second relay and outbound gateway stage.\n- **Relay IP:** VPS-2 receives `20.20.20.3/24`.\n- **Allowed peer:** traffic from VPS-1 is accepted as `20.20.20.2/32`.\n- **NAT:** MASQUERADE hides the tunnel source behind the outbound interface.\n- **Success check:** `iptables -t nat -L POSTROUTING -n -v` should show the NAT rule.",
    setup: 'Create VPS-2 config, start wg2, and verify iptables/WireGuard status.',
    command: `sudo mkdir -p /etc/wireguard
sudo tee /etc/wireguard/wg2.conf >/dev/null <<'EOF'
[Interface]
Address = 20.20.20.3/24
PrivateKey = 2J3YgghlO7jERE7HNqw2ugVRlmL0LVSWH+IGTBedxU0=
ListenPort = 51820
PreUp = sysctl -w net.ipv4.ip_forward=1
PostUp = iptables -A FORWARD -i wg2 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o ens18 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg2 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o ens18 -j MASQUERADE

[Peer]
PublicKey = FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
AllowedIPs = 20.20.20.2/32
PersistentKeepalive = 25
EOF
sudo chmod 600 /etc/wireguard/wg2.conf
sudo wg-quick up wg2
sudo iptables -t nat -L POSTROUTING -n -v
sudo wg show wg2`,
    output: `net.ipv4.ip_forward = 1
Chain POSTROUTING (policy ACCEPT)
pkts bytes target     prot opt in  out   source      destination
0    0     MASQUERADE all  --  *   ens18 0.0.0.0/0   0.0.0.0/0
interface: wg2
  public key: bH1IsQlTt1Je9kAgd7QlxBzE+KeUkFNDvmzB6UDlPko=
peer: FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
  allowed ips: 20.20.20.2/32`
  },
  {
    tag: 'STEP 4',
    title: 'Tor / Proxychains SSH Stage',
    short: 'Prepare the final access path and validate SSH reachability.',
    fileName: 'tor-proxychains-ssh.txt',
    explanation: "**Purpose:** prepare the final machine that will be reached or observed during testing.\n- **Windows option:** enable OpenSSH Server from Administrator PowerShell.\n- **Ubuntu option:** enable SSH, RDP or VNC as explained in the README.\n- **Kali validation:** use `nc`, `ssh` or `proxychains curl` to prove reachability.\n- **Blue-team check:** keep Wireshark open on Ubuntu to view live packet evidence.",
    setup: 'Enable remote service on the target and validate from Kali.',
    command: `# On Windows PowerShell as Administrator, if Windows is the final host:
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

# On Kali, validate access path:
nc -vz 10.0.40.100 22
ssh user@10.0.40.100
proxychains curl http://10.0.40.100`,
    output: `Connection to 10.0.40.100 22 port [tcp/ssh] succeeded!
The authenticity of host '10.0.40.100' can be established.
user@10.0.40.100's password:
HTTP/1.1 200 OK
Proxychains path verified through the final stage.`
  },
  {
    tag: 'STEP 5',
    title: 'WireGuard Key Verification',
    short: 'Verify private/public keys before live testing.',
    fileName: 'wireguard-key-checks.txt',
    explanation: "**Purpose:** prevent configuration mistakes before starting the live test.\n- **Private keys:** confirm each node uses its own private key.\n- **Public keys:** confirm each peer block uses the other node’s public key.\n- **Common error:** copying the wrong public key causes handshake failure.\n- **Success check:** the key values match the prepared lab files exactly.",
    setup: 'Read the key files and compare them with the config files.',
    command: `cd /home/gcon/gu
cat privatekey_1
cat privatekey_2
cat privatekey_3
cat publickey_1
cat publickey_2
cat publickey_3`,
    output: `MLp4+2/2tfFzwxi9eum5S1OvtbuqHyJIyIgz6ybWGUU=
6Mm3OkTQoCekHlI24DYrW9P8NKg9L8mRvWSerferZH4=
2J3YgghlO7jERE7HNqw2ugVRlmL0LVSWH+IGTBedxU0=
yAq35PEekG2imnqU3r2IR2urMeJStda4b6Wh2CYbxCY=
FVC77PqtK7L0AScEsFIA7/2fHKYyUZ2nTCoBRd6r3k8=
bH1IsQlTt1Je9kAgd7QlxBzE+KeUkFNDvmzB6UDlPko=`
  },
  {
    tag: 'STEP 6',
    title: 'End-to-End Traceroute Validation',
    short: 'Confirm first hops and observe packets in Ubuntu/Wireshark.',
    fileName: 'client-traceroute-validation.txt',
    explanation: "**Purpose:** prove that the full anonymity path is working end-to-end.\n- **Kali evidence:** `traceroute -n 8.8.8.8` should show the first framework hops.\n- **Tunnel evidence:** `sudo wg show wg2` should show handshakes and transfer counters.\n- **Ubuntu evidence:** the Guacamole screen should show Wireshark packets in real time.\n- **Final result:** command output on the left and packet visibility on the right match each other.",
    setup: 'Run traceroute and ping from Kali while watching Ubuntu/Wireshark.',
    command: `traceroute -n 8.8.8.8
ping -c 4 8.8.8.8
sudo wg show wg2`,
    output: `traceroute to 8.8.8.8, 30 hops max
 1  20.20.20.2   1.113 ms  1.088 ms  1.056 ms
 2  20.20.20.3   2.352 ms  2.294 ms  2.270 ms
 3  10.0.20.1    3.770 ms  3.712 ms  3.690 ms
...
64 bytes from 8.8.8.8: icmp_seq=1 ttl=115 time=22.4 ms
Wireshark: UDP/51820, ICMP and traceroute probes visible on the observation host.`
  }
];

const liveFireGuide = [
  {
    title: 'Prepare observation',
    hint: 'Open the Ubuntu observation desktop on the right through Guacamole, then start Wireshark on the correct interface.',
    evidence: 'Ubuntu screen prepared for packet observation.',
    commands: [
      { cmd: 'ip a', help: 'Confirm Kali interface/IP before launching tests.', matches: [/^ip\s+a$/i, /^ip\s+addr(ess)?$/i] },
      { cmd: 'sudo wg show', help: 'Check existing WireGuard state before changing anything.', matches: [/^sudo\s+wg\s+show$/i, /^wg\s+show$/i] }
    ]
  },
  {
    title: 'Bring up client tunnel',
    hint: 'Start the client WireGuard interface and confirm that wg2 exists.',
    evidence: 'Kali client tunnel started.',
    commands: [
      { cmd: 'sudo wg-quick up wg2', help: 'Starts the wg2 tunnel on Kali.', matches: [/^sudo\s+wg-quick\s+up\s+wg2$/i] },
      { cmd: 'ip addr show wg2', help: 'Displays the tunnel IP assigned to wg2.', matches: [/^ip\s+addr\s+show\s+wg2$/i, /^ip\s+a\s+show\s+wg2$/i] }
    ]
  },
  {
    title: 'Generate packet evidence',
    hint: 'Run ICMP and traceroute traffic while watching Wireshark on the Ubuntu screen.',
    evidence: 'ICMP/traceroute packets generated for defender view.',
    commands: [
      { cmd: 'ping -c 4 8.8.8.8', help: 'Creates ICMP traffic for live observation.', matches: [/^ping\s+-c\s+\d+\s+8\.8\.8\.8$/i] },
      { cmd: 'traceroute -n 8.8.8.8', help: 'Shows path through framework hops.', matches: [/^traceroute\s+(-n\s+)?8\.8\.8\.8$/i] }
    ]
  },
  {
    title: 'Service validation',
    hint: 'Validate reachability to the IT-network/Ubuntu/target machine through allowed lab services.',
    evidence: 'Target service reachability checked.',
    commands: [
      { cmd: 'nc -vz 10.0.40.100 22', help: 'Checks SSH service reachability.', matches: [/^nc\s+-vz\s+10\.0\.40\.100\s+22$/i] },
      { cmd: 'sudo wg show wg2', help: 'Confirms handshake/transfer counters after testing.', matches: [/^sudo\s+wg\s+show\s+wg2$/i, /^wg\s+show\s+wg2$/i] }
    ]
  }
];

let currentConfigStep = 0;
let xterm = null;
let localSocket = null;
let localShellConnected = false;
let liveCommandBuffer = '';
let currentLiveGuideStep = 0;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRichText(text) {
  const lines = String(text || '').split('\n');
  let html = '';
  let inList = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const escaped = escapeHtml(line).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (line.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${escaped.slice(2)}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${escaped}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

function renderTraining() {
  const setupList = $('#trainingSetupList');
  setupList.innerHTML = configSteps.map(step => `<li><strong>${escapeHtml(step.title)}</strong><span>${escapeHtml(step.setup)}</span></li>`).join('');

  const fileStack = $('#trainingConfigFiles');
  fileStack.innerHTML = configSteps.map(step => `<div class="config-file-pill">
    <div><strong>${escapeHtml(step.fileName)}</strong><span>${escapeHtml(step.short)}</span></div>
    <code>${escapeHtml(step.tag)}</code>
  </div>`).join('');
}

function renderConfigMenu() {
  const menu = $('#configStepMenu');
  menu.innerHTML = configSteps.map((step, index) => `<button class="step-menu-item ${index === currentConfigStep ? 'active' : ''}" data-step="${index}">
    <span>${escapeHtml(step.tag)}</span>
    <strong>${escapeHtml(step.title)}</strong>
    <small>${escapeHtml(step.short)}</small>
  </button>`).join('');
  $$('.step-menu-item').forEach(btn => btn.addEventListener('click', () => loadConfigStep(Number(btn.dataset.step))));
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

function loadConfigStep(index) {
  currentConfigStep = index;
  const step = configSteps[index];
  renderConfigMenu();
  $('#configTag').textContent = step.tag;
  $('#configTitle').textContent = step.title;
  $('#configExplanation').innerHTML = formatRichText(step.explanation);
  $('#configExpectedOutput').textContent = step.output;
  $('#configCommandEditor').value = step.command;
  const terminal = $('#configTerminal');
  if (terminal.children.length === 0) {
    systemLine(terminal, 'Select any step, copy the commands, then press “Run Output Simulation” to view expected Kali output.', 'warn-text');
  }
}

async function copyConfigCommand() {
  await navigator.clipboard.writeText($('#configCommandEditor').value);
  systemLine($('#configTerminal'), `${configSteps[currentConfigStep].tag}: command block copied to clipboard.`, 'ok');
}

function simulateConfigRun() {
  const step = configSteps[currentConfigStep];
  const terminal = $('#configTerminal');
  terminalLine(terminal, `run-lab-step ${currentConfigStep + 1} --safe-output`);
  systemLine(terminal, `# ${step.title}`, 'warn-text');
  step.command.split('\n').slice(0, 16).forEach(line => {
    const clean = line.length > 118 ? `${line.slice(0, 118)}…` : line;
    systemLine(terminal, clean, clean.trim().startsWith('#') ? 'warn-text' : 'ok');
  });
  systemLine(terminal, '--- EXPECTED OUTPUT ---', 'action-text');
  step.output.split('\n').forEach(line => systemLine(terminal, line, 'ok'));
}

function clearConfigTerminal() {
  $('#configTerminal').innerHTML = '';
  systemLine($('#configTerminal'), 'Configuration terminal cleared.', 'warn-text');
}

function setLocalShellStatus(text, online) {
  const el = $('#localShellStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('online', !!online);
  el.classList.toggle('offline', !online);
}

function addLiveGuideLog(text, cls = 'ok') {
  const log = $('#liveGuideLog');
  if (!log) return;
  const row = document.createElement('div');
  row.className = cls;
  row.textContent = text;
  log.prepend(row);
  while (log.children.length > 7) log.removeChild(log.lastElementChild);
}

function renderLiveGuide() {
  const total = liveFireGuide.length;
  const complete = currentLiveGuideStep >= total;
  const title = $('#liveGuideTitle');
  const hint = $('#liveGuideHint');
  const list = $('#liveGuideCommandList');
  const counter = $('#liveGuideCounter');
  const bar = $('#liveGuideProgressBar');
  if (!title || !hint || !list || !counter || !bar) return;

  if (complete) {
    title.textContent = 'All live fire steps completed';
    hint.textContent = 'Review Kali output and the live Ubuntu/Wireshark screen for evidence.';
    counter.textContent = `${total}/${total}`;
    list.innerHTML = '<div class="live-command-item done"><div><code>Guide complete</code><span>Continue with authorised lab commands as required.</span></div><b>DONE</b></div>';
    bar.style.width = '100%';
    return;
  }

  const step = liveFireGuide[currentLiveGuideStep];
  const totalCommands = liveFireGuide.reduce((n, s) => n + s.commands.length, 0);
  const completedBefore = liveFireGuide.slice(0, currentLiveGuideStep).reduce((n, s) => n + s.commands.length, 0);
  const completedThis = step.commands.filter(c => c.done).length;
  title.textContent = step.title;
  hint.textContent = step.hint;
  counter.textContent = `${currentLiveGuideStep + 1}/${total}`;
  bar.style.width = `${Math.round(((completedBefore + completedThis) / totalCommands) * 100)}%`;

  const nextIndex = step.commands.findIndex(c => !c.done);
  list.innerHTML = step.commands.map((item, idx) => {
    const state = item.done ? 'done' : (idx === nextIndex ? 'current' : 'pending');
    const label = item.done ? 'DONE' : (idx === nextIndex ? 'RUN NEXT' : 'WAIT');
    return `<div class="live-command-item ${state}"><div><code>${escapeHtml(item.cmd)}</code><span>${escapeHtml(item.help)}</span></div><b>${label}</b></div>`;
  }).join('');
}

function normalizeLiveCommand(raw) {
  return String(raw || '')
    .replace(/\x1b\[[0-9;?]*[~A-Za-z]/g, '')
    .replace(/^.*?[#$]\s*/, '')
    .trim();
}

function processLiveCommand(raw) {
  const cmd = normalizeLiveCommand(raw);
  if (!cmd) return;
  if (currentLiveGuideStep >= liveFireGuide.length) {
    addLiveGuideLog(`Command received: ${cmd}`, 'action-text');
    return;
  }
  const step = liveFireGuide[currentLiveGuideStep];
  const matchIndex = step.commands.findIndex(item => !item.done && item.matches.some(rx => rx.test(cmd)));
  if (matchIndex >= 0) {
    step.commands[matchIndex].done = true;
    addLiveGuideLog(`✓ Accepted: ${cmd}`, 'ok');
    if (step.commands.every(c => c.done)) {
      addLiveGuideLog(`✓ ${step.evidence}`, 'action-text');
      currentLiveGuideStep += 1;
    }
    renderLiveGuide();
    return;
  }
  const next = step.commands.find(item => !item.done);
  addLiveGuideLog(`Command run: ${cmd}. Next expected: ${next ? next.cmd : 'next step'}`, 'warn-text');
}

function handleTerminalInputForGuide(data) {
  for (const ch of String(data || '')) {
    if (ch === '\u0003') {
      liveCommandBuffer = '';
      addLiveGuideLog('Ctrl+C sent to terminal.', 'warn-text');
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      const line = liveCommandBuffer.trim();
      liveCommandBuffer = '';
      if (line) processLiveCommand(line);
      continue;
    }
    if (ch === '\u007f' || ch === '\b') {
      liveCommandBuffer = liveCommandBuffer.slice(0, -1);
      continue;
    }
    if (ch >= ' ') liveCommandBuffer += ch;
  }
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
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      rows: 26,
      cols: 120
    });
    xterm.open(target);
    xterm.writeln('Anonymity Framework Live Fire - Local Kali Terminal');
    xterm.writeln('Connecting to the shell on the machine hosting this website...');
    xterm.onData(data => {
      handleTerminalInputForGuide(data);
      if (localSocket && localShellConnected) localSocket.emit('terminal-input', data);
      else xterm.write('\r\n[local shell not connected yet]\r\n');
    });
    target.addEventListener('click', () => xterm.focus());
    connectLocalTerminal();
  } else {
    setLocalShellStatus('● xterm library missing', false);
  }
  return true;
}

function connectLocalTerminal() {
  if (!window.io) {
    setLocalShellStatus('● Socket.IO missing - start with npm start', false);
    return;
  }
  if (localSocket) return;
  setLocalShellStatus('● Local shell connecting', false);
  localSocket = io();
  localSocket.on('connect', () => localSocket.emit('local-terminal-start'));
  localSocket.on('terminal-ready', msg => {
    localShellConnected = true;
    setLocalShellStatus('● Local Kali shell connected', true);
    addLiveGuideLog(msg || 'Local shell connected.', 'ok');
    renderLiveGuide();
    xterm?.focus();
  });
  localSocket.on('terminal-output', data => xterm?.write(data));
  localSocket.on('terminal-error', msg => {
    localShellConnected = false;
    setLocalShellStatus('● Local shell error', false);
    xterm?.writeln(`\r\n[terminal error] ${msg}`);
    addLiveGuideLog(`Terminal error: ${msg}`, 'bad');
  });
  localSocket.on('disconnect', () => {
    localShellConnected = false;
    setLocalShellStatus('● Local shell disconnected', false);
    addLiveGuideLog('Local shell disconnected.', 'bad');
  });
}

function focusManualTerminal() {
  if (initRealTerminal() && xterm) {
    xterm.focus();
    addLiveGuideLog('Terminal focused.', 'action-text');
  }
}

function sendCtrlC() {
  if (localSocket && localShellConnected) {
    localSocket.emit('terminal-input', '\x03');
    liveCommandBuffer = '';
    xterm?.focus();
    addLiveGuideLog('Ctrl+C sent.', 'warn-text');
  } else if (xterm) {
    xterm.writeln('\r\n[not connected] Ctrl+C not sent.');
  }
}

function resetLiveFire() {
  liveFireGuide.forEach(step => step.commands.forEach(cmd => { cmd.done = false; }));
  currentLiveGuideStep = 0;
  liveCommandBuffer = '';
  const log = $('#liveGuideLog');
  if (log) log.innerHTML = '';
  renderLiveGuide();
  addLiveGuideLog('Guide reset. Start with the first hinted command.', 'warn-text');
}

function setGuacStatus(text, cls = '') {
  const el = $('#guacStatus');
  el.className = `guac-status ${cls}`.trim();
  el.textContent = text;
}

async function connectGuacamole(ev) {
  ev.preventDefault();
  const payload = {
    guacBaseUrl: $('#guacBaseUrl').value.trim(),
    guacAdminUser: $('#guacAdminUser').value.trim(),
    guacAdminPassword: $('#guacAdminPassword').value,
    protocol: $('#targetProtocol').value,
    host: $('#targetHost').value.trim(),
    port: Number($('#targetPort').value),
    username: $('#targetUsername').value.trim(),
    password: $('#targetPassword').value
  };
  setGuacStatus('Creating Apache Guacamole connection...', 'working');
  try {
    const res = await fetch('/api/guac/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Guacamole connection failed.');
    $('#guacFrame').src = data.clientUrl;
    $('#guacPlaceholder').style.display = 'none';
    setGuacStatus(`Connection created: ${data.name}. Login screen/open desktop is loading below.`, 'ok');
  } catch (err) {
    setGuacStatus(err.message || String(err), 'error');
  }
}

function openGuacHome() {
  const base = $('#guacBaseUrl').value.trim();
  if (!base) {
    setGuacStatus('Enter the Guacamole URL first.', 'error');
    return;
  }
  window.open(base, '_blank', 'noopener,noreferrer');
}

/* ═══════════════════════════════════════════════════════════════
   QUICK LAUNCH — helper utilities
═══════════════════════════════════════════════════════════════ */

function qlLog(text, cls = 'ok') {
  const container = $('#qlLog');
  if (!container) return;
  // Remove placeholder idle entry on first real log
  const idle = container.querySelector('.idle');
  if (idle) idle.remove();
  const entry = document.createElement('span');
  entry.className = `ql-log-entry ${cls}`;
  entry.textContent = text;
  container.prepend(entry);
  // Keep max 6 entries
  while (container.children.length > 6) container.removeChild(container.lastChild);
}

function qlSetServerStatus(state) {
  // state: 'offline' | 'starting' | 'online' | 'error'
  const badge = $('#qlServerStatus');
  if (!badge) return;
  const labels = {
    offline:  'SERVER OFFLINE',
    starting: 'SERVER STARTING…',
    online:   'SERVER ONLINE',
    error:    'SERVER ERROR'
  };
  badge.className = `ql-status-badge ${state}`;
  badge.innerHTML = `<span class="ql-dot"></span>${labels[state] || state.toUpperCase()}`;
}

function qlSetGuacStatus(state) {
  // state: 'guac-idle' | 'guac-connecting' | 'guac-live' | 'guac-error'
  const badge = $('#qlGuacStatus');
  if (!badge) return;
  const labels = {
    'guac-idle':       'GUAC IDLE',
    'guac-connecting': 'GUAC CONNECTING…',
    'guac-live':       'GUAC LIVE',
    'guac-error':      'GUAC ERROR'
  };
  badge.className = `ql-status-badge ${state}`;
  badge.innerHTML = `<span class="ql-dot"></span>${labels[state] || state.toUpperCase()}`;
}

function qlSendToTerminal(command) {
  // Ensures the terminal is open, then sends the command followed by Enter
  initRealTerminal();
  if (localSocket && localShellConnected) {
    localSocket.emit('terminal-input', command + '\r');
    if (xterm) xterm.focus();
    return true;
  }
  // Not connected yet — show warning and try writing to xterm buffer
  if (xterm) {
    xterm.writeln(`\r\n\x1b[33m[quick-launch] Shell not ready — command queued: ${command}\x1b[0m`);
    xterm.writeln('\x1b[33m[quick-launch] Wait for "shell connected" then retry.\x1b[0m');
    xterm.focus();
  }
  qlLog('Shell not connected. Connect first then retry.', 'warn');
  return false;
}

/* ── npm install ──────────────────────────────────────────────── */
function quickNpmInstall() {
  const cmd = 'npm install';
  qlLog(`▶ Sending: ${cmd}`, 'action');
  if (qlSendToTerminal(cmd)) {
    qlLog('npm install dispatched to terminal.', 'ok');
  }
}

/* ── npm start ────────────────────────────────────────────────── */
let serverRunning = false;

function quickNpmStart() {
  if (serverRunning) {
    qlLog('Server already started this session.', 'warn');
    return;
  }
  const cmd = 'npm start';
  qlLog(`▶ Sending: ${cmd}`, 'action');
  if (qlSendToTerminal(cmd)) {
    qlSetServerStatus('starting');
    qlLog('npm start dispatched — watching for server ready…', 'ok');
    serverRunning = true;
    // Show stop button, hide start
    $('#btnNpmStart')?.classList.add('hidden');
    $('#btnNpmStop')?.classList.remove('hidden');
    // Intercept terminal output to detect "listening" / port confirmation
    const origOutput = (data) => {
      if (/listening|started|port\s+\d+|http:\/\//i.test(data)) {
        qlSetServerStatus('online');
        qlLog('✓ Server detected as online.', 'ok');
      }
      if (/error|EADDRINUSE|ENOENT/i.test(data)) {
        qlSetServerStatus('error');
        qlLog('⚠ Server error detected — check terminal output.', 'warn');
      }
    };
    // Attach a one-time output monitor via the socket
    if (localSocket) {
      const monitor = (data) => origOutput(String(data));
      localSocket.on('terminal-output', monitor);
      // Detach after 15 s (server either started or errored)
      setTimeout(() => localSocket.off('terminal-output', monitor), 15000);
    }
  }
}

function quickNpmStop() {
  sendCtrlC(); // reuse existing Ctrl+C helper
  serverRunning = false;
  qlSetServerStatus('offline');
  $('#btnNpmStop')?.classList.add('hidden');
  $('#btnNpmStart')?.classList.remove('hidden');
  qlLog('Ctrl+C sent — server stopping.', 'warn');
}

/* ── Guacamole quick launch ───────────────────────────────────── */
async function quickLaunchGuacamole() {
  // Read values from the existing connection form
  const baseUrl  = $('#guacBaseUrl')?.value.trim();
  const adminUser = $('#guacAdminUser')?.value.trim();
  const adminPass = $('#guacAdminPassword')?.value;
  const protocol = $('#targetProtocol')?.value;
  const host     = $('#targetHost')?.value.trim();
  const port     = $('#targetPort')?.value;
  const uname    = $('#targetUsername')?.value.trim();
  const upass    = $('#targetPassword')?.value;

  if (!baseUrl || !host) {
    qlLog('⚠ Fill in Guacamole URL and Ubuntu IP below first.', 'warn');
    // Scroll to the guac form
    $('#guacBaseUrl')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#guacBaseUrl')?.focus();
    qlSetGuacStatus('guac-error');
    return;
  }

  qlSetGuacStatus('guac-connecting');
  qlLog(`▶ Connecting to Guacamole at ${baseUrl}…`, 'action');
  setGuacStatus('Quick-launching Guacamole connection…', 'working');

  try {
    const res = await fetch('/api/guac/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guacBaseUrl: baseUrl,
        guacAdminUser: adminUser,
        guacAdminPassword: adminPass,
        protocol: protocol || 'rdp',
        host,
        port: Number(port) || 3389,
        username: uname,
        password: upass
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Guacamole connection failed.');

    // Load into the existing guac iframe
    $('#guacFrame').src = data.clientUrl;
    const placeholder = $('#guacPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    setGuacStatus(`✓ Connected: ${data.name}`, 'ok');
    qlSetGuacStatus('guac-live');
    qlLog(`✓ Guacamole live: ${data.name}`, 'ok');

    // Update URL preview badge
    const preview = $('#qlGuacUrlText');
    if (preview) preview.textContent = baseUrl;

  } catch (err) {
    const msg = err.message || String(err);
    setGuacStatus(msg, 'error');
    qlSetGuacStatus('guac-error');
    qlLog(`✗ Guacamole error: ${msg}`, 'bad');
  }
}

/* ── Open Guacamole in a new browser tab ─────────────────────── */
function quickOpenGuacTab() {
  const base = $('#guacBaseUrl')?.value.trim();
  if (!base) {
    qlLog('⚠ Enter Guacamole URL in the form below first.', 'warn');
    $('#guacBaseUrl')?.focus();
    return;
  }
  window.open(base, '_blank', 'noopener,noreferrer');
  qlLog(`↗ Opened Guacamole home in new tab: ${base}`, 'ok');
}

/* ── Copy helpers ─────────────────────────────────────────────── */
async function qlCopyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    qlLog(`Copied: ${label}`, 'ok');
  } catch {
    qlLog(`Copy failed — clipboard not available.`, 'warn');
  }
}

/* ── Sync Guacamole URL preview in Quick Launch ──────────────── */
function syncGuacUrlPreview() {
  const val = $('#guacBaseUrl')?.value.trim();
  const el = $('#qlGuacUrlText');
  if (el) el.textContent = val || 'configure URL below ↓';
}

function bindEvents() {
  // Internal Anonymity Framework tabs only. External mode buttons use module switching below.
  $$('.nav-btn[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    $$('.nav-btn[data-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.tab-panel').forEach(panel => panel.classList.remove('active'));
    $(`#${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'testing') initRealTerminal();
  }));

  // Direct access buttons for sibling modules.
  // Standalone mode: normal href navigation.
  // Portal iframe mode: ask the parent SOC-TRAIN portal to switch modules cleanly.
  $$('.module-switch-btn[data-module-path]').forEach(btn => btn.addEventListener('click', (event) => {
    if (window.parent && window.parent !== window) {
      event.preventDefault();
      window.parent.postMessage({
        type: 'SOC_OPEN_MODULE',
        path: btn.dataset.modulePath,
        title: btn.dataset.moduleTitle,
        id: btn.dataset.moduleId
      }, '*');
    }
  }));

  $('#copyConfigCommand')?.addEventListener('click', copyConfigCommand);
  $('#simulateConfigRun')?.addEventListener('click', simulateConfigRun);
  $('#resetConfigTerminal')?.addEventListener('click', clearConfigTerminal);
  $('#focusTerminal')?.addEventListener('click', focusManualTerminal);
  $('#sendCtrlC')?.addEventListener('click', sendCtrlC);
  $('#resetLiveGuide')?.addEventListener('click', resetLiveFire);
  $('#guacForm')?.addEventListener('submit', connectGuacamole);
  $('#openGuacHome')?.addEventListener('click', openGuacHome);
  $('#targetProtocol')?.addEventListener('change', (e) => {
    $('#targetPort').value = e.target.value === 'vnc' ? '5900' : '3389';
  });

  // ── Quick Launch bindings ──────────────────────────────────── //
  $('#btnNpmInstall')?.addEventListener('click', quickNpmInstall);
  $('#btnNpmStart')?.addEventListener('click', quickNpmStart);
  $('#btnNpmStop')?.addEventListener('click', quickNpmStop);
  $('#btnQuickGuac')?.addEventListener('click', quickLaunchGuacamole);
  $('#btnOpenGuacTab')?.addEventListener('click', quickOpenGuacTab);
  $('#btnCopyInstall')?.addEventListener('click', () => qlCopyText('npm install', 'npm install'));
  $('#btnCopyStart')?.addEventListener('click', () => qlCopyText('npm start', 'npm start'));

  // Keep Guacamole URL preview in sync as user types
  $('#guacBaseUrl')?.addEventListener('input', syncGuacUrlPreview);
  // Initial sync
  syncGuacUrlPreview();
}

function init() {
  renderTraining();
  renderConfigMenu();
  loadConfigStep(0);
  renderLiveGuide();
  bindEvents();
}

init();
