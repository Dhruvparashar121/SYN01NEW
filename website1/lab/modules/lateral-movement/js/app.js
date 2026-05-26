const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('show');
  });
}, { threshold: 0.14 });
reveals.forEach((el) => observer.observe(el));

const scrollButtons = document.querySelectorAll('[data-scroll]');
scrollButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.querySelector(btn.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const terminalLines = [
  'Exercise start: Red Team source 30.0.30.17 begins controlled activity in VLAN 30.',
  'White Team 10.0.10.26 receives the scenario context and maintains the trusted exercise timeline.',
  'Traffic advances toward DMZ host 10.0.40.106 in VLAN 40, where exposed-service interaction becomes visible.',
  'Defenders watch for the critical transition from DMZ traffic to Blue VLAN 20 activity.',
  'Pivot host 10.0.20.112 becomes the main investigation focus when it communicates with internal webservers.',
  'Blue Team correlates packet flow, authentication events, endpoint evidence, and White Team notes for after-action review.'
];

const terminal = document.getElementById('terminalText');
let terminalIndex = 0;
let charIndex = 0;
function typeTerminal() {
  if (!terminal) return;
  if (terminalIndex >= terminalLines.length) return;
  const line = terminalLines[terminalIndex];
  terminal.textContent += line.charAt(charIndex);
  charIndex += 1;
  if (charIndex < line.length) {
    setTimeout(typeTerminal, 22);
  } else {
    terminal.textContent += '\n';
    terminalIndex += 1;
    charIndex = 0;
    setTimeout(typeTerminal, 340);
  }
}
setTimeout(typeTerminal, 650);

const stages = [
  {
    tag: 'Stage 1',
    title: 'Boundary contact from Red Team into the supervised chain',
    focus: 'Red VLAN 30 → White VLAN 10',
    text: 'The exercise begins with activity originating from the Red Team source system. The key learning point is that White Team VLAN 10 sits between Red and the DMZ, allowing supervision, inject control, and trusted timeline creation before traffic reaches the exposed service layer.',
    intent: [
      'Generate controlled adversary pressure from the source system.',
      'Establish the start of the movement chain for later correlation.',
      'Create a clear point of reference for the exercise timeline.'
    ],
    signal: [
      'White Team notes confirm exercise timing and scenario context.',
      'Boundary observations show traffic moving from Red VLAN 30 into White VLAN 10.',
      'Defenders can separate approved exercise activity from unrelated noise.'
    ],
    telemetry: ['Exercise clock', 'Control notes', 'Boundary log', 'Red source'],
    activePaths: [0],
    severity: 'Controlled entry'
  },
  {
    tag: 'Stage 2',
    title: 'Supervised transition toward the DMZ',
    focus: 'White VLAN 10 → DMZ VLAN 40',
    text: 'Once the White Team has framed the scenario, the training path proceeds to the DMZ host 10.0.40.106. Learners should understand that the DMZ is reachable by design, but every transition into it should still have a reason, source, and timestamp.',
    intent: [
      'Move the scenario toward the exposed service tier.',
      'Demonstrate how approved traffic reaches the DMZ layer.',
      'Provide a baseline for later comparison when behaviour changes.'
    ],
    signal: [
      'DMZ service logs begin to reflect the exercise path.',
      'Packet flow aligns with the White Team exercise record.',
      'IDS or monitoring points can confirm the DMZ-facing interaction.'
    ],
    telemetry: ['DMZ logs', 'Packet trace', 'IDS event', 'White timeline'],
    activePaths: [0, 1],
    severity: 'Supervised DMZ reach'
  },
  {
    tag: 'Stage 3',
    title: 'Discovery and identity misuse at the DMZ boundary',
    focus: 'DMZ VLAN 40 → Blue VLAN 20',
    text: 'This stage changes the investigation posture. When the DMZ host begins reaching toward Blue VLAN 20, defenders must ask why the exposed service tier is now involved in east-west movement. This is where discovery activity, trust-path abuse, or credential misuse becomes important.',
    intent: [
      'Identify reachable internal systems beyond the DMZ.',
      'Locate the Blue Team pivot host 10.0.20.112.',
      'Test whether accounts, services, or rules allow deeper movement.'
    ],
    signal: [
      'New or unusual sessions appear from DMZ VLAN 40 toward Blue VLAN 20.',
      'Authentication attempts may appear from an unexpected source zone.',
      'Baseline drift becomes visible in flow, DNS, ARP, or service behaviour.'
    ],
    telemetry: ['East-west flow', 'Auth logs', 'DNS / ARP', 'Baseline drift'],
    activePaths: [0, 1, 2],
    severity: 'Suspicious boundary crossing'
  },
  {
    tag: 'Stage 4',
    title: 'Pivot host activity inside Blue VLAN 20',
    focus: 'Blue pivot host 10.0.20.112',
    text: 'The pivot host is the bridge to deeper internal assets. In this lab, 10.0.20.112 is important because it can reach the Blue Team webservers. Unexpected connections initiated by this host should be treated as a high-value investigation point.',
    intent: [
      'Use the pivot host as a bridge into the internal environment.',
      'Reach systems not directly reachable from Red or the DMZ.',
      'Prepare access to application targets inside Blue VLAN 20.'
    ],
    signal: [
      'Pivot host initiates new outbound sessions to internal targets.',
      'Endpoint processes begin creating network connections atypical for the host.',
      'Remote service usage becomes visible in logs or telemetry.'
    ],
    telemetry: ['Pivot egress', 'Process tree', 'Remote service', 'Host logs'],
    activePaths: [0, 1, 2, 3, 4],
    severity: 'High-confidence pivoting'
  },
  {
    tag: 'Stage 5',
    title: 'Internal webserver access and full-path correlation',
    focus: '10.0.20.112 → 10.0.20.20 / 10.0.20.25',
    text: 'The final stage reaches the Blue Team webservers. At this point, defenders and White Team controllers should correlate the entire chain: packet movement, authentication history, endpoint actions, web logs, and the exercise timeline.',
    intent: [
      'Reach protected application servers.',
      'Attempt realistic target interaction, data access, or persistence behaviour.',
      'Demonstrate how one compromise can expand into deeper internal impact.'
    ],
    signal: [
      'Webserver sessions appear from the pivot host.',
      'File, service, or application anomalies may emerge on target systems.',
      'SIEM correlation can now reconstruct the full VLAN-to-VLAN chain.'
    ],
    telemetry: ['Web logs', 'File changes', 'SIEM chain', 'AAR timeline'],
    activePaths: [0, 1, 2, 3, 4],
    severity: 'Critical internal asset access'
  }
];

const nodes = [
  { label: 'Red Team', ip: '30.0.30.17', role: 'Attacker', vlan: 'VLAN 30', x: 118, y: 250, color: '#7f1d1d', border: '#fb7185', text: '#ffffff' },
  { label: 'White Team', ip: '10.0.10.26', role: 'Control / Observer', vlan: 'VLAN 10', x: 338, y: 250, color: '#cbd5e1', border: '#f8fafc', text: '#111827' },
  { label: 'DMZ Host', ip: '10.0.40.106', role: 'Exposed service', vlan: 'VLAN 40', x: 558, y: 250, color: '#facc15', border: '#fef08a', text: '#111827' },
  { label: 'Pivot Host', ip: '10.0.20.112', role: 'Internal bridge', vlan: 'VLAN 20', x: 778, y: 250, color: '#1d4ed8', border: '#67e8f9', text: '#ffffff' },
  { label: 'Webserver 1', ip: '10.0.20.20', role: 'Application target', vlan: 'VLAN 20', x: 915, y: 160, color: '#172554', border: '#38bdf8', text: '#ffffff' },
  { label: 'Webserver 2', ip: '10.0.20.25', role: 'Application target', vlan: 'VLAN 20', x: 915, y: 340, color: '#172554', border: '#38bdf8', text: '#ffffff' }
];

const paths = [
  { d: 'M182 250 L274 250', color: '#fb7185', marker: 'url(#stageArrowRed)' },
  { d: 'M402 250 L494 250', color: '#f8fafc', marker: 'url(#stageArrowWhite)' },
  { d: 'M622 250 L714 250', color: '#facc15', marker: 'url(#stageArrowDmz)' },
  { d: 'M842 232 L885 232 L885 160 L851 160', color: '#38bdf8', marker: '' },
  { d: 'M842 268 L885 268 L885 340 L851 340', color: '#38bdf8', marker: '' }
];

function stageNodeSvg(node) {
  return `
    <g transform="translate(${node.x} ${node.y})">
      <rect x="-64" y="-52" width="128" height="104" rx="20" fill="${node.color}" stroke="${node.border}" stroke-width="2" opacity="0.95"></rect>
      <text y="-16" text-anchor="middle" class="stage-node-label" fill="${node.text}">${node.label}</text>
      <text y="6" text-anchor="middle" class="stage-node-ip" fill="${node.text}">${node.ip}</text>
      <text y="28" text-anchor="middle" class="stage-node-role" fill="${node.text}">${node.role}</text>
      <text y="45" text-anchor="middle" class="stage-node-role" fill="${node.text}">${node.vlan}</text>
    </g>`;
}

function renderStage(index) {
  const stage = stages[index];
  document.getElementById('stageTag').textContent = stage.tag;
  document.getElementById('stageTitle').textContent = stage.title;
  document.getElementById('stageText').textContent = stage.text;
  document.getElementById('stageMeta').innerHTML = `
    <span>${stage.focus}</span>
    <span>${stage.severity}</span>`;
  document.getElementById('intentList').innerHTML = stage.intent.map((item) => `<li>${item}</li>`).join('');
  document.getElementById('signalList').innerHTML = stage.signal.map((item) => `<li>${item}</li>`).join('');
  document.querySelectorAll('.stage').forEach((btn, i) => btn.classList.toggle('active', i === index));
  renderVisual(stage);
}

function renderVisual(stage) {
  const active = new Set(stage.activePaths);
  const pathSvg = paths.map((path, i) => `
    <path id="sp${i}" class="stage-path" d="${path.d}" stroke="${active.has(i) ? path.color : 'rgba(148,163,184,.20)'}" opacity="${active.has(i) ? 0.95 : 0.35}" ${path.marker ? `marker-end="${active.has(i) ? path.marker : 'url(#stageArrowMuted)'}"` : ''}></path>`).join('');
  const packets = paths.map((path, i) => active.has(i) ? `
    <circle r="7" fill="${path.color}" class="stage-packet">
      <animateMotion dur="2.6s" begin="${i * 0.22}s" repeatCount="indefinite"><mpath href="#sp${i}" /></animateMotion>
    </circle>` : '').join('');

  const visual = document.getElementById('stageVisual');
  visual.innerHTML = `
    <svg class="stage-svg" viewBox="0 0 980 420" role="img" aria-label="${stage.title}">
      <defs>
        <marker id="stageArrowRed" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L11,4 z" fill="#fb7185"/></marker>
        <marker id="stageArrowWhite" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L11,4 z" fill="#f8fafc"/></marker>
        <marker id="stageArrowDmz" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L11,4 z" fill="#facc15"/></marker>
        <marker id="stageArrowBlue" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L11,4 z" fill="#38bdf8"/></marker>
        <marker id="stageArrowMuted" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,8 L11,4 z" fill="rgba(148,163,184,.35)"/></marker>
      </defs>
      <rect x="22" y="48" width="190" height="320" rx="24" class="stage-zone red"></rect>
      <rect x="242" y="48" width="190" height="320" rx="24" class="stage-zone white"></rect>
      <rect x="462" y="48" width="190" height="320" rx="24" class="stage-zone dmz"></rect>
      <rect x="682" y="48" width="276" height="320" rx="24" class="stage-zone blue"></rect>

      <g transform="translate(40 66)">
        <rect width="154" height="48" rx="14" class="stage-zone-chip red"></rect>
        <text x="77" y="20" text-anchor="middle" class="stage-zone-label">RED TEAM</text>
        <text x="77" y="37" text-anchor="middle" class="stage-zone-vlan">VLAN 30</text>
      </g>
      <g transform="translate(260 66)">
        <rect width="154" height="48" rx="14" class="stage-zone-chip white"></rect>
        <text x="77" y="20" text-anchor="middle" class="stage-zone-label dark">WHITE TEAM</text>
        <text x="77" y="37" text-anchor="middle" class="stage-zone-vlan dark">VLAN 10</text>
      </g>
      <g transform="translate(480 66)">
        <rect width="154" height="48" rx="14" class="stage-zone-chip dmz"></rect>
        <text x="77" y="20" text-anchor="middle" class="stage-zone-label dark">DMZ</text>
        <text x="77" y="37" text-anchor="middle" class="stage-zone-vlan dark">VLAN 40</text>
      </g>
      <g transform="translate(740 66)">
        <rect width="154" height="48" rx="14" class="stage-zone-chip blue"></rect>
        <text x="77" y="20" text-anchor="middle" class="stage-zone-label">BLUE TEAM</text>
        <text x="77" y="37" text-anchor="middle" class="stage-zone-vlan">VLAN 20</text>
      </g>

      ${pathSvg}
      ${packets}
      ${nodes.map(stageNodeSvg).join('')}
    </svg>`;

  document.getElementById('stageTelemetry').innerHTML = stage.telemetry.map((item) => `<span>${item}</span>`).join('');
}

document.querySelectorAll('.stage').forEach((btn) => {
  btn.addEventListener('click', () => renderStage(Number(btn.dataset.stage)));
});
renderStage(0);

const questions = [
  {
    q: 'Which sequence correctly matches the amended lab topology?',
    opts: [
      'Red VLAN 30 → DMZ VLAN 40 → White VLAN 10 → Blue VLAN 20',
      'Red VLAN 30 → White VLAN 10 → DMZ VLAN 40 → Blue VLAN 20',
      'White VLAN 10 → Red VLAN 30 → Blue VLAN 20 → DMZ VLAN 40'
    ],
    a: 1
  },
  {
    q: 'Which IP belongs to the White Team control / observer system?',
    opts: ['10.0.10.26', '10.0.20.112', '10.0.40.106'],
    a: 0
  },
  {
    q: 'Why is the DMZ to Blue VLAN transition important?',
    opts: [
      'It usually represents a shift from exposed-zone activity into internal lateral movement risk.',
      'It proves the traffic is safe because both systems are in the same exercise.',
      'It means the White Team timeline is no longer relevant.'
    ],
    a: 0
  },
  {
    q: 'Which host is the pivot in Blue VLAN 20?',
    opts: ['30.0.30.17', '10.0.20.112', '10.0.20.20'],
    a: 1
  },
  {
    q: 'What is the main purpose of adding White Team between Red and DMZ?',
    opts: [
      'To provide exercise control, supervision, and trusted timeline validation.',
      'To replace Blue Team monitoring.',
      'To act as the only DMZ host.'
    ],
    a: 0
  },
  {
    q: 'Which VLAN is assigned to the DMZ segment?',
    opts: ['VLAN 10', 'VLAN 30', 'VLAN 40'],
    a: 2
  },
  {
    q: 'What is the strongest investigation method in this module?',
    opts: [
      'Checking only one network alert in isolation.',
      'Correlating packet flow, authentication, endpoint, firewall/IDS, and White Team notes.',
      'Ignoring VLAN context once any host replies.'
    ],
    a: 1
  },
  {
    q: 'Which internal targets are shown after the pivot host?',
    opts: ['10.0.20.20 and 10.0.20.25', '10.0.10.26 and 10.0.40.106', '30.0.30.17 and 10.0.20.112'],
    a: 0
  }
];

const quizBox = document.getElementById('quizBox');
if (quizBox) {
  quizBox.innerHTML = questions.map((question, i) => `
    <div class="q">
      <h4>${i + 1}. ${question.q}</h4>
      ${question.opts.map((opt, j) => `
        <label><input type="radio" name="q${i}" value="${j}"> ${opt}</label>`).join('')}
    </div>`).join('');

  document.getElementById('checkQuiz').addEventListener('click', () => {
    let score = 0;
    questions.forEach((question, i) => {
      const checked = document.querySelector(`input[name="q${i}"]:checked`);
      if (checked && Number(checked.value) === question.a) score += 1;
    });
    document.getElementById('scoreText').textContent = `Score: ${score}/${questions.length}. ${score === questions.length ? 'Excellent — you have a strong grasp of the amended framework.' : 'Review the topology, VLAN boundaries, and five-stage walkthrough, then try again.'}`;
  });
}
