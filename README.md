# Ben 10: Pet Guardians

A browser-based action game where you play as Ben 10, using the Omnitrix to transform into different aliens and protect pets from enemies.

## 🎮 How to Play

### Desktop Controls
- **Movement**: Arrow keys or WASD
- **Attack**: Mouse click or Space bar
- **Omnitrix**: Q key
- **Select Alien**: Click on alien in wheel or press 1-5 keys

### Mobile Controls
- **Movement**: Virtual joystick
- **Attack**: Red button (⚡)
- **Omnitrix**: Green button (⌚)
- **Select Alien**: Tap alien in wheel

## 👽 Available Aliens

1. **Heatblast** - Fire-based attacks, 2x damage
2. **Four Arms** - Strong melee attacks, 1.5x damage  
3. **XLR8** - Super speed movement
4. **Diamondhead** - Defensive form, 50% damage reduction
5. **Cannonbolt** - Spin attack that damages all nearby enemies

## 🎯 Game Features

- Wave-based enemy spawning with increasing difficulty
- Pet companion system with automatic combat
- Health pickups (15% drop chance)
- Score system with combo multipliers
- Particle effects and visual feedback
- Mobile-responsive design

## 🏃 Running the Game

**Solo:** clone the repository and open `index.html` in a modern web browser. No build process or dependencies required!

**Two players over LAN:** run the included server (Node.js, no `npm install` needed):

```
node server.js          # or: PORT=9000 node server.js
```

## 👥 Two-Player LAN Co-op

1. The host runs `node server.js` and opens the game from it, then picks **Host LAN Game**. A 4-letter room code and a join link appear.
2. Player 2 (desktop or phone on the same network) opens the link the host sees (`http://<host-ip>:8000/?join=CODE`), or opens the server address and picks **Join LAN Game** and types the code.
3. The game starts automatically. Both players share the same arena, score and waves; each has their own health, alien form and pets.
4. A downed player comes back at half health when the next wave starts. The game is over when both players are down.
5. If player 2 disconnects the host carries on solo, and a new player 2 can drop in with the same room code. Only the host can restart after a game over.

The host's browser runs the game; player 2 sends controls and receives the game state (~30 updates/s), so the host should be the faster device. Both players need to reach the server's port (8000 by default) through any firewall.

## 📱 Mobile Support

The game automatically detects mobile devices and provides:
- Touch-optimized controls
- Safe area support for devices with notches
- Responsive canvas sizing
- Centered Omnitrix wheel for easier access

## 🛡️ Security Features

- Input sanitization for displayed values
- Array size limits to prevent memory exhaustion
- Capped enemy spawning
- No external dependencies; the only network traffic is the optional LAN co-op WebSocket to your own `server.js`

## 📂 Project Structure

```
├── index.html      # Main HTML structure
├── styles.css      # All game styling
├── game.js         # Game logic and rendering (solo, and the host's simulation)
├── net.js          # LAN co-op client: lobby, state snapshots, guest rendering
├── server.js       # Node LAN server: serves the files + relays host/guest messages
├── README.md       # This file
└── CLAUDE.md       # Development guide for Claude Code
```

## 🔧 Technical Details

- Built with vanilla JavaScript and HTML5 Canvas
- No frameworks or libraries required
- No external image dependencies - all sprites generated programmatically
- Modular code structure with separate files for HTML, CSS, and JS
- Frame-independent physics using delta time

## 🎨 Customization

You can modify various game parameters in `game.js`:
- Enemy spawn rates and health
- Player movement speed
- Attack damage values  
- Wave progression difficulty
- Particle effects

## 📝 License

This is a fan-made game for educational purposes. Ben 10 and related characters are property of their respective owners.