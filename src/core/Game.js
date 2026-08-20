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
    this.level = 1; // текущий уровень (растёт после каждого босса)
    this.comboTimer = 0; // таймер спада комбо (сбрасывается при наборе)
    this.comboFlash = { color: '#00f0ff', alpha: 0, timer: 0, duration: 0.35 };
    this.lastMilestone = 0; // highest combo threshold crossed this run (3/5/8/10)
    this.nearMissStreak = 0; // последовательные near-miss (без пропуска)
    this.lastNearMissStreakThreshold = 0; // highest streak threshold crossed (2/5/10)

    this.handlePlayerDeathBound = (reason) => this.handlePlayerDeath(reason);
    this.increaseComboBound = (amt) => this.increaseCombo(amt);
    this.applyPowerUpBound = (subType) => this.applyPowerUp(subType);
    this.onQuestProgressBound = (type, val) => questService.updateProgress(type, val);
    this.onPerfectLandingBound = (x, y) => this.handlePerfectLanding(x, y);
    this.onNearMissBound = () => this.handleNearMiss();
    this.onNearMissStreakBreakBound = () => this.handleNearMissBreak();

    this.collisionContext = {
      player: this.player,
      levelGen: this.levelGen,
      boss: this.boss,
      stats: this.stats,
      camera: this.camera,
      onPlayerDeath: this.handlePlayerDeathBound,
      onIncreaseCombo: this.increaseComboBound,
      onApplyPowerUp: this.applyPowerUpBound,
      onQuestProgress: this.onQuestProgressBound,
      onPerfectLanding: this.onPerfectLandingBound,
      onNearMiss: this.onNearMissBound,
      onNearMissStreakBreak: this.onNearMissStreakBreakBound
    };

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
      this.camera.shake(12, 0.4);
      particleSystem.spawnFloatingText(pos.x, pos.y, 'BOSS DEFEATED! +5000', '#00ff66', 20);
      particleSystem.spawnConfetti(pos.x, pos.y, 50);

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

      // Новый уровень: снова долгий забег с препятствиями, затем следующий босс
      this.startNextLevel();
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
    this.collisionContext.stats = this.stats;
    this.nextBossDistance = CONFIG.BOSS_INTERVAL;
    this.level = 1;
    this.comboFlash.timer = 0;
    this.comboFlash.alpha = 0;
    this.lastMilestone = 0;
    this.nearMissStreak = 0;
    this.lastNearMissStreakThreshold = 0;

    this.levelGen.reset();
    this.player.reset(500);
    this.boss.active = false;
    particleSystem.clear();

    audioService.ensureContext();
    audioService.startMusic();
    this.ui.showScreen(GameState.PLAYING);
  }

  /**
   * Переход на следующий уровень после убийства босса.
   * Игрок продолжает бежать, но сложность растёт: скорость выше,
   * препятствий больше, следующий босс ближе и сильнее.
   */
  startNextLevel() {
    this.level++;
    this.boss.active = false;

    // Следующий босс — через уменьшенный интервал (но не меньше минимума)
    const interval = Math.max(
      CONFIG.LEVEL_MIN_BOSS_INTERVAL,
      CONFIG.BOSS_INTERVAL - (this.level - 1) * CONFIG.LEVEL_BOSS_INTERVAL_DECREASE
    );
    this.nextBossDistance = this.stats.distance + interval;

    // Очищаем снаряды босса, чтобы не остались после победы
    this.levelGen.projectiles.forEach(p => this.levelGen.projectilePool.release(p));
    this.levelGen.projectiles = [];

    // Уведомление о новом уровне
    particleSystem.spawnFloatingText(this.player.x + 200, 200, `LEVEL ${this.level}`, '#00f0ff', 28);
    particleSystem.spawnFloatingText(this.player.x + 200, 260, 'SPEED UP!', '#ffe600', 18);
    audioService.playPowerUp();
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

    const cf = this.comboFlash;
    if (cf.timer > 0) {
      cf.timer -= effectiveDt;
      cf.alpha = Math.max(0, 0.35 * (cf.timer / cf.duration));
    }

    // Speed progression (базовая скорость растёт с уровнем)
    const levelSpeedBonus = Math.min(
      CONFIG.LEVEL_MAX_SPEED_BONUS,
      (this.level - 1) * CONFIG.LEVEL_SPEED_BONUS
    );
    const speedRamp = Math.min(
      CONFIG.PLAYER_MAX_SPEED + levelSpeedBonus,
      CONFIG.PLAYER_BASE_SPEED + levelSpeedBonus + (this.stats.distance * CONFIG.SPEED_ACCELERATION * 0.1)
    );
    const currentSpeed = player.isNitro ? speedRamp * 1.65 : speedRamp;
    player.x += currentSpeed * effectiveDt;

    // Distance & Score calculation
    this.stats.distance = (player.x - 200) / 10;
    const multiplierBuff = player.multiplierTimer > 0 ? 2 : 1;
    this.stats.score += currentSpeed * effectiveDt * 0.1 * this.stats.combo * multiplierBuff;

    // Combat blaster firing
    player.shootCooldown -= effectiveDt;
    let hasTargetAhead = this.boss.active;
    if (!hasTargetAhead) {
      const obstacles = this.levelGen.obstacles;
      const minX = player.x;
      const maxX = player.x + 650;
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i];
        if ((o.type === 'drone' || o.type === 'patroller') && o.x > minX && o.x < maxX) {
          hasTargetAhead = true;
          break;
        }
      }
    }
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
      this.boss.spawn(player.x, this.level);
      eventBus.emit('boss_spawned', this.boss.name);
    }

    // Update Boss
    if (this.boss.active) {
      this.boss.update(effectiveDt, player, this.levelGen, currentSpeed);
    }

    // Update Camera
    this.camera.update(effectiveDt, player.x);

    // Update Level Generation & Biomes
    this.levelGen.updateGeneration(player.x, this.boss.active, this.level);
    this.stats.biomeName = this.levelGen.currentBiome.name;

    // Update Obstacles, Collectibles, Projectiles
    const obstacles = this.levelGen.obstacles;
    for (let i = 0; i < obstacles.length; i++) {
      obstacles[i].update(effectiveDt);
    }
    const collectibles = this.levelGen.collectibles;
    for (let i = 0; i < collectibles.length; i++) {
      collectibles[i].update(effectiveDt, player);
    }
    const projectiles = this.levelGen.projectiles;
    for (let i = 0; i < projectiles.length; i++) {
      projectiles[i].update(effectiveDt);
    }

    // Resolve Collisions
    CollisionSystem.resolve(this.collisionContext);

    // Update Particles
    particleSystem.update(effectiveDt);

    // Speed lines at high velocity
    if (currentSpeed > 600 && Math.random() < 0.3) {
      particleSystem.spawnSpeedLines(3);
    }
    if (player.isNitro && Math.random() < 0.5) {
      particleSystem.spawnSpeedLines(5);
    }

    // Cleanup offscreen objects
    this.levelGen.cleanup(this.camera.x);

    // Combo decay: если игрок не набирает комбо (монеты/near-miss) в течение
    // COMBO_DECAY_TIME, множитель плавно спадает к 1.0
    if (this.stats.combo > 1.0) {
      this.comboTimer += effectiveDt;
      if (this.comboTimer >= CONFIG.COMBO_DECAY_TIME) {
        this.stats.combo = Math.max(1.0, this.stats.combo - CONFIG.COMBO_DECAY_RATE * effectiveDt);
      }
    }

    // Update HUD
    this.ui.updateHUD(this.stats, player, this.boss, this.level);
  }

  applyPowerUp(subType) {
    if (subType === 'magnet') this.player.magnetTimer = CONFIG.MAGNET_DURATION;
    else if (subType === 'shield') {
      // Shield capsule: восстанавливает один заряд (до уровня апгрейда)
      const maxCharges = storageService.data?.upgrades?.shield || 1;
      this.player.shieldCharges = Math.min(maxCharges, this.player.shieldCharges + 1);
      this.player.hasShield = this.player.shieldCharges > 0;
    }
    else if (subType === 'multiplier') this.player.multiplierTimer = CONFIG.MULTIPLIER_DURATION;
    else if (subType === 'slowmo') this.player.slowMoTimer = CONFIG.SLOWMO_DURATION;
    else if (subType === 'ghost') this.player.ghostTimer = CONFIG.GHOST_DURATION;
  }

  _fireComboMilestone(level) {
    const texts = { 3: 'COMBO x3!', 5: 'COMBO x5!', 8: 'COMBO x8!', 10: 'MAX COMBO x10!' };
    const colors = { 3: '#00f0ff', 5: '#ffe600', 8: '#ff007f', 10: '#ff0055' };
    const cx = this.player.x + this.player.width / 2;
    const cy = this.player.y + this.player.height / 2 - 30;
    particleSystem.spawnFloatingText(cx, cy, texts[level], colors[level], level === 10 ? 28 : 22);
    particleSystem.spawnShockwave(cx, cy, colors[level], 80 + level * 14, 0.35);
    if (level === 10) particleSystem.spawnConfetti(cx, cy, 30);
    this.camera.shake(3 + level * 0.7, 0.18 + level * 0.03);
    // Screen flash (reuse object, no alloc)
    this.comboFlash.color = colors[level];
    this.comboFlash.alpha = 0.35;
    this.comboFlash.timer = 0.35 + level * 0.03;
    this.comboFlash.duration = this.comboFlash.timer;
    audioService.playComboMilestone(level);
  }

  increaseCombo(amount) {
    this.stats.combo = Math.min(10.0, this.stats.combo + amount);
    this.comboTimer = 0; // сброс таймера спада при наборе комбо
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }
    questService.updateProgress('max_combo', Math.floor(this.stats.combo));
    achievementService.check(this.stats);

    const newMilestone = this.stats.combo >= 10 ? 10
      : this.stats.combo >= 8 ? 8
      : this.stats.combo >= 5 ? 5
      : this.stats.combo >= 3 ? 3 : 0;
    if (newMilestone > this.lastMilestone) {
      this.lastMilestone = newMilestone;
      this._fireComboMilestone(newMilestone);
    }
  }

  /**
   * Perfect Landing: награда за точное приземление на платформу после прыжка/падения.
   * Даёт буст комбо, очки и джус (частицы + звук + всплывающий текст).
   * @param {number} x - мировая X-координата точки приземления
   * @param {number} y - мировая Y-координата поверхности платформы
   */
  handlePerfectLanding(x, y) {
    this.increaseCombo(CONFIG.PERFECT_LANDING_COMBO);
    this.stats.score += CONFIG.PERFECT_LANDING_SCORE * this.stats.combo;

    // Всплывающий текст над точкой приземления (с учётом гравитации)
    const textY = this.player.gravityDir === 1 ? y - 25 : y + 25;
    particleSystem.spawnFloatingText(x, textY, `PERFECT LANDING! +${CONFIG.PERFECT_LANDING_COMBO}x`, '#00f0ff', 14);
    particleSystem.spawnSparks(x, y, this.player.skin.trail, 8);
    particleSystem.spawnShockwave(x, y, '#00f0ff', 55, 0.25);
    this.camera.shake(2, 0.1);

    // Лёгкий экранный флеш (reuse comboFlash, zero-alloc)
    this.comboFlash.color = '#00f0ff';
    this.comboFlash.alpha = 0.18;
    this.comboFlash.timer = 0.18;
    this.comboFlash.duration = 0.18;

    audioService.playCoin(Math.floor(this.stats.combo));
  }

  /**
   * Near-Miss: пролёт вплотную мимо препятствия. Накапливает streak;
   * на порогах (2/5/10) даёт усиленную награду и джус.
   */
  handleNearMiss() {
    this.nearMissStreak++;
    const streak = this.nearMissStreak;
    const cx = this.player.x + this.player.width / 2;
    const cy = this.player.y - 30;

    // Проверяем пороги streak (сверху вниз, чтобы взять самый высокий достигнутый)
    const thresholds = CONFIG.NEAR_MISS_STREAK_THRESHOLDS;
    let fired = false;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (streak >= thresholds[i] && this.lastNearMissStreakThreshold < thresholds[i]) {
        this.lastNearMissStreakThreshold = thresholds[i];
        this._fireNearMissStreak(thresholds[i], cx, cy);
        fired = true;
        break;
      }
    }

    if (!fired) {
      // Обычный near-miss: комбо + маленький всплывающий текст
      this.increaseCombo(CONFIG.NEAR_MISS_BASE_COMBO);
      particleSystem.spawnFloatingText(cx, cy, `NEAR MISS! +${CONFIG.NEAR_MISS_BASE_COMBO}x`, '#00ff66', 13);
    }
  }

  /**
   * Near-Miss Streak Break: препятствие пройдено без near-miss — streak сбрасывается.
   * Комбо при этом не трогаем (оно живёт по своей механике спада).
   */
  handleNearMissBreak() {
    this.nearMissStreak = 0;
    this.lastNearMissStreakThreshold = 0;
  }

  /**
   * Пороговый джус near-miss streak (x2/x5/x10): очки, комбо, частицы, флеш, тряска, звук.
   * @param {number} level - достигнутый порог (2/5/10)
   * @param {number} cx - мировая X-координата центра игрока
   * @param {number} cy - мировая Y-координата для всплывающего текста
   */
  _fireNearMissStreak(level, cx, cy) {
    const comboBonus = CONFIG.NEAR_MISS_STREAK_COMBO[level];
    const scoreBonus = CONFIG.NEAR_MISS_STREAK_SCORE[level];
    this.increaseCombo(comboBonus);
    this.stats.score += scoreBonus * this.stats.combo;

    const texts = { 2: `STREAK x${level}! +${comboBonus}x`, 5: `STREAK x${level}!! +${comboBonus}x`, 10: `STREAK x${level}!!! +${comboBonus}x` };
    const colors = { 2: '#00ff66', 5: '#ffe600', 10: '#ff007f' };
    const color = colors[level];

    particleSystem.spawnFloatingText(cx, cy, texts[level], color, level === 10 ? 26 : 20);
    particleSystem.spawnShockwave(cx, cy, color, 60 + level * 10, 0.3);
    if (level >= 5) particleSystem.spawnSparks(cx, cy, color, level === 10 ? 25 : 12);
    if (level === 10) particleSystem.spawnConfetti(cx, cy, 25);

    this.camera.shake(2 + level * 0.8, 0.12 + level * 0.03);

    // Экранный флеш (reuse comboFlash, zero-alloc)
    this.comboFlash.color = color;
    this.comboFlash.alpha = level === 10 ? 0.4 : 0.25;
    this.comboFlash.timer = 0.25 + level * 0.02;
    this.comboFlash.duration = this.comboFlash.timer;

    audioService.playNearMissStreak(level);
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

    // 2b. Ambient decor props
    this.levelGen.drawDecor(ctx, camX, camY);

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

    const cf = this.comboFlash;
    if (cf.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = cf.alpha;
      ctx.fillStyle = cf.color;
      ctx.fillRect(0, 0, CONFIG.CANVAS_BASE_WIDTH, CONFIG.CANVAS_BASE_HEIGHT);
      ctx.restore();
    }
  }
}
