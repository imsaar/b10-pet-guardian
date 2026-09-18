#!/usr/bin/env node
/* Ben 10: Pet Guardians - LAN server
 *
 * Serves the game files and relays messages between the two players of a
 * room over WebSockets. Uses only Node built-ins (no npm install needed).
 *
 *   node server.js            # http://localhost:8000
 *   PORT=9000 node server.js
 *
 * Protocol (JSON text frames on ws://<host>/ws):
 *   client -> server  {t:'host'}              create a room
 *                     {t:'join', code}        join a room
 *   server -> client  {t:'hosted', code, urls} room created (urls = LAN addresses of this server)
 *                     {t:'joined'}            joined the room
 *                     {t:'peer-joined'}       (to host) a guest arrived
 *                     {t:'peer-left'}         the other player disconnected
 *                     {t:'error', msg}
 * Any other message is relayed unchanged to the other player in the room.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = parseInt(process.env.PORT, 10) || 8000;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD = 256 * 1024;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

// Only these files are ever served
const STATIC = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/game.js': 'game.js',
  '/net.js': 'net.js'
};
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

/* ---------- HTTP (static files) ---------- */
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const file = Object.prototype.hasOwnProperty.call(STATIC, urlPath) ? STATIC[urlPath] : null;
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Server error');
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)],
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

/* ---------- WebSocket (RFC 6455, text frames only) ---------- */
function encodeFrame(opcode, payload) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  return Buffer.concat([header, payload]);
}

function sendText(client, data) {
  if (!client || client.socket.destroyed) return;
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  client.socket.write(encodeFrame(0x1, Buffer.from(text)));
}

// Pull complete frames out of client.buf; returns false if the client was dropped
function readFrames(client, onText) {
  for (;;) {
    const buf = client.buf;
    if (buf.length < 2) return true;
    const fin = (buf[0] & 0x80) !== 0;
    const opcode = buf[0] & 0x0f;
    const masked = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (buf.length < 4) return true;
      len = buf.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (buf.length < 10) return true;
      if (buf.readUInt32BE(2) !== 0) { drop(client); return false; }
      len = buf.readUInt32BE(6);
      offset = 10;
    }
    if (!masked || len > MAX_PAYLOAD) { drop(client); return false; } // clients must mask
    if (buf.length < offset + 4 + len) return true;

    const mask = buf.subarray(offset, offset + 4);
    const payload = Buffer.from(buf.subarray(offset + 4, offset + 4 + len));
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    client.buf = buf.subarray(offset + 4 + len);

    if (opcode === 0x8) { // close
      client.socket.write(encodeFrame(0x8, Buffer.alloc(0)));
      client.socket.end();
      return false;
    } else if (opcode === 0x9) { // ping
      client.socket.write(encodeFrame(0xA, payload));
    } else if (opcode === 0x1 || opcode === 0x0) { // text / continuation
      client.frags.push(payload);
      if (client.frags.reduce((n, b) => n + b.length, 0) > MAX_PAYLOAD) { drop(client); return false; }
      if (fin) {
        const text = Buffer.concat(client.frags).toString('utf8');
        client.frags = [];
        onText(client, text);
      }
    }
    // pong / binary: ignored
  }
}

function drop(client) {
  client.socket.destroy();
}

/* ---------- Rooms ---------- */
const rooms = new Map(); // code -> { host, guest }

function newCode() {
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!rooms.has(code)) return code;
  }
}

function peerOf(client) {
  const room = client.room && rooms.get(client.room);
  if (!room) return null;
  return client.role === 'host' ? room.guest : room.host;
}

function onMessage(client, text) {
  let msg = null;
  // Only control messages need parsing; relayed traffic is passed through as-is
  if (!client.room) {
    try { msg = JSON.parse(text); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;

    if (msg.t === 'host') {
      const code = newCode();
      rooms.set(code, { host: client, guest: null });
      client.room = code;
      client.role = 'host';
      sendText(client, { t: 'hosted', code, urls: lanUrls() });
    } else if (msg.t === 'join') {
      const code = String(msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room) return sendText(client, { t: 'error', msg: 'Room not found' });
      if (room.guest) return sendText(client, { t: 'error', msg: 'Room is full' });
      room.guest = client;
      client.room = code;
      client.role = 'guest';
      sendText(client, { t: 'joined' });
      sendText(room.host, { t: 'peer-joined' });
    }
    return;
  }
  sendText(peerOf(client), text);
}

function cleanup(client) {
  if (!client.room) return;
  const room = rooms.get(client.room);
  const code = client.room;
  client.room = null;
  if (!room) return;
  if (client.role === 'host') {
    rooms.delete(code);
    if (room.guest) {
      sendText(room.guest, { t: 'peer-left' });
      room.guest.room = null;
    }
  } else {
    room.guest = null;
    sendText(room.host, { t: 'peer-left' });
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (req.url.split('?')[0] !== '/ws' || !key) {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  socket.setNoDelay(true);

  const client = { socket, buf: Buffer.alloc(0), frags: [], room: null, role: null };
  socket.on('data', chunk => {
    client.buf = Buffer.concat([client.buf, chunk]);
    readFrames(client, onMessage);
  });
  socket.on('close', () => cleanup(client));
  socket.on('error', () => socket.destroy());
});

function lanUrls() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(i => i.family === 'IPv4' && !i.internal)
    .map(i => `http://${i.address}:${PORT}`);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('Ben 10: Pet Guardians server running');
  console.log(`  Local:   http://localhost:${PORT}`);
  lanUrls().forEach(url => console.log(`  Network: ${url}   <- other players on your LAN open this`));
});
