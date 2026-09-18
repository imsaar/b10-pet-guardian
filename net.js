/* Ben 10: Pet Guardians - LAN multiplayer
 *
 * Two players connect through the small relay in server.js:
 *   host  runs the whole simulation (game.js update()) and streams state snapshots
 *   guest sends its controls to the host and renders the snapshots it receives
 *
 * Messages (JSON, relayed by the server):
 *   guest -> host  {t:'i', dx, dy, a, ax, ay}   controls, ~30/s
 *                  {t:'form', form}             Omnitrix transformation
 *   host -> guest  {t:'start'}                  (re)start the game
 *                  {t:'s', ...}                 state snapshot, ~30/s
 *                  {t:'over', sc, wv}           game over
 */

const FORMS = Object.keys(aliens);
const ETYPES = Object.keys(enemyTypes);
const SEND_INTERVAL = 33; // ms between snapshots / input messages

let nextNetId = 1;
let lastSnapshotAt = 0;
let lastInputAt = 0;
let toastTimer = null;

const netEl = id => document.getElementById(id);
const r1 = v => Math.round(v * 10) / 10;

/* ---------- Connection ---------- */
function netSend(obj) {
  if (net.ws && net.ws.readyState === WebSocket.OPEN) net.ws.send(JSON.stringify(obj));
}

function netConnect(onOpen) {
  if (location.protocol === 'file:' || !location.host) {
    setLobbyStatus('LAN play needs the game server. Run "node server.js" and open the page it prints.', true);
    return;
  }
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  net.ws = ws;
  let opened = false;
  ws.onopen = () => { opened = true; onOpen(); };
  ws.onmessage = e => {
    let msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    if (msg && typeof msg.t === 'string') handleNetMessage(msg);
  };
  ws.onclose = () => {
    if (net.ws !== ws) return; // already replaced or cancelled
    net.ws = null;
    if (!opened) {
      setLobbyStatus('Could not reach the game server. Start it with "node server.js" and open the page it prints.', true);
    } else {
      handleConnectionLost();
    }
  };
}

function netDisconnect() {
  const ws = net.ws;
  net.ws = null;
  net.peerConnected = false;
  if (ws) ws.close();
}

function handleConnectionLost() {
  if (net.role === 'guest') {
    hostGone('Connection lost');
  } else if (net.role === 'host') {
    if (net.peerConnected) showToast('Connection lost - continuing solo');
    else if (!netEl('lobby').hidden) setLobbyStatus('Connection to the server was lost.', true);
    net.peerConnected = false;
    if (players.length > 1) players.length = 1;
  }
}

function hostGone(reason) {
  if (net.disconnected) return;
  net.disconnected = true;
  const wasPlaying = gameStarted;
  gameStarted = false;
  if (!wasPlaying && netEl('startScreen').style.display !== 'none') {
    setLobbyStatus(reason, true);
    return;
  }
  netEl('gameOverTitle').textContent = reason;
  netEl('finalScore').textContent = Math.floor(teamScore);
  netEl('finalWave').textContent = Math.floor(wave);
  const btn = netEl('restartBtn');
  btn.disabled = false;
  btn.textContent = 'Back to menu';
  netEl('gameOverModal').hidden = false;
  btn.focus();
}

/* ---------- Incoming messages ---------- */
function handleNetMessage(msg) {
  switch (msg.t) {
    case 'hosted':
      net.code = String(msg.code);
      showRoomCode(net.code, Array.isArray(msg.urls) ? msg.urls : []);
      setLobbyStatus('Waiting for player 2…');
      break;
    case 'joined':
      setLobbyStatus('Joined! Waiting for the host to start…');
      break;
    case 'error':
      setLobbyStatus(String(msg.msg || 'Error'), true);
      break;
    case 'peer-joined': // host
      net.peerConnected = true;
      if (gameStarted) {
        // Drop in to the running game
        const host = players[0];
        players[1] = createPlayer(1);
        players[1].x = host.x + 100;
        players[1].y = host.y;
        netAnnounceStart();
        showToast('Player 2 joined');
      } else if (netEl('gameOverModal').hidden) {
        startGame('host');
      } else {
        showToast('Player 2 is waiting for you to restart');
      }
      break;
    case 'peer-left':
      if (net.role === 'host') {
        net.peerConnected = false;
        if (players.length > 1) players.length = 1;
        showToast('Player 2 left');
      } else if (net.role === 'guest') {
        hostGone('Host disconnected');
      }
      break;
    case 'start': // guest
      if (net.role === 'guest') startGame('guest');
      break;
    case 's': // guest
      applySnapshot(msg);
      break;
    case 'over': // guest
      if (net.mode === 'guest' && gameStarted) {
        teamScore = Number(msg.sc) || 0;
        wave = Number(msg.wv) || wave;
        endGame();
      }
      break;
    case 'i': // host
      if (net.mode === 'host') applyRemoteInput(msg);
      break;
    case 'form': // host
      if (net.mode === 'host' && players[1] && FORMS.includes(msg.form)) setForm(players[1], msg.form);
      break;
  }
}

