const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const configMeta = [
  {
    title: 'Start Machine',
    tag: 'STEP 1',
    visual: 'assets/config-step1-start.svg',
    desc: 'Boot the Kali-style client in isolated training mode before any routing is applied.',
    cfg: `# STEP 1: Start Client Machine\nMACHINE_NAME=KALI-CLIENT\nMODE=TRAINING_SIMULATION\nSTATUS=BOOTED\nLAB_NETWORK=ISOLATED`,
    cmd: `# STEP 1 - Start client machine profile (safe lab simulation)\nmkdir -p ~/anonymity-framework-lab\ncat > ~/anonymity-framework-lab/step1-start-machine.conf <<'EOF2'\nMACHINE_NAME=KALI-CLIENT\nMODE=TRAINING_SIMULATION\nSTATUS=BOOTED\nLAB_NETWORK=ISOLATED\nEOF2\necho "[OK] Kali client profile created"\ncat ~/anonymity-framework-lab/step1-start-machine.conf`
  },
  {
    title: 'Client IP',
    tag: 'STEP 2',
    visual: 'assets/config-step2-client-ip.svg',
    desc: 'Assign or verify the local client identity, interface, DNS, and logging.',
    cfg: `# STEP 2: Client Network Identity\nCLIENT_IP=10.0.30.10\nCLIENT_INTERFACE=eth0\nDNS_SERVER=1.1.1.1\nLOGGING=ENABLED`,
    cmd: `# STEP 2 - Record client IP settings (safe lab simulation)\ncat > ~/anonymity-framework-lab/step2-client-ip.conf <<'EOF2'\nCLIENT_IP=10.0.30.10\nCLIENT_INTERFACE=eth0\nDNS_SERVER=1.1.1.1\nLOGGING=ENABLED\nEOF2\necho "[INFO] Current interface view:"\nip addr show eth0 2>/dev/null || ip addr\necho "[OK] Client identity settings saved"`
  },
  {
    title: 'Firewall Route',
    tag: 'STEP 3',
    visual: 'assets/config-step3-firewall.svg',
    desc: 'Set the default gateway and keep forwarding restricted to the lab network.',
    cfg: `# STEP 3: Firewall / Gateway Route\nDEFAULT_GATEWAY=10.0.30.1\nFIREWALL_POLICY=ALLOW_LAB_TRAFFIC_ONLY\nBLOCK_EXTERNAL_UNTRUSTED=true`,
    cmd: `# STEP 3 - Save firewall/gateway route policy (safe lab simulation)\ncat > ~/anonymity-framework-lab/step3-firewall-route.conf <<'EOF2'\nDEFAULT_GATEWAY=10.0.30.1\nFIREWALL_POLICY=ALLOW_LAB_TRAFFIC_ONLY\nBLOCK_EXTERNAL_UNTRUSTED=true\nEOF2\necho "[INFO] Route table preview:"\nip route show\necho "[OK] Lab-only gateway policy saved"`
  },
  {
    title: 'VPS-1 VPN Relay',
    tag: 'STEP 4',
    visual: 'assets/config-step4-vps1.svg',
    desc: 'Route traffic through the first relay; the visible source changes to the VPS-1 IP.',
    cfg: `# STEP 4: VPS-1 Relay\nVPS1_IP=10.0.10.26\nVPS1_ROLE=VPN_RELAY\nFORWARD_TO=10.0.20.102\nNAT_VISUALIZATION=ENABLED`,
    cmd: `# STEP 4 - Save VPS-1 relay profile (safe lab simulation)\ncat > ~/anonymity-framework-lab/step4-vps1-relay.conf <<'EOF2'\nVPS1_IP=10.0.10.26\nVPS1_ROLE=VPN_RELAY\nFORWARD_TO=10.0.20.102\nNAT_VISUALIZATION=ENABLED\nEOF2\necho "[OK] VPS-1 relay profile saved"\necho "Observable source after VPN relay: 10.0.10.26"`
  },
  {
    title: 'VPS-2 Secondary Relay',
    tag: 'STEP 5',
    visual: 'assets/config-step5-vps2.svg',
    desc: 'Add a second relay layer before Tor-style exit rotation.',
    cfg: `# STEP 5: VPS-2 Relay\nVPS2_IP=10.0.20.102\nVPS2_ROLE=SECONDARY_RELAY\nFORWARD_TO=TOR_GATEWAY\nCHAIN_STATUS=ACTIVE`,
    cmd: `# STEP 5 - Save VPS-2 relay profile (safe lab simulation)\ncat > ~/anonymity-framework-lab/step5-vps2-relay.conf <<'EOF2'\nVPS2_IP=10.0.20.102\nVPS2_ROLE=SECONDARY_RELAY\nFORWARD_TO=TOR_GATEWAY\nCHAIN_STATUS=ACTIVE\nEOF2\necho "[OK] VPS-2 relay profile saved"\necho "Relay chain: CLIENT -> FIREWALL -> VPS1 -> VPS2"`
  },
  {
    title: 'Tor Gateway',
    tag: 'STEP 6',
    visual: 'assets/config-step6-tor.svg',
    desc: 'Enable simulated Tor routing; blue team sees the Tor-side visible IP before the IT network.',
    cfg: `# STEP 6: Tor Gateway\nTOR_STATUS=ENABLED\nTOR_SOCKS_PORT=9050\nTOR_DNS_PORT=5353\nEXIT_POLICY=LAB_ONLY\nROTATE_EXIT_NODES=true`,
    cmd: `# STEP 6 - Save Tor gateway profile (safe lab simulation)\ncat > ~/anonymity-framework-lab/step6-tor-gateway.conf <<'EOF2'\nTOR_STATUS=ENABLED\nTOR_SOCKS_PORT=9050\nTOR_DNS_PORT=5353\nEXIT_POLICY=LAB_ONLY\nROTATE_EXIT_NODES=true\nEOF2\necho "[OK] Tor gateway profile saved"\necho "Simulated visible Tor-side IP: 10.0.40.102"`,
    tor: true
  }
];

