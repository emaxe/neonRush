import { CONFIG } from '../config/constants.js';
import { PALETTES } from '../config/palettes.js';
import { GameState } from './GameState.js';
import { GameLoop } from './GameLoop.js';
import { eventBus } from './EventBus.js';
import { storageService } from '../services/StorageService.js';
import { audioService } from '../services/AudioService.js';
import { achievementService } from '../services/AchievementService.js';
import { questService } from '../services/QuestService.js';
import { Player } from '../entities/Player.js';
import { Boss } from '../entities/Boss.js';
import { LevelGenerator } from '../systems/LevelGenerator.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { particleSystem } from '../systems/ParticleSystem.js';
import { Camera } from '../systems/Camera.js';
import { Renderer } from '../render/Renderer.js';
import { BackgroundRenderer } from '../render/BackgroundRenderer.js';
import { InputManager } from '../input/InputManager.js';
import { UIManager } from '../ui/UIManager.js';

/**
 * Game - Master orchestrator connecting all systems, entities, and state transitions.
 */
export class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.ctx = this.renderer.ctx;

    this.state = GameState.MENU;
    this.player = new Player();
    this.boss = new Boss();
    this.levelGen = new LevelGenerator();
    this.bgRenderer = new BackgroundRenderer();
    this.camera = new Camera();

    this.input = new InputManager(this.player, this);
    this.ui = new UIManager(this);

    this.stats = {
      distance: 0,
      score: 0,
      combo: 1.0,
      maxCombo: 1.0,
      coins: 0,
      bossesKilled: 0,
      biomeName: PALETTES.city.name,
      deathReason: 'COLLISION'
    };

    this.nextBossDistance = CONFIG.BOSS_INTERVAL;

    this.bindSystemEvents();
    this.ui.showScreen(GameState.MENU);

    // Setup game loop
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );
    this.loop.start();
  }

  bindSystemEvents() {
    eventBus.on('boss_defeated', (pos) => {
      this.stats.bossesKilled++;
      this.stats.score += 5000 * this.stats.combo;
      this.stats.coins += 50;
      this.nextBossDistance += CONFIG.BOSS_INTERVAL;
      this.camera.shake(12, 0.4);
      particleSystem.spawnFloatingText(pos.x, pos.y, 'BOSS DEFEATED! +5000', '#00ff66', 20);

      // Reward coin burst & shield
      for (let i = 0; i < 15; i++) {
        const c = this.levelGen.collectiblePool.get();
        c.init(pos.x + (i - 7) * 40, pos.y + Math.random() * 60, 'coin');
        this.levelGen.collectibles.push(c);
      }
      const p = this.levelGen.collectiblePool.get();
      p.init(pos.x + 300, 360, 'powerup', 'shield');
      this.levelGen.collectibles.push(p);

      storageService.data.bossesDefeated = (storageService.data.bossesDefeated || 0) + 1;
      questService.updateProgress('boss_kill', 1);
      achievementService.check(this.stats);
    });

    eventBus.on('gravity_flipped', () => {
      storageService.data.gravityFlips = (storageService.data.gravityFlips || 0) + 1;
      questService.updateProgress('acc_flips', 1);
      achievementService.check(this.stats);
    });

    eventBus.on('nitro_activated', () => {
      storageService.data.nitroUses = (storageService.data.nitroUses || 0) + 1;
      achievementService.check(this.stats);
      this.camera.shake(5, 0.2);
    });

    eventBus.on('player_jump', () => {
      questService.updateProgress('acc_jumps', 1);
    });
  }

  startRun() {
    this.state = GameState.PLAYING;
    this.camera.reset();
    this.stats = {
      distance: 0,
      score: 0,
      combo: 1.0,
      maxCombo: 1.0,
      coins: 0,
      bossesKilled: 0,
      biomeName: PALETTES.city.name,
      deathReason: 'COLLISION'
    };
    this.nextBossDistance = CONFIG.BOSS_INTERVAL;

    this.levelGen.reset();
    this.player.reset(500);
    this.boss.active = false;
    particleSystem.clear();

    audioService.ensureContext();
    audioService.startMusic();
    this.ui.showScreen(GameState.PLAYING);
  }

  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.ui.showScreen(GameState.PAUSED);
    } else if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.ui.showScreen(GameState.PLAYING);
    }
  }

  quitToMenu() {
    this.state = GameState.MENU;
    this.boss.active = false;
    audioService.stopMusic();
    this.ui.showScreen(GameState.MENU);
  }

  handlePlayerDeath(reason) {
    if (this.state === GameState.DYING || this.state === GameState.GAME_OVER) return;

    this.state = GameState.DYING;
    this.deathTimer = 1.35;
    this.stats.deathReason = reason;

    audioService.stopMusic();
    audioService.playDeathFlatline();
    this.camera.shake(22, 0.8);

    const centerX = this.player.x + this.player.width / 2;
    const centerY = this.player.y + this.player.height / 2;
    particleSystem.spawnDeathDisintegration(centerX, centerY, this.player.skin);

    // Persistent storage updates
    const data = storageService.data;
    data.coins += this.stats.coins;
    data.totalCoinsCollected += this.stats.coins;
    data.totalRuns += 1;
    if (this.stats.score > data.highScore) data.highScore = Math.floor(this.stats.score);
    if (this.stats.distance > data.maxDistance) data.maxDistance = Math.floor(this.stats.distance);

    questService.updateProgress('single_dist', Math.floor(this.stats.distance));
    achievementService.check(this.stats);
    storageService.save();
  }

  update(dt) {
    if (this.state === GameState.DYING) {
      const slowDt = dt * 0.35; // Cinematic slow motion bullet time
      this.deathTimer -= dt;

      this.camera.update(slowDt, this.player.x);
      particleSystem.update(slowDt);
      this.levelGen.obstacles.forEach(o => o.update(slowDt));
      this.levelGen.projectiles.forEach(p => p.update(slowDt));

      if (this.deathTimer <= 0) {
        this.state = GameState.GAME_OVER;
        this.ui.showGameOver(this.stats);
      }
      return;
    }

    if (this.state !== GameState.PLAYING) return;

    // Slow-mo time scale
    const effectiveDt = this.player.isSlowMo ? dt * 0.55 : dt;
    const player = this.player;

    // Speed progression
    const speedRamp = Math.min(CONFIG.PLAYER_MAX_SPEED, CONFIG.PLAYER_BASE_SPEED + (this.stats.distance * CONFIG.SPEED_ACCELERATION * 0.1));
    const currentSpeed = player.isNitro ? speedRamp * 1.65 : speedRamp;
    player.x += currentSpeed * effectiveDt;

    // Distance & Score calculation
    this.stats.distance = (player.x - 200) / 10;
    const multiplierBuff = player.multiplierTimer > 0 ? 2 : 1;
    this.stats.score += currentSpeed * effectiveDt * 0.1 * this.stats.combo * multiplierBuff;

    // Combat blaster firing
    player.shootCooldown -= effectiveDt;
    const hasTargetAhead = this.boss.active || this.levelGen.obstacles.some(o => (o.type === 'drone' || o.type === 'patroller') && o.x > player.x && o.x < player.x + 650);
    if (player.shootCooldown <= 0 && hasTargetAhead) {
      player.shootCooldown = 0.28;
      const proj = this.levelGen.projectilePool.get();
      const boltY = player.gravityDir === 1 ? player.y + 24 : player.y + player.height - 24;
      proj.init(player.x + player.width + 5, boltY, currentSpeed + 850, 0, player.skin.head, true, 6);
      this.levelGen.projectiles.push(proj);
      particleSystem.spawnSparks(player.x + player.width + 10, boltY, player.skin.head, 3);
      audioService.playShoot();
    }

    // Update Player Physics
    player.update(effectiveDt, currentSpeed);

    // Check Boss Spawn trigger
    if (this.stats.distance >= this.nextBossDistance && !this.boss.active) {
      this.boss.spawn(player.x);
      eventBus.emit('boss_spawned', this.boss.name);
    }

    // Update Boss
    if (this.boss.active) {
      this.boss.update(effectiveDt, player, this.levelGen);
    }

    // Update Camera
    this.camera.update(effectiveDt, player.x);

    // Update Level Generation & Biomes
    this.levelGen.updateGeneration(player.x, this.boss.active);
    this.stats.biomeName = this.levelGen.currentBiome.name;

    // Update Obstacles, Collectibles, Projectiles
    this.levelGen.obstacles.forEach(o => o.update(effectiveDt));
    this.levelGen.collectibles.forEach(c => c.update(effectiveDt, player));
    this.levelGen.projectiles.forEach(p => p.update(effectiveDt));

    // Resolve Collisions
    CollisionSystem.resolve({
      player: this.player,
      levelGen: this.levelGen,
      boss: this.boss,
      stats: this.stats,
      camera: this.camera,
      onPlayerDeath: (reason) => this.handlePlayerDeath(reason),
      onIncreaseCombo: (amt) => this.increaseCombo(amt),
      onApplyPowerUp: (subType) => this.applyPowerUp(subType),
      onQuestProgress: (type, val) => questService.updateProgress(type, val)
    });

    // Update Particles
    particleSystem.update(effectiveDt);

    // Cleanup offscreen objects
    this.levelGen.cleanup(this.camera.x);

    // Update HUD
    this.ui.updateHUD(this.stats, player, this.boss);
  }

  applyPowerUp(subType) {
    if (subType === 'magnet') this.player.magnetTimer = CONFIG.MAGNET_DURATION;
    else if (subType === 'shield') this.player.hasShield = true;
    else if (subType === 'multiplier') this.player.multiplierTimer = CONFIG.MULTIPLIER_DURATION;
    else if (subType === 'slowmo') this.player.slowMoTimer = CONFIG.SLOWMO_DURATION;
    else if (subType === 'ghost') this.player.ghostTimer = CONFIG.GHOST_DURATION;
  }

  increaseCombo(amount) {
    this.stats.combo = Math.min(10.0, this.stats.combo + amount);
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }
    questService.updateProgress('max_combo', Math.floor(this.stats.combo));
    achievementService.check(this.stats);
  }

  render() {
    this.renderer.begin();
    const ctx = this.ctx;
    const camX = this.camera.renderX;
    const camY = this.camera.renderY;

    // 1. Background
    this.bgRenderer.draw(ctx, camX, camY, this.levelGen.currentBiome);

    // 2. Track Platforms
    this.levelGen.drawPlatforms(ctx, camX, camY);

    // 3. Obstacles
    for (let i = 0; i < this.levelGen.obstacles.length; i++) {
      this.levelGen.obstacles[i].draw(ctx, camX, camY, this.levelGen.currentBiome);
    }

    // 4. Collectibles
    for (let i = 0; i < this.levelGen.collectibles.length; i++) {
      this.levelGen.collectibles[i].draw(ctx, camX, camY);
    }

    // 5. Projectiles
    for (let i = 0; i < this.levelGen.projectiles.length; i++) {
      this.levelGen.projectiles[i].draw(ctx, camX, camY);
    }

    // 6. Boss
    if (this.boss.active) {
      this.boss.draw(ctx, camX, camY);
    }

    // 7. Player Runner
    if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
      this.player.draw(ctx, camX, camY);
    } else if (this.state === GameState.DYING && this.deathTimer > 1.0) {
      // Disintegrating flickering cyber hologram during initial impact burst
      ctx.save();
      ctx.globalAlpha = (this.deathTimer - 1.0) * 2.5;
      this.player.draw(ctx, camX, camY);
      ctx.restore();
    }

    // 8. Particles, Shockwaves, Tumbling Debris & Glitch
    particleSystem.draw(ctx, camX, camY);
  }
}