/* ---------- Host side ---------- */
function netAnnounceStart() {
  if (net.peerConnected) netSend({t: 'start'});
}

function netAnnounceGameOver() {
  if (net.peerConnected) netSend({t: 'over', sc: Math.floor(teamScore), wv: wave});
}

function applyRemoteInput(m) {
  const p = players[1];
  if (!p) return;
  const num = v => Number.isFinite(v) ? v : 0;
  let dx = Math.max(-1, Math.min(1, num(m.dx)));
  let dy = Math.max(-1, Math.min(1, num(m.dy)));
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  p.input = {dx, dy, attack: !!m.a, aimX: num(m.ax), aimY: num(m.ay)};
  p.inputAt = performance.now();
}

// If the guest goes quiet (backgrounded tab, bad wifi), don't let them keep running/firing
function expireStaleInput(p) {
  if (p && performance.now() - (p.inputAt || 0) > 500) {
    p.input = {dx: 0, dy: 0, attack: false, aimX: p.x, aimY: p.y};
  }
}

function hostSendSnapshot() {
  if (!net.peerConnected) {
    net.events.length = 0;
    return;
  }
  const now = performance.now();
  if (now - lastSnapshotAt < SEND_INTERVAL) return;
  lastSnapshotAt = now;

  // Entities get ids on first send so the guest can smooth their movement
  enemies.forEach(e => { if (!e.id) e.id = nextNetId++; });
  projectiles.forEach(p => { if (!p.id) p.id = nextNetId++; });

  netSend({
    t: 's',
    wv: wave,
    sc: teamScore,
    pl: players.map(p => [r1(p.x), r1(p.y), r1(p.hp), p.maxHp, FORMS.indexOf(p.form), p.facing, p.alive ? 1 : 0, Math.max(0, Math.ceil(p.invulnerable))]),
    en: enemies.map(e => [e.id, r1(e.x), r1(e.y), ETYPES.indexOf(e.type), r1(e.hp), e.maxHp]),
    pr: projectiles.map(p => [p.id, r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), p.size || 0, p.color, p.isEnemy ? 1 : 0]),
    pk: pickups.map(p => [r1(p.x), r1(p.y), p.life]),
    ev: net.events
  });
  net.events = [];
}

/* ---------- Guest side ---------- */
function applySnapshot(m) {
  if (net.mode !== 'guest' || !gameStarted) return;
  if (!Array.isArray(m.pl) || !Array.isArray(m.en) || !Array.isArray(m.pr) || !Array.isArray(m.pk)) return;

  wave = Number(m.wv) || wave;
  teamScore = Number(m.sc) || 0;

  while (players.length < m.pl.length) players.push(createPlayer(players.length));
  players.length = m.pl.length;
  m.pl.forEach((d, i) => {
    const p = players[i];
    if (!p.synced) { p.x = d[0]; p.y = d[1]; p.synced = true; }
    p.tx = d[0];
    p.ty = d[1];
    p.hp = d[2];
    p.maxHp = d[3];
    p.form = FORMS[d[4]] || 'ben';
    if (i !== net.localIdx) p.facing = d[5]; // we predict our own facing
    p.alive = !!d[6];
    p.invulnerable = d[7];
  });

  const oldEnemies = new Map(enemies.map(e => [e.id, e]));
  enemies = m.en.map(d => {
    const e = oldEnemies.get(d[0]) || {id: d[0], x: d[1], y: d[2]};
    e.tx = d[1];
    e.ty = d[2];
    e.type = ETYPES[d[3]] || 'basic';
    e.hp = d[4];
    e.maxHp = d[5];
    return e;
  });

  const oldShots = new Map(projectiles.map(p => [p.id, p]));
  projectiles = m.pr.map(d => {
    const p = oldShots.get(d[0]) || {id: d[0], x: d[1], y: d[2]};
    p.tx = d[1];
    p.ty = d[2];
    p.vx = d[3];
    p.vy = d[4];
    p.size = d[5];
    p.color = String(d[6]);
    p.isEnemy = !!d[7];
    return p;
  });

  pickups = m.pk.map(d => ({x: d[0], y: d[1], life: d[2], type: 'health'}));

  if (Array.isArray(m.ev)) m.ev.forEach(applyNetEvent);
}