const hints = [
  'Step 1: Start the Kali client machine and verify isolated lab mode.',
  'Step 2: Configure the client IP address, interface, DNS, and logging.',
  'Step 3: Apply the firewall/gateway route for lab-only traffic forwarding.',
  'Step 4: Enable VPS-1 as a VPN-style relay. Observable source becomes 10.0.10.26.',
  'Step 5: Add VPS-2 as the secondary relay before Tor-style routing.',
  'Step 6: Enable simulated Tor gateway and visible Tor-side IP monitoring.'
];

const allConfigText = configMeta.map(x => x.cfg).join('\n\n');

const topics = {
  what: `<div class="article"><img class="ai-visual" src="assets/what-framework.svg" alt="AI generated anonymity framework visual"><h3>What is an Anonymity Framework?</h3><p><strong>Basic:</strong> An anonymity framework is a controlled routing model that hides the direct source identity of a client by passing traffic through multiple privacy layers.</p><p><strong>Intermediate:</strong> Instead of allowing a destination host to see the original client directly, traffic is represented as moving through a firewall, relay servers, VPN-like hops, and a Tor-like exit layer.</p><p><strong>Advanced:</strong> In a professional training lab, this framework teaches routing separation, traffic masking, visibility gaps, packet monitoring, source attribution challenges, DNS leakage awareness, and defensive log correlation.</p><div class="article-grid"><div class="info-tile"><h4>Client</h4><p>Origin workstation used by the tester in the isolated lab.</p></div><div class="info-tile"><h4>Relays</h4><p>Intermediate nodes that visually change the observable source path.</p></div><div class="info-tile"><h4>Blue Team</h4><p>Observer role that monitors traffic changes in Wireshark-style logs.</p></div></div></div>`,
  importance: `<div class="article"><img class="ai-visual" src="assets/importance.svg" alt="AI generated importance visual"><h3>Importance of the Framework</h3><p><strong>For ethical hackers:</strong> It teaches how network paths, proxy layers, VPN relays, and Tor-like routing affect source visibility during authorized testing.</p><p><strong>For defenders:</strong> It shows how traffic can look different at each monitoring point, and why packet evidence must be correlated with firewall, endpoint, and gateway logs.</p><p><strong>For students:</strong> It connects theory with visual demonstration: normal traffic, VPN-routed traffic, multi-hop relay traffic, and traceroute analysis can be compared side by side.</p><p><strong>Advanced lesson:</strong> IP masking alone does not guarantee anonymity. Browser fingerprints, timing analysis, DNS leaks, endpoint logs, authentication events, and misconfigured routes can still reveal identity.</p></div>`,
  configs: `<div class="article"><h3>Configuration Files Overview</h3><p>The following sample snippets are used in the configuration module for guided copy/paste practice.</p><div class="config-file-list"><div class="config-file-box"><h4>all-configs.conf</h4><p>Combined lab configuration summary</p><pre>${escapeHtml(allConfigText)}</pre></div></div></div>`,
  setup: `<div class="article"><img class="ai-visual" src="assets/detailed-setup.svg" alt="AI generated detailed setup visual"><h3>Detailed Setup Steps</h3><ol><li><strong>Client → Firewall:</strong> Start the client and verify the lab-only gateway policy.</li><li><strong>Firewall → VPS-1:</strong> Enable the first relay and confirm the visible source becomes <code>10.0.10.26</code>.</li><li><strong>VPS-1 → VPS-2:</strong> Add the second relay so traffic continues deeper into the chain.</li><li><strong>VPS-2 → Tor:</strong> Enable the Tor gateway or SOCKS stage to protect the upstream route.</li><li><strong>Tor → IT Network:</strong> Inspect the destination-side visibility and compare it with the origin identity.</li></ol><p>This simulation is for safe, controlled learning only.</p></div>`
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
  packetNo += 1;
  const tr = document.createElement('tr');
  tr.className = 'new-packet';
  const now = new Date().toLocaleTimeString();
  const p = proto.toLowerCase();
  const cls = p.includes('icmp') ? 'icmp' : p.includes('vpn') ? 'vpn' : p.includes('tor') ? 'tor' : p.includes('trace') ? 'vpn' : 'tcp';
  tr.innerHTML = `<td>${packetNo}</td><td>${now}</td><td>${src}</td><td>${dst}</td><td><span class="proto ${cls}">${proto}</span></td><td>${info}</td>`;
  $('#packetBody').prepend(tr);
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
  $('#kaliTerminal').innerHTML = '';
  $('#packetBody').innerHTML = '';
  currentIP = '10.0.30.10';
  packetNo = 0;
  terminalLine($('#kaliTerminal'), 'ready');
  systemLine($('#kaliTerminal'), 'Lab reset. Current IP: 10.0.30.10', 'ok');
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

function getVisualPathForRows(data, rows) {
  if (!rows.length) return [];
  const lastNode = rows[rows.length - 1].node;
  const lastIdx = data.pathNodes.indexOf(lastNode);
  return lastIdx >= 0 ? data.pathNodes.slice(0, lastIdx + 1) : rows.map(x => x.node);
}

function setTraceSource(source) {
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
  badge.textContent = text;
  badge.className = `trace-status ${cls}`;
}

function renderTraceTable(rows) {
  const body = $('#traceTableBody');
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

  $('#startPing').addEventListener('click', startPing);
  $('#enableVpn').addEventListener('click', enableVpn);
  $('#enableTor').addEventListener('click', enableTor);
  $('#clearLab').addEventListener('click', clearLab);

  $$('.trace-source-btn').forEach(btn => btn.addEventListener('click', () => {
    traceCompleted = false;
    setTraceSource(btn.dataset.traceSource);
  }));
  $('#startTraceroute').addEventListener('click', () => runTraceroute(true));
  $('#replayTraceroute').addEventListener('click', () => runTraceroute(true));
  $('#showAnimatedFlow').addEventListener('click', showAnimatedFlowOnly);
  $('#resetTraceroute').addEventListener('click', resetTraceroute);

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
setTopic('what');
loadConfigStep(0);
clearLab();
setTraceSource('client');
resetLiveFire();
initRealTerminal();
bindEvents();
