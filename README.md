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

1. Clone the repository
2. Open `index.html` in a modern web browser
3. No build process or dependencies required!

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
- No external dependencies or network requests

## 📂 Project Structure

```
├── index.html      # Main HTML structure
├── styles.css      # All game styling
├── game.js         # Complete game logic
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