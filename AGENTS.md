# 🤖 AGENTS.md — AI Agent & Developer Guidelines

This document provides definitive instructions, architecture patterns, and conventions for AI coding assistants (e.g. Antigravity, Claude, Copilot, ChatGPT) and developers modifying or extending the **NEON RUSH** codebase.

---

## ⚡ 1. Project Mission & Tech Stack

**NEON RUSH** is a high-octane 2D cyberpunk endless parkour runner built entirely with **Vanilla JavaScript (ES Modules)**, **HTML5 Canvas 2D API**, **Web Audio API**, and **Tailwind CSS**.

* **Core Language:** Modern Vanilla JavaScript (ES6+ Modules, strict mode).
* **Build System:** Vite (`vite`, `vite build`).
* **Rendering:** Double-buffered HTML5 Canvas 2D with HiDPI virtual scaling ($1280 \times 720$ base resolution).
* **Audio Engine:** 100% Procedural Web Audio API Synthesizer (0 external audio assets required).
* **State Management:** Decoupled Event-Driven Architecture (`EventBus`) with local storage persistence (`StorageService`).
* **No external runtime dependencies** (Zero-dependency gaming core).

---

## 🏗️ 2. Architectural Blueprint & Directory Layout

The codebase strictly follows clean domain-driven modular boundaries:

```
neonRush/
├── index.html                  # Main UI layout, overlays, HUD, and Canvas mount
├── package.json                # Scripts & Vite configuration
├── vite.config.js              # Local server setup
├── public/
│   ├── favicon.svg             # Neon cyber runner SVG icon
│   └── manifest.json           # PWA metadata
├── src/
│   ├── config/                 # Immutable constants & configuration data
│   │   ├── constants.js        # Physics, dimensions, speed ramp constants
│   │   ├── palettes.js         # Cyberpunk biome color palettes
│   │   ├── skins.js            # Unlockable runner skins & cosmetics
│   │   ├── upgrades.js         # Cyber Lab talent tree definition
│   │   ├── achievements.js     # Trophies & reward milestones
│   │   └── quests.js           # Daily/ongoing quest templates
│   ├── core/                   # Engine lifecycle & central coordinator
│   │   ├── EventBus.js         # Pub/Sub event dispatcher
│   │   ├── GameState.js        # Immutable finite state machine enum
│   │   ├── GameLoop.js         # Delta-time clamped RequestAnimationFrame loop
│   │   └── Game.js             # Engine orchestrator, entity updates, states
│   ├── entities/               # Game actor classes
│   │   ├── Entity.js           # Base entity with AABB hitbox getters
│   │   ├── Player.js           # Parkour runner, state, flip, skins, rendering
│   │   ├── Obstacle.js         # Spikes, barriers, high lasers, drones, patrollers
│   │   ├── Collectible.js      # Coins, nitro energy cells, powerup capsules
│   │   ├── Projectile.js       # Blaster laser bolts and plasma orbs
│   │   └── Boss.js             # Dreadnought boss AI, railguns, tri-beam attacks
│   ├── systems/                # Pure subsystems & algorithms
│   │   ├── ObjectPool.js       # Generic zero-allocation object pool
│   │   ├── Camera.js           # Smooth lerp camera with trauma-based shake
│   │   ├── LevelGenerator.js   # Procedural chunk generator & biome shifter
│   │   ├── CollisionSystem.js  # Swept AABB & Continuous Collision Detection (CCD)
│   │   └── ParticleSystem.js   # Neon sparks, shockwaves, cyber debris, text FX
│   ├── services/               # State persistence & audio synthesis
│   │   ├── StorageService.js   # LocalStorage schema migration & persistence
│   │   ├── AudioService.js     # Web Audio API procedural synthesizer & SFX
│   │   ├── AchievementService.js # Achievement evaluator
│   │   └── QuestService.js     # Quest tracker & reward dispatcher
│   ├── input/
│   │   └── InputManager.js     # Keyboard, mouse, touch swipes & virtual buttons
│   ├── render/
│   │   ├── Renderer.js         # Canvas resolution scaler & aspect ratio fit
│   │   └── BackgroundRenderer.js # Parallax skyline, neon grids, mountains
│   ├── ui/
│   │   └── UIManager.js        # Screen navigation, modals, HUD DOM updates
│   └── styles/
│       └── main.css            # Cyberpunk typography, glow tokens, tabular nums
```

---

## 📐 3. Coordinate System & Physics Standards

1. **Virtual Base Resolution:** Always render and calculate physics relative to $1280 \times 720$ virtual pixels. The [`Renderer.js`](file:///Users/maksimklisin/Desktop/_JS/_games/neonRush/src/render/Renderer.js) scales this up/down automatically to any window size.
2. **Coordinate Orientation:**
   - $x = 0$ is start; $x$ increases to the **right** (forward run direction).
   - $y = 0$ is the **top of screen** (ceiling); $y = 720$ is the **bottom** (void/floor).
3. **Gravity Inversion (`gravityDir`):**
   - `gravityDir === 1`: Floor gravity (downward towards $y = 600$).
   - `gravityDir === -1`: Ceiling gravity (upward towards $y = 120$).
   - **Crucial Rule:** Inverting gravity must flip the visual model vertically using `ctx.scale(1, player.scaleY)`, **never** `ctx.rotate(Math.PI)`. `scale(1, -1)` preserves the forward-facing direction to the right, while `rotate(Math.PI)` causes the runner to run backwards.
4. **Air-Flip Lockout:** Gravity can **only** be flipped when `player.isGrounded === true`. The `player.isFlipping` flag locks out subsequent flips until the player has physically landed on the opposing surface.
5. **Continuous Collision Detection (CCD):**
   - Fast vertical jumps and falls use `player.prevY` in [`CollisionSystem.js`](file:///Users/maksimklisin/Desktop/_JS/_games/neonRush/src/systems/CollisionSystem.js) to test surface intersection (`crossedSurface || withinPlatformDepth`). Never rely solely on single-frame static bounding box overlap for floors or ceilings.

---

## 🚀 4. Performance & Object Pooling (Zero-GC)

To maintain 60–120 FPS without garbage collection micro-stutters:
* **Never instantiate objects during the `update()` or `render()` frames.**
* **Use [`ObjectPool.js`](file:///Users/maksimklisin/Desktop/_JS/_games/neonRush/src/systems/ObjectPool.js)** for:
  - Obstacles (`this.obstaclePool`)
  - Collectibles (`this.collectiblePool`)
  - Projectiles (`this.projectilePool`)
  - Visual particles & floating text (`this.pool`, `this.textPool`)
* When an entity leaves the screen ($x < \text{cameraX} - 200$) or is destroyed:
  1. `entity.active = false`
  2. `pool.release(entity)`
  3. Remove from active array via `splice(i, 1)`.

---

## 🎵 5. Web Audio API Synthesizer Rules

All sound effects and background music are generated procedurally via the Web Audio API in [`AudioService.js`](file:///Users/maksimklisin/Desktop/_JS/_games/neonRush/src/services/AudioService.js):
* Always call `this.ensureContext()` before playing any audio to resume suspended audio contexts on user gesture.
* Master gain nodes: `this.masterGain`, `this.sfxGain`, and `this.musicGain` must control all volume scaling.
* Use exponential ramps (`exponentialRampToValueAtTime`) rather than linear cuts to prevent audio clicks/pops.

---

## 🎨 6. Level Design & Chunk Generation Contract

When adding new chunk layouts in [`LevelGenerator.js`](file:///Users/maksimklisin/Desktop/_JS/_games/neonRush/src/systems/LevelGenerator.js):
1. **Telegraphing Distance:** Obstacles must never spawn directly inside the player's immediate field of view or right on top of floor coin lines.
2. **Slide Clearance:** High laser gates (`high_laser`) require low coin trails that start at least $140\text{px}$ before the obstacle to prompt the slide maneuver ahead of time.
3. **Jump Arcs:** Coin arcs (`spawnCoinArc`) must follow natural parabolic trajectories over ground obstacles, guiding the player's jump timing.
4. **Branching Routes:** Elevated platforms must provide a safe alternative low road for players who miss the high path.

---

## 🖥️ 7. UI & State Machine Protocol

* Game states are defined in [`GameState.js`](file:///Users/maksimklisin/Desktop/_JS/_games/neonRush/src/core/GameState.js): `MENU`, `PLAYING`, `DYING`, `PAUSED`, `GAME_OVER`, `SHOP`, `UPGRADES`, `ACHIEVEMENTS`, `QUESTS`, `SETTINGS`, `TUTORIAL`.
* **Death Transition:** A fatal collision triggers `GameState.DYING` (a $1.35\text{s}$ slow-motion sequence with cyber debris and shockwaves) before transitioning to `GameState.GAME_OVER`.
* **Tabular Numbers:** All HUD counters must use the `.tabular-nums` CSS class (`font-variant-numeric: tabular-nums`) and fixed container widths to prevent UI jitter when digits change.

---

## 🧪 8. Validation Workflow for AI Agents

Whenever making modifications to the codebase:
1. **Always verify compilation and bundle correctness:**
   ```bash
   npm run build
   ```
2. **Ensure there are no uncaught exceptions** or missing method definitions in `Game.js`, `CollisionSystem.js`, or `LevelGenerator.js`.
3. **Keep code strictly modular:** Do not re-merge files back into monoliths; place classes in their respective domain folders.
