# Ben 10: Pet Guardians

A browser-based action game where you play as Ben 10, using the Omnitrix to transform into different aliens and protect your pets from waves of enemies. Play solo, or team up with a friend on the same network in two-player LAN co-op.

## 🎮 How to Play

Survive as many waves as you can. A new wave arrives each time you clear the last one, and each wave is bigger and tougher.

### Desktop Controls
- **Movement**: Arrow keys or WASD
- **Attack**: Mouse click or Space bar (aim with the mouse)
- **Omnitrix**: Q toggles the alien wheel (it closes by itself after 5 seconds)
- **Select Alien**: Click an alien in the wheel or press its number key (1-5)

### Mobile Controls
- **Movement**: Virtual joystick
- **Attack**: Red button (⚡), which auto-aims at the nearest enemy
- **Omnitrix**: Green button (⌚), then tap an alien in the wheel

The 🔊 button in the top bar mutes sound.

### Game Over
When you go down you get a Game Over screen with your score and wave. Press **Play Again** to restart, or close it (×, Esc, or click outside) to look at the final frame and use the 🔄 button in the top bar to restart later.

## 👽 Aliens

You start as Ben. Transforming keeps your current health but caps it at the new form's maximum, so it isn't a heal.

| Key | Form | HP | Speed | Attack |
|-----|------|----|-------|--------|
| 1 | **Ben** | 100 | Medium | Balanced single shots |
| 2 | **Heatblast** | 120 | Medium | Three-shot fire spread, longest range |
| 3 | **Four Arms** | 180 | Slow | Hardest-hitting shots, shortest range |
| 4 | **XLR8** | 80 | Fastest | Rapid fire: the fastest fire rate |
| 5 | **Cannonbolt** | 160 | Fast | One big, heavy projectile |

## 🎯 Game Features

- **Waves**: each wave spawns more enemies (up to 20) with more health. Faster, tougher, and ranged enemies show up in later waves.
- **Enemies**: they chase the nearest player and hurt on contact. Ranged enemies keep their distance and shoot.
- **Pets**: every player is followed by three pets (Stinkfly, Heatblast, Grey Matter) that shoot nearby enemies automatically.
- **Health pickups**: defeated enemies sometimes (15%) drop a health pack (+20). Grab it before it fades.
- **Score**: each kill is worth the enemy's base points multiplied by the current wave.
- **Mobile-friendly**: touch controls, safe-area support, and a responsive canvas.

## 🏃 Running the Game

**Solo:** clone the repository and open `index.html` in a modern web browser. No build process or dependencies required.

**Two players over LAN:** run the included server (see below). It uses only Node.js built-ins, so there is no `npm install`:

```
node server.js            # http://localhost:8000
PORT=9000 node server.js  # use another port
```

You can also serve the folder with any static server (`python3 -m http.server`) for solo play, but LAN co-op needs `node server.js`.

## 👥 Two-Player LAN Co-op

Two players, two devices, one shared arena. Everything runs on your local network; no internet or accounts are needed.

### Setup

1. **Host:** on the computer that will host, run `node server.js`. It prints a `Local` address and one or more `Network` addresses, for example:
   ```
   Local:   http://localhost:8000
   Network: http://192.168.1.23:8000   <- other players on your LAN open this
   ```
2. **Host:** open the game in a browser and click **Host LAN Game**. You'll see a 4-letter room code and a join link such as `http://192.168.1.23:8000/?join=K7QF`.
3. **Player 2:** on any device connected to the same network (a phone or another computer), open the join link. The code is filled in for you: tap **Join**.
   - Without the link: open the `Network` address, choose **Join LAN Game**, and type the code (it is not case-sensitive).
4. The game starts automatically as soon as player 2 joins.

Player 2 must use the host's **network address** (`192.168.x.x`), not `localhost`.

### How it plays

- Both players share the same arena, waves, and score. Each has their own health, alien form, Omnitrix, and pets.
- You appear as **YOU** on your screen and the other player as **P1** (host) or **P2** (guest).
- Controls are the same as solo (keyboard and mouse on a computer, touch controls on a phone).
- A player who runs out of health is **down** until the next wave starts, then returns with half health. The game is over when both players are down.
- If player 2 leaves, the host keeps playing solo. A new player 2 can join at any time with the same room code.
- Only the host can restart after a game over; player 2 sees "Waiting for host…" until then.
- If the host disconnects, player 2 gets a "Host disconnected" screen with a **Back to menu** button.

### Tips and troubleshooting

- **Keep the host's tab visible.** The host's browser runs the game, and browsers pause hidden tabs, which would freeze the game for both players. The host should also be the faster device.
- **"Could not reach the game server"**: the page wasn't opened from `node server.js` (for example, it was opened as a file or from another web server). Open the address the server prints.
- **Player 2 can't connect:** check that both devices are on the same Wi-Fi/network, that the host's firewall allows incoming connections to Node on the server's port, and that your router doesn't isolate Wi-Fi clients ("AP/client isolation", common on guest networks).
- **Room not found / room is full:** codes are per host session and each room holds exactly two players. If the host closes the game or stops the server, the code stops working.
- **Phones:** the shared arena is fixed-size, so on small screens the view zooms in and follows your character. Portrait mode gives the most room.
- **How it works:** the host simulates the whole game and sends state to player 2 about 30 times a second; player 2 sends controls back. The server just relays messages between them.

## 📱 Mobile Support

The game detects mobile devices at load and provides:
- Touch-optimized controls with auto-aim
- Safe area support for devices with notches
- Responsive canvas sizing
- A centered Omnitrix wheel for easier access

## 🛡️ Security and Robustness

- Displayed values are set as text (not HTML)
- Array size limits: at most 100 projectiles, 500 particles, and 20 enemies per wave
- `server.js` serves only the game's own files and limits message size; the host validates everything player 2 sends
- No external dependencies. The only network traffic is the optional LAN co-op WebSocket to your own `server.js`
- The LAN server has **no authentication**: anyone on your network who has the room code can join. Don't expose its port to the internet.

## 📂 Project Structure

```
├── index.html      # Main HTML structure (menu, HUD, game over and lobby UI)
├── styles.css      # All game styling
├── game.js         # Game logic and rendering (solo, and the host's simulation)
├── net.js          # LAN co-op client: lobby, state snapshots, guest rendering
├── server.js       # Node LAN server: serves the files + relays host/guest messages
├── README.md       # This file
├── CLAUDE.md       # Development guide for Claude Code
└── .github/workflows/static.yml   # Publishes the repo to GitHub Pages on push to master
```

The GitHub Pages site is static, so only solo play works there; LAN co-op needs `node server.js`.

## 🔧 Technical Details

- Built with vanilla JavaScript and HTML5 Canvas; no frameworks, libraries, or build step
- No external image dependencies: all sprites are generated programmatically
- Cooldowns and timers use delta time; movement is applied per frame and tuned for ~60 fps
- Co-op is host-authoritative: the host runs the simulation, and the guest predicts its own movement and interpolates everything else
- Multiplayer uses a fixed 1024×768 world scaled to each screen; solo uses the full canvas

## 🎨 Customization

You can modify game parameters in `game.js`:
- `aliens`: health, speed, damage, and range of each form
- `enemyTypes`: enemy health, speed, damage, size, and score value
- Wave size and enemy mix: the "Spawn enemies" block in `update()`
- Pets: defined in `createPlayer()`
- Particle effects: the arguments to `createParticles()` calls

## 📝 License

This is a fan-made game for educational purposes. Ben 10 and related characters are property of their respective owners.