function applyNetEvent(ev) {
  switch (ev[0]) {
    case 's': playSound(String(ev[1]), Number(ev[2]), Number(ev[3]), Number(ev[4])); break;
    case 'p': createParticles(Number(ev[1]), Number(ev[2]), String(ev[3]), Math.min(Number(ev[4]) || 0, 30)); break;
    case 't': addScorePopup(Number(ev[1]), Number(ev[2]), String(ev[3])); break;
  }
}

// Per-frame work for a guest: no simulation, just controls out and smoothing in
function guestUpdate(dt) {
  updateOmnitrix(dt);

  const me = localPlayer();
  me.input = readLocalInput();
  const now = performance.now();
  if (now - lastInputAt >= SEND_INTERVAL) {
    lastInputAt = now;
    const i = me.input;
    netSend({t: 'i', dx: Math.round(i.dx * 100) / 100, dy: Math.round(i.dy * 100) / 100, a: i.attack ? 1 : 0, ax: Math.round(i.aimX), ay: Math.round(i.aimY)});
  }

  players.forEach(p => {
    if (p.tx === undefined) return;
    if (p === me && p.alive) {
      // Move immediately from our own input, then ease toward where the host says we are
      movePlayer(p);
      p.x += (p.tx - p.x) * 0.2;
      p.y += (p.ty - p.y) * 0.2;
    } else {
      p.x += (p.tx - p.x) * 0.4;
      p.y += (p.ty - p.y) * 0.4;
    }
    positionPets(p);
  });
  enemies.forEach(e => {
    e.x += (e.tx - e.x) * 0.4;
    e.y += (e.ty - e.y) * 0.4;
  });
  projectiles.forEach(p => {
    p.x += (p.tx - p.x) * 0.6;
    p.y += (p.ty - p.y) * 0.6;
  });

  updateParticles();
  updateHud();
}

/* ---------- Lobby UI ---------- */
function showToast(text) {
  const el = netEl('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}

function setLobbyStatus(text, isError) {
  const el = netEl('lobbyStatus');
  el.textContent = text;
  el.classList.toggle('error', !!isError);
}

function showRoomCode(code, urls) {
  netEl('roomCode').textContent = code;
  const link = urls.length ? `${urls[0]}/?join=${code}` : `${location.origin}/?join=${code}`;
  netEl('lobbyUrl').textContent = `Other player: open ${link}`;
}

function openLobby(role) {
  net.role = role;
  net.disconnected = false;
  netEl('startScreen').classList.add('in-lobby');
  netEl('menuButtons').hidden = true;
  netEl('lobby').hidden = false;
  netEl('lobbyHost').hidden = role !== 'host';
  netEl('lobbyJoin').hidden = role !== 'guest';
  netEl('lobbyTitle').textContent = role === 'host' ? 'Host a LAN game' : 'Join a LAN game';
  netEl('roomCode').textContent = '----';
  netEl('lobbyUrl').textContent = '';
  setLobbyStatus('');
}

function closeLobby() {
  netDisconnect();
  net.role = null;
  net.code = null;
  netEl('lobby').hidden = true;
  netEl('startScreen').classList.remove('in-lobby');
  netEl('menuButtons').hidden = false;
}

function hostLanGame() {
  openLobby('host');
  setLobbyStatus('Connecting…');
  netConnect(() => netSend({t: 'host'}));
}

function joinLanGame() {
  const code = netEl('codeInput').value.trim().toUpperCase();
  if (code.length !== 4) {
    setLobbyStatus('Enter the 4-character room code from the host.', true);
    return;
  }
  setLobbyStatus('Connecting…');
  netDisconnect();
  netConnect(() => netSend({t: 'join', code}));
}

document.addEventListener('DOMContentLoaded', () => {
  netEl('hostBtn').addEventListener('click', hostLanGame);
  netEl('joinBtn').addEventListener('click', () => {
    openLobby('guest');
    netEl('codeInput').focus();
  });
  netEl('codeGoBtn').addEventListener('click', joinLanGame);
  netEl('codeInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') joinLanGame();
  });
  netEl('codeInput').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  netEl('lobbyCancel').addEventListener('click', closeLobby);

  // Links from the host look like /?join=ABCD
  const code = new URLSearchParams(location.search).get('join');
  if (code) {
    openLobby('guest');
    netEl('codeInput').value = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  }
});
