# ⚡ NEON RUSH: Cyberpunk Endless Parkour Runner

<div align="center">

![NEON RUSH Banner](https://img.shields.io/badge/NEON_RUSH-v1.0.0-00f0ff?style=for-the-badge&logo=electron&logoColor=000)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B_Modules-ffe600?style=for-the-badge&logo=javascript&logoColor=000)
![Canvas](https://img.shields.io/badge/HTML5-Canvas_2D-ff007f?style=for-the-badge&logo=html5&logoColor=fff)
![Web Audio](https://img.shields.io/badge/Web_Audio_API-Procedural_Synth-9d00ff?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-00ff66?style=for-the-badge)

**High-octane 2D cyberpunk endless runner featuring vertical gravity manipulation, procedural synthwave audio, modular upgrades, epic boss battles, and fluid parkour mechanics.**

[🎮 Play Online](#-quick-start) • [✨ Key Features](#-features) • [🕹️ Controls](#️-controls) • [🏛️ Architecture](#️-architecture) • [🤖 AI Agent Guide](file:///Users/maksimklisin/Desktop/_JS/_games/neonRush/AGENTS.md)

</div>

---

## 🌟 Highlights

* 🌀 **Ceiling & Floor Gravity Inversion**: Flip gravity instantly between floor and ceiling to dodge lethal traps and run along multi-tiered cyber tracks.
* 💥 **Combat & Boss Fights**: Engage massive dreadnoughts like the **Cyber-Drone MK-IV** equipped with auto-targeting blasters, twin plasma cannons, and charged railguns.
* 🎵 **100% Procedural Synthwave Audio**: Real-time Web Audio API synthesizer generating dynamic 16-step basslines, arpeggios, chords, and punchy 8-bit/cyberpunk sound effects without external audio files.
* 🛡️ **Cyber Lab & Roguelite Upgrades**: Upgrade Magnet Duration, Reactive Shields, Score Multipliers, Slow-Mo Time Dilation, and Coin Boosts.
* 🎨 **Unlockable Runner Skins**: Unlock legendary skins like *Classic Blue, Neon Phantom, Cyber Ninja, Solar Flare, Void Walker,* and *Glitch Runner*.
* 💥 **Cinematic Cyber Death Sequence**: Bullet-time slow-motion impact, expanding neon shockwaves, tumbling polygonal armor debris, and CRT digital glitch scanlines.
* 📦 **Zero-GC Object Pooling**: Ultra-smooth 60–120 FPS performance with zero memory allocation pauses.

---

## 🕹️ Controls

| Action | Desktop Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Jump / Double Jump** | <kbd>Space</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> | Tap screen / Tap **▲ JUMP** button |
| **Slide / Under-Dodge** | <kbd>S</kbd> / <kbd>↓</kbd> | Swipe Down / Tap **▼ SLIDE** button |
| **Flip Gravity** | <kbd>Shift</kbd> / <kbd>G</kbd> | Swipe Up / Tap **⚡ FLIP** button |
| **Hyperdrive Nitro** | <kbd>F</kbd> / <kbd>Ctrl</kbd> | Double Tap / Tap **🔥 NITRO** button |
| **Pause Game** | <kbd>Escape</kbd> / <kbd>P</kbd> | Tap **⏸️ Pause** button |

---

## 🏛️ Architecture & Project Structure

NEON RUSH is designed with clean domain-driven architecture, zero external runtime dependencies, and strict module separation:

```
neonRush/
├── index.html                  # Cyberpunk HUD, modals, and Canvas container
├── package.json                # Vite build scripts and dependencies
├── vite.config.js              # Vite dev server configuration
├── AGENTS.md                   # Complete developer & AI agent guidelines
├── src/
│   ├── config/                 # Game balance, biomes, skins, upgrades, quests
│   │   ├── constants.js        # Physics, dimensions, speed ramp constants
│   │   ├── palettes.js         # Sector biomes (Neon City, Cyber Core, etc.)
│   │   ├── skins.js            # Runner skins with custom color palettes
│   │   ├── upgrades.js         # Cyber Lab perk definitions & costs
│   │   ├── achievements.js     # Milestone achievements
│   │   └── quests.js           # Daily quest system
│   ├── core/                   # Engine coordinator & state machine
│   │   ├── EventBus.js         # Pub/Sub event dispatcher
│   │   ├── GameState.js        # State machine enum
│   │   ├── GameLoop.js         # Delta-time clamped RAF loop
│   │   └── Game.js             # Master game coordinator
│   ├── entities/               # Game objects
│   │   ├── Entity.js           # Base AABB entity
│   │   ├── Player.js           # Parkour runner, skin renderer, gravity scale
│   │   ├── Obstacle.js         # Spikes, lasers, drones, patrollers
│   │   ├── Collectible.js      # Coins, nitro orbs, powerup capsules
│   │   ├── Projectile.js       # Blaster laser bolts and plasma shots
│   │   └── Boss.js             # Dreadnought boss AI and attacks
│   ├── systems/                # Subsystems
│   │   ├── ObjectPool.js       # Zero-allocation pooled memory manager
│   │   ├── Camera.js           # Smooth lerp camera with trauma screen shake
│   │   ├── LevelGenerator.js   # Procedural track chunks & route generation
│   │   ├── CollisionSystem.js  # Swept Continuous Collision Detection (CCD)
│   │   └── ParticleSystem.js   # Sparks, shockwaves, debris, glitch lines
│   ├── services/               # State & Audio services
│   │   ├── StorageService.js   # Versioned LocalStorage persistence
│   │   ├── AudioService.js     # Web Audio API Synthwave sound engine
│   │   ├── AchievementService.js # Achievement evaluator
│   │   └── QuestService.js     # Quest tracker & rewards
│   ├── input/
│   │   └── InputManager.js     # Keyboard, mouse, touch swipes & virtual buttons
│   ├── render/
│   │   ├── Renderer.js         # Virtual resolution scaler (1280x720)
│   │   └── BackgroundRenderer.js # Parallax city skyline and neon grids
│   ├── ui/
│   │   └── UIManager.js        # Screen navigation, modals, HUD controller
│   └── styles/
│       └── main.css            # Cyberpunk theme, glows, and tabular nums
```

---

## ⚡ Quick Start

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (version 18+) installed.

### 2. Installation
```bash
git clone https://github.com/emaxe/neonRush.git
cd neonRush
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### 4. Build for Production
```bash
npm run build
```
The optimized bundle will be created in the `dist/` directory.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
