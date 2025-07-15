# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ben 10: Pet Guardians is a browser-based 2D game built with vanilla JavaScript and HTML5 Canvas. The entire game is contained within a single `index.html` file with no external dependencies or build system.

## Development Commands

Since this is a vanilla JavaScript project with no build system:
- **Run the game**: Open `index.html` in a web browser
- **Local server** (if needed for CORS): `python -m http.server 8000` or `npx http-server`
- **Mobile testing**: Use browser developer tools device emulation or test on actual mobile devices

## Architecture

The game follows a simple monolithic structure within `index.html`:

1. **Game State**: Global variables managing player stats, enemies, projectiles, pets, and waves
2. **Game Loop**: Standard update/render pattern with `requestAnimationFrame`
3. **Input System**: Keyboard (WASD/arrows, spacebar) and mouse (aim/shoot) handlers
4. **Rendering**: Canvas 2D API for all graphics
5. **Entity Systems**:
   - Player with multiple alien transformations (Ben, Heatblast, Four Arms, XLR8, Cannonbolt)
   - Pets that orbit the player (Stinkfly, Heatblast, Grey)
   - Wave-based enemy spawning
   - Projectile system for combat

## Key Game Mechanics

- **Transformations**: Each alien form has different stats (HP, speed, attack, range) with unique attack patterns
- **Combat**: Click/tap to shoot with auto-aim on mobile, pets actively attack enemies
- **Enemy Types**: Basic, Fast, Tank, and Ranged enemies with different behaviors
- **Waves**: Progressive difficulty with enemy variety increasing by wave
- **Pickups**: Health pickups drop from defeated enemies
- **Score System**: Points based on enemy type and current wave
- **Mobile Support**: Virtual joystick, touch controls, and responsive canvas

## Asset Files

- `ben10.gif` - Main character sprite
- `ben10_sprite.png` - Alternative sprite image