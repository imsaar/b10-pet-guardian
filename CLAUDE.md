# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ben 10: Pet Guardians — a browser 2D action game in vanilla JS + Canvas, with optional two-player LAN co-op. No dependencies, no build step, no linter, no test suite.

## Commands

- **Solo**: open `index.html` directly, or `python3 -m http.server 8000`.
- **LAN co-op**: `node server.js` (`PORT=9000` to change the port). Node built-ins only. It serves the game and relays multiplayer messages, so co-op does not work from `file://` or a plain static server (the lobby shows a "could not reach the game server" message).
- **Deploy**: every push to `master` publishes the whole repo as a static site to GitHub Pages (`.github/workflows/static.yml`). `server.js` does not run there, so solo must keep working from static files alone and the Host/Join buttons must fail gracefully.
- **Verifying changes** (nothing is automated): drive headless Chrome over the DevTools protocol.
  - Top-level `let`/`const` (`players`, `enemies`, `net`, `world`, …) are reachable from `Runtime.evaluate`, so tests can set state (`players[0].hp = 0`) and click buttons.
  - `requestAnimationFrame` does not tick under `--virtual-time-budget`; either avoid that flag or call `update(16)` yourself.
  - For co-op, use two separate Chrome instances (own `--user-data-dir` and `--remote-debugging-port`) rather than two tabs, so neither page is throttled as a background tab. Mobile is a user-agent sniff, so emulate it with `--user-agent=<iPhone UA>`.

## Architecture

Plain scripts sharing globals (no modules). `index.html` loads `game.js` then `net.js`; each calls functions defined in the other at runtime, and the shared `net` state object lives at the top of `game.js`.

- `game.js` — sprites (drawn with Canvas, no image files), input, the simulation, rendering, start/game-over UI.
- `net.js` — LAN client: lobby UI, snapshot send/apply, guest-side smoothing.
- `server.js` — static file server (whitelist in `STATIC`; add any new client file there) plus a hand-rolled WebSocket relay that pairs a host and a guest by room code. The message protocol is documented in its header.

### Game modes

`net.mode` is `solo`, `host` or `guest`. `startGame(mode)` needs the mode passed explicitly, so never bind it directly as an event listener (it would receive the event).

The loop is `gameLoop` → `update(dt)` (solo/host) or `guestUpdate(dt)` (guest) → `render()`. The host runs the full simulation for both players. The guest runs no simulation: it sends controls and draws what the host's snapshots say, predicting only its own movement.

Consequences when changing gameplay:
- State the guest must see has to be added to both `hostSendSnapshot()` and `applySnapshot()`. Snapshot arrays are positional, and forms/enemy types are sent as indexes into `Object.keys(aliens)` / `Object.keys(enemyTypes)`, so reordering or adding entries changes the wire format and both players must run the same version.
- Sounds, particles and score popups made on the host reach the guest through `queueNetEvent()` (hooked into `playSound`, `createParticles`, `addScorePopup`). Add a hook for any new effect that both players should see.
- The Omnitrix wheel is local UI per device. Transforming goes through `requestForm()` → `setForm()`; a guest sends `{t:'form'}` and the host applies it.

### Players and world

- `players[]` (0 = host/solo, 1 = guest) from `createPlayer()`; `localPlayer()` is the one on this device. Score is shared (`teamScore`). Enemies chase `nearestAlivePlayer()`. A player at 0 HP is down until the next wave spawns (then revived at half HP); game over is when everyone is down.
- Solo: the world is the canvas. Multiplayer: a fixed `WORLD_W`×`WORLD_H` (1024×768) world scaled to the canvas, zoomed in with a follow camera when it would drop below `MIN_WORLD_SCALE`. Game logic must use `world.w`/`world.h` (never `cvs.width`/`cvs.height`), and screen→world conversion goes through `toWorld()`; the mobile Omnitrix wheel is centered at `viewCenter()`.
- Game over shows a modal (`endGame` / `dismissGameOver` / `restartGame`). Only the host can restart a shared game; a guest whose host left gets "Back to menu", which reloads the page.

## Gotchas

- Player, enemy and projectile movement is applied per frame (tuned for ~60 fps); only cooldowns, invulnerability and the Omnitrix timer use `dt`. Don't assume frame-rate independence.
- Caps: 100 projectiles, 500 particles, at most 20 enemies per wave.
- Mobile is decided once at load by a user-agent regex (`isMobile`). The `.desktop-only`/`.mobile-only` blocks are shown by JS with `!important` because CSS-only detection proved unreliable.
- `styles.css` has a global `[hidden] { display: none !important; }`; toggle UI with the `hidden` attribute rather than `style.display`.
- The desktop `window.onkeydown` ignores events from `<input>` (so typing a room code doesn't trigger Q/WASD); keep that when adding text fields.
- Alien forms are exactly the keys of `aliens` in `game.js` (ben, heatblast, fourarms, xlr8, cannonbolt); their order is also the 1-5 key order and part of the network format. The README's alien table and stats are hand-written, so update them when changing `aliens`/`enemyTypes`.

## Where to tune

`aliens` (form stats) and `enemyTypes` in `game.js`; wave spawning is the "Spawn enemies" block inside `update()`; pets are defined in `createPlayer()`; particle counts are the arguments to `createParticles()` calls.
