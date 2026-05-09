const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { Server } = require('socket.io');

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

app.use('/xterm', express.static(path.join(__dirname, 'node_modules', '@xterm', 'xterm', 'lib')));
app.use(express.static(WEB_ROOT));

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
  console.log(' Anonymity Framework local Kali terminal server is running');
  console.log(` Local URL:   http://localhost:${PORT}`);
  for (const ip of getLanIps()) console.log(` Network URL: http://${ip}:${PORT}`);
  console.log(' WARNING: the Live Fire page exposes a shell on this host.');
  console.log(' Use only inside a trusted, closed lab network.');
  console.log('============================================================');
});
