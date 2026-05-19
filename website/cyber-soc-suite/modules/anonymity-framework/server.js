const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { Server } = require('socket.io');
const fetchCompat = (...args) => {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch(...args);
  return import('undici').then(({ fetch }) => fetch(...args));
};

let pty = null;
try {
  pty = require('node-pty');
} catch (err) {
  console.warn('[warn] node-pty is not available. Falling back to a basic shell pipe. Run npm install to enable full PTY behavior.');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const WEB_ROOT = __dirname;
const SHELL = process.env.SHELL || '/bin/bash';

app.use(express.json({ limit: '1mb' }));
app.use('/xterm', express.static(path.join(__dirname, 'node_modules', '@xterm', 'xterm', 'lib')));

function getLanIps() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const list of Object.values(nets)) {
    for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal) out.push(item.address);
    }
  }
  return out;
}

function normalizeGuacBase(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Guacamole URL is required.');
  const u = new URL(raw.trim());
  u.hash = '';
  u.search = '';
  u.pathname = u.pathname.replace(/\/+$/, '');
  if (!u.pathname || u.pathname === '/') u.pathname = '/guacamole';
  return u.toString().replace(/\/$/, '');
}

function encodeClientIdentifier(connectionId, dataSource) {
  const raw = `${connectionId}\u0000c\u0000${dataSource}`;
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function guacPostForm(url, body) {
  const res = await fetchCompat(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString()
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.message || data.error || `Guacamole request failed: HTTP ${res.status}`);
  return data;
}

async function guacRequest(url, token, method = 'GET', body = null) {
  const full = new URL(url);
  full.searchParams.set('token', token);
  const res = await fetchCompat(full, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data.message || data.error || `Guacamole API failed: HTTP ${res.status}`);
  return data;
}

app.post('/api/guac/connect', async (req, res) => {
  try {
    const {
      guacBaseUrl,
      guacAdminUser,
      guacAdminPassword,
      protocol,
      host,
      port,
      username,
      password
    } = req.body || {};

    if (!['rdp', 'vnc'].includes(protocol)) throw new Error('Protocol must be rdp or vnc.');
    if (!host) throw new Error('Target Ubuntu IP/hostname is required.');
    if (!Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535) throw new Error('Valid target port is required.');
    if (!guacAdminUser || !guacAdminPassword) throw new Error('Guacamole admin/API username and password are required.');

    const base = normalizeGuacBase(guacBaseUrl);
    const tokenData = await guacPostForm(`${base}/api/tokens`, {
      username: guacAdminUser,
      password: guacAdminPassword
    });

    const authToken = tokenData.authToken;
    const dataSource = tokenData.dataSource || tokenData.availableDataSources?.[0] || 'postgresql';
    if (!authToken) throw new Error('Guacamole did not return an auth token.');

    const name = `AF Ubuntu ${host} ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
    const parameters = protocol === 'rdp'
      ? {
          hostname: host,
          port: String(port || 3389),
          username: username || '',
          password: password || '',
          security: 'any',
          'ignore-cert': 'true',
          'enable-wallpaper': 'false',
          'enable-theming': 'false',
          'server-layout': 'en-us-qwerty'
        }
      : {
          hostname: host,
          port: String(port || 5900),
          username: username || '',
          password: password || '',
          'read-only': 'false',
          'swap-red-blue': 'false',
          cursor: 'local'
        };

    const connectionPayload = {
      parentIdentifier: 'ROOT',
      name,
      protocol,
      parameters,
      attributes: {
        'max-connections': '',
        'max-connections-per-user': '',
        weight: '',
        'failover-only': '',
        'guacd-hostname': '',
        'guacd-port': '',
        'guacd-encryption': ''
      }
    };

    const created = await guacRequest(`${base}/api/session/data/${encodeURIComponent(dataSource)}/connections`, authToken, 'POST', connectionPayload);
    const connectionId = created.identifier || created.name || created.id;
    if (!connectionId) throw new Error('Connection was created but no connection identifier was returned.');

    const encoded = encodeClientIdentifier(connectionId, dataSource);
    const clientUrl = `${base}/#/client/${encoded}?token=${encodeURIComponent(authToken)}`;
    res.json({ ok: true, name, connectionId, dataSource, clientUrl, homeUrl: base });
  } catch (err) {
    console.error('[guac-connect]', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

app.use(express.static(WEB_ROOT));

function startShell(socket) {
  if (pty) {
    const shell = pty.spawn(SHELL, ['-li'], {
      name: 'xterm-256color',
      cols: 120,
      rows: 34,
      cwd: WEB_ROOT,
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
    });
    socket.emit('terminal-ready', `Local Kali shell started in ${WEB_ROOT}`);
    shell.onData((data) => socket.emit('terminal-output', data));
    shell.onExit(({ exitCode }) => {
      socket.emit('terminal-output', `\r\n[local shell exited with code ${exitCode}]\r\n`);
      socket.disconnect(true);
    });
    return {
      write: (data) => shell.write(data),
      resize: (cols, rows) => shell.resize(cols || 120, rows || 34),
      kill: () => shell.kill()
    };
  }

  const child = spawn(SHELL, ['-li'], {
    cwd: WEB_ROOT,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
    stdio: 'pipe'
  });
  socket.emit('terminal-ready', `Basic local shell started in ${WEB_ROOT}. Install node-pty for full terminal behavior.`);
  child.stdout.on('data', (data) => socket.emit('terminal-output', data.toString('utf8')));
  child.stderr.on('data', (data) => socket.emit('terminal-output', data.toString('utf8')));
  child.on('exit', (code) => {
    socket.emit('terminal-output', `\r\n[local shell exited with code ${code}]\r\n`);
    socket.disconnect(true);
  });
  return {
    write: (data) => child.stdin.write(data),
    resize: () => {},
    kill: () => child.kill()
  };
}

io.on('connection', (socket) => {
  let shell = null;

  socket.on('local-terminal-start', () => {
    if (shell) return;
    try {
      shell = startShell(socket);
    } catch (err) {
      socket.emit('terminal-error', err.message || String(err));
    }
  });

  socket.on('terminal-input', (data) => {
    if (!shell) {
      socket.emit('terminal-error', 'Local shell is not ready yet. Refresh the page or restart npm start.');
      return;
    }
    shell.write(String(data));
  });

  socket.on('terminal-resize', ({ cols, rows } = {}) => {
    if (shell && Number.isFinite(cols) && Number.isFinite(rows)) shell.resize(cols, rows);
  });

  socket.on('disconnect', () => {
    if (shell) shell.kill();
    shell = null;
  });
});

server.listen(PORT, HOST, () => {
  console.log('============================================================');
  console.log(' Anonymity Framework Lab - Live Guacamole Edition');
  console.log(` Local URL:   http://localhost:${PORT}`);
  for (const ip of getLanIps()) console.log(` Network URL: http://${ip}:${PORT}`);
  console.log(' WARNING: Live Fire exposes a shell and Guacamole launcher.');
  console.log(' Use only inside a trusted, closed lab network.');
  console.log('============================================================');
});
