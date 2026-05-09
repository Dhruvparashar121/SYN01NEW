const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { Client } = require('ssh2');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

function cleanText(value) {
  return String(value || '').trim();
}

function cleanPort(value) {
  const port = Number(value || 22);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 22;
  return port;
}

app.use('/xterm', express.static(path.join(__dirname, 'node_modules', '@xterm', 'xterm', 'lib')));
app.use(express.static(__dirname));

io.on('connection', (socket) => {
  let conn = null;
  let shell = null;

  socket.on('ssh-connect', (payload = {}) => {
    if (conn) return;

    const host = cleanText(payload.host || process.env.SSH_HOST);
    const username = cleanText(payload.username || process.env.SSH_USER);
    const password = String(payload.password || process.env.SSH_PASSWORD || '');
    const port = cleanPort(payload.port || process.env.SSH_PORT);

    if (!host || !username || !password) {
      socket.emit('ssh-error', 'Missing SSH details. Enter target IP, username, and password in the Live Fire panel.');
      return;
    }

    conn = new Client();
    conn.on('ready', () => {
      conn.shell({ term: 'xterm-256color', cols: 120, rows: 34 }, (err, stream) => {
        if (err) {
          socket.emit('ssh-error', err.message);
          conn.end();
          conn = null;
          return;
        }
        shell = stream;
        socket.emit('ssh-ready', `Connected as ${username}@${host}:${port}`);
        stream.on('data', (data) => socket.emit('terminal-output', data.toString('utf8')));
        stream.stderr.on('data', (data) => socket.emit('terminal-output', data.toString('utf8')));
        stream.on('close', () => {
          socket.emit('terminal-output', '\r\n[bridge] SSH shell closed\r\n');
          if (conn) conn.end();
          conn = null;
          shell = null;
        });
      });
    });
    conn.on('error', (err) => socket.emit('ssh-error', err.message));
    conn.on('close', () => { conn = null; shell = null; });
    conn.connect({ host, port, username, password, readyTimeout: 15000, keepaliveInterval: 10000 });
  });

  socket.on('terminal-input', (data) => {
    if (shell) shell.write(data);
    else socket.emit('ssh-error', 'SSH shell is not connected. Enter credentials and click Connect SSH Terminal first.');
  });

  socket.on('ssh-disconnect', () => {
    if (shell) shell.end('exit\n');
    if (conn) conn.end();
    conn = null;
    shell = null;
  });

  socket.on('disconnect', () => {
    if (shell) shell.end();
    if (conn) conn.end();
  });
});

server.listen(PORT, () => console.log(`Anonymity Framework SSH terminal running: http://localhost:${PORT}`));
