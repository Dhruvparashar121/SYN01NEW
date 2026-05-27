/* ══════════════════════════════════════════════════
   SOC-TRAIN Portal JS — full logic preserved
══════════════════════════════════════════════════ */

const chooser   = document.getElementById('chooser');
const viewer    = document.getElementById('viewerSection');
const frame     = document.getElementById('moduleFrame');
const titleEl   = document.getElementById('viewerTitle');
const moduleId  = document.getElementById('viewerModuleId');

const openButtons = [...document.querySelectorAll('[data-module]')].filter(
  el => el.classList.contains('module-card') || el.classList.contains('switcher')
);

function openModule(path, title, id) {
  frame.src = path;
  titleEl.textContent = title;
  if (moduleId) moduleId.textContent = id || '--';
  chooser.classList.add('hidden');
  viewer.classList.remove('hidden');
  document.title = `${title} // SOC-TRAIN`;
}

openButtons.forEach(btn =>
  btn.addEventListener('click', () =>
    openModule(btn.dataset.module, btn.dataset.title, btn.dataset.id)
  )
);



/* ── Cross-module navigation from modules loaded inside the iframe ── */
window.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'SOC_OPEN_MODULE' || !data.path) return;

  const allowedModules = new Set([
    'modules/anonymity-framework/index.html',
    'modules/lateral-movement/index.html',
    'modules/geofencing/index.html'
  ]);

  if (!allowedModules.has(data.path)) return;
  openModule(data.path, data.title || 'Training Module', data.id || '--');
});

document.getElementById('backBtn').addEventListener('click', () => {
  frame.src = 'about:blank';
  chooser.classList.remove('hidden');
  viewer.classList.add('hidden');
  document.title = 'SOC-TRAIN // Unified Cyber Training Platform';
});

/* ── Session timer ──────────────────────────────── */
const sessionStart = Date.now();
const sessionTimeEl = document.getElementById('sessionTime');
function updateTimer() {
  if (!sessionTimeEl) return;
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  sessionTimeEl.textContent = `${h}:${m}:${s}`;
}
setInterval(updateTimer, 1000);

/* ── Matrix canvas rain ─────────────────────────── */
(function initMatrix() {
  const canvas = document.getElementById('matrixCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, cols, drops;

  function setup() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const fontSize = 13;
    cols = Math.floor(W / fontSize);
    drops = Array.from({length: cols}, () => Math.random() * -50);
  }

  setup();
  window.addEventListener('resize', setup);

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&<>/\\|[]{}';
  function draw() {
    ctx.fillStyle = 'rgba(2,8,16,0.05)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00ffe7';
    ctx.font = '13px Share Tech Mono, monospace';
    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 13, drops[i] * 13);
      if (drops[i] * 13 > H && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  setInterval(draw, 50);
})();
