# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ben 10: Pet Guardians is a browser-based 2D action game built with vanilla JavaScript and HTML5 Canvas. The project uses no external dependencies or build system, making it lightweight and easy to run.

## Development Commands

- **Run the game**: Open `index.html` directly in a web browser
- **Local server** (for development): `python3 -m http.server 8000` or `npx http-server` (solo only)
- **LAN co-op server**: `node server.js` (zero dependencies; serves the game and relays multiplayer messages; `PORT=9000` to change the port)
- **No build/compile step required** - changes to files are immediately reflected on refresh

## Architecture

The codebase is organized into these files:

### `index.html`
- Minimal HTML structure
- Canvas element for game rendering
- HUD elements (health, score, wave counter)
- Mobile control elements (joystick, buttons)

### `game.js`
- **Programmatic Sprite Generation**: Ben 10 sprite is created using Canvas API (no external images)
- **Game State Management**: Player stats, enemies, projectiles, particles, pickups
- **Input Handling**: 
  - Desktop: Keyboard (WASD/arrows) + mouse
  - Mobile: Virtual joystick + touch buttons
  - Omnitrix: Toggle mechanism with 5-second auto-close
- **Entity Systems**:
  - Player with 5 alien forms (Ben, Heatblast, Four Arms, XLR8, Diamondhead, Cannonbolt)
  - Pet companions with auto-targeting
  - Enemy types: Basic, Fast, Tank, Ranged, Boss
  - Particle effects and score popups
- **Render Pipeline**: Canvas 2D context with sprite rendering and visual effects

### `net.js` and `server.js` (two-player LAN co-op)
- **Model**: host-authoritative. `net.mode` is `solo`, `host` or `guest`. The host runs the normal `update()` for both players; the guest sends inputs (`{t:'i'}`) and forms (`{t:'form'}`) and renders snapshots (`{t:'s'}`, ~30/s) via `guestUpdate()` (own movement is predicted, everything else is interpolated).
- **Shared world**: multiplayer uses a fixed `WORLD_W`×`WORLD_H` (1024×768) world scaled to each canvas (`world` / `toWorld()`); solo keeps world = canvas. Game logic must use `world.w`/`world.h`, never `cvs.width`/`cvs.height`.
- **Players**: `players[]` (index 0 = host/solo, 1 = guest), created by `createPlayer()`. `localPlayer()` is the one on this device. Score is shared (`teamScore`). Per-player behavior lives in `updatePlayer()`; controls are read into `p.input` (`readLocalInput()` locally, `applyRemoteInput()` for the guest).
- **Effects**: sounds/particles/score popups created on the host are mirrored to the guest via `net.events` (`queueNetEvent()`), so new effect helpers that should be seen by both players need a hook there.
- **Server**: `server.js` serves a whitelist of static files (add new client files to `STATIC`) and pairs a host and a guest by 4-letter room code over a hand-rolled RFC 6455 WebSocket, relaying everything else untouched.

### `styles.css`
- Responsive layout with safe area insets for mobile devices
- Mobile control styling
- Game container and HUD positioning

## Key Implementation Details

1. **Omnitrix Controls**:
   - Desktop: Q key to toggle, numbers 1-5 or click to select
   - Mobile: Green button to toggle, tap alien to select
   - Auto-closes after 5 seconds with visual countdown

2. **Mobile Optimizations**:
   - Virtual joystick with visual feedback
   - Centered Omnitrix wheel for easier access
   - Touch-optimized button sizes
   - Safe area handling for devices with notches

3. **Security Measures**:
   - Input sanitization for displayed values
   - Array size limits (max 100 enemies, 50 projectiles)
   - Capped particle effects

4. **Performance Considerations**:
   - Delta time-based physics
   - Entity pooling for projectiles and particles
   - Efficient collision detection
   - Limited enemy spawning per wave

## Common Modifications

- **Enemy Parameters**: Search for `enemyTypes` object in game.js
- **Alien Stats**: Look for `aliens` object with hp, speed, attack properties
- **Wave Difficulty**: Modify `spawnEnemies()` function
- **Visual Effects**: Adjust particle counts in `createParticles()`
- **Control Sensitivity**: Update joystick calculations in touch event handlers

## Testing Notes

- Always test on both desktop and mobile browsers
- Check Omnitrix functionality on different screen sizes
- Verify touch controls don't interfere with browser UI
- Test wave progression and difficulty scaling
- For LAN co-op, test with two browsers/devices against `node server.js`: join, movement, shooting, transforming, game over + host restart, either player disconnecting