import { CONFIG } from '../config/constants.js';
import { PALETTES } from '../config/palettes.js';
import { ObjectPool } from './ObjectPool.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Collectible } from '../entities/Collectible.js';
import { Projectile } from '../entities/Projectile.js';
import { eventBus } from '../core/EventBus.js';

/**
 * LevelGenerator - Procedural continuous track generator with dynamic chunk variations and biome progression.
 */
export class LevelGenerator {
  constructor() {
    this.platforms = [];
    /** @type {Obstacle[]} */
    this.obstacles = [];
    /** @type {Collectible[]} */
    this.collectibles = [];
    /** @type {Projectile[]} */
    this.projectiles = [];
    this.lastGeneratedX = 0;
    this.currentBiome = PALETTES.city;
    this.biomeDistanceCounter = 0;

    // Pools
    this.obstaclePool = new ObjectPool(
      () => new Obstacle(),
      (o, x, y, w, h, t) => o.init(x, y, w, h, t),
      60
    );

    this.collectiblePool = new ObjectPool(
      () => new Collectible(),
      (c, x, y, t, st) => c.init(x, y, t, st),
      100
    );

    this.projectilePool = new ObjectPool(
      () => new Projectile(),
      (p) => { p.active = false; },
      40
    );
  }

  reset() {
    this.obstacles.forEach(o => this.obstaclePool.release(o));
    this.obstacles = [];
    this.collectibles.forEach(c => this.collectiblePool.release(c));
    this.collectibles = [];
    this.projectiles.forEach(p => this.projectilePool.release(p));
    this.projectiles = [];
    this.platforms = [];
    this.lastGeneratedX = 0;
    this.currentBiome = PALETTES.city;
    this.biomeDistanceCounter = 0;

    // Starting platforms
    this.platforms.push({ x: 0, y: 580, width: 2000, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
    this.platforms.push({ x: 0, y: 80, width: 2000, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });
    this.lastGeneratedX = 2000;
  }

  updateGeneration(playerX, isBossFight) {
    while (this.lastGeneratedX < playerX + 2400) {
      this.generateChunk(this.lastGeneratedX, isBossFight);
    }

    // Biome progression check
    const biomeKeys = Object.keys(PALETTES);
    const biomeIdx = Math.floor(playerX / (CONFIG.BIOME_DISTANCE * 2)) % biomeKeys.length;
    const nextBiome = PALETTES[biomeKeys[biomeIdx]];
    if (nextBiome.id !== this.currentBiome.id) {
      this.currentBiome = nextBiome;
      eventBus.emit('biome_changed', this.currentBiome);
    }
  }

  generateChunk(startX, isBossFight) {
    const chunkLen = CONFIG.CHUNK_LENGTH;
    const floorY = 580;
    const ceilY = 80;

    if (isBossFight) {
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      for (let i = 0; i < 6; i++) {
        const col = this.collectiblePool.get();
        col.init(startX + 200 + i * 80, floorY - 50, 'coin');
        this.collectibles.push(col);
      }
      this.lastGeneratedX += chunkLen;
      return;
    }

    const segmentType = Math.floor(Math.random() * 5);

    if (segmentType === 0) {
      // 0. Flat sprint with jumpable spikes and guiding coin arc
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // Ground spike
      const obs1 = this.obstaclePool.get();
      obs1.init(startX + 400, floorY - 36, 40, 36, 'spike');
      this.obstacles.push(obs1);

      // Coin arc arching over the spike
      this.spawnCoinArc(startX + 280, floorY - 50, 6);

      // Ceiling spike
      const obs2 = this.obstaclePool.get();
      obs2.init(startX + 700, ceilY + CONFIG.PLATFORM_THICKNESS, 40, 36, 'spike');
      this.obstacles.push(obs2);

      // Airborne drone
      const drone = this.obstaclePool.get();
      drone.init(startX + 950, 320, 42, 42, 'drone');
      this.obstacles.push(drone);

    } else if (segmentType === 1) {
      // 1. High Laser Slide Gauntlet with early coin trail invitation
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // First overhead laser gate
      const laser1 = this.obstaclePool.get();
      laser1.init(startX + 400, floorY - 70, 70, 34, 'high_laser');
      this.obstacles.push(laser1);

      // Low slide coin trail starting 140px before laser1
      for (let i = 0; i < 7; i++) {
        const coin = this.collectiblePool.get();
        coin.init(startX + 260 + i * 40, floorY - 18, 'coin');
        this.collectibles.push(coin);
      }

      // Second overhead laser gate
      const laser2 = this.obstaclePool.get();
      laser2.init(startX + 850, floorY - 70, 70, 34, 'high_laser');
      this.obstacles.push(laser2);

      // Low slide coin trail starting 140px before laser2
      for (let i = 0; i < 7; i++) {
        const coin = this.collectiblePool.get();
        coin.init(startX + 710 + i * 40, floorY - 18, 'coin');
        this.collectibles.push(coin);
      }

    } else if (segmentType === 2) {
      // 2. Multi-tier Branching Route
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX + 400, y: 380, width: 450, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false }); // Upper deck
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // Lower route: safe ground coins
      for (let i = 0; i < 5; i++) {
        const coin = this.collectiblePool.get();
        coin.init(startX + 450 + i * 70, floorY - 25, 'coin');
        this.collectibles.push(coin);
      }

      // Upper route: crate hurdle & Nitro reward
      const bar = this.obstaclePool.get();
      bar.init(startX + 600, 380 - 45, 45, 45, 'barrier');
      this.obstacles.push(bar);

      const nitro = this.collectiblePool.get();
      nitro.init(startX + 760, 380 - 50, 'nitro');
      this.collectibles.push(nitro);

    } else if (segmentType === 3) {
      // 3. Gravity Flip Challenge
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // Floor spikes cluster
      for (let i = 0; i < 3; i++) {
        const spk = this.obstaclePool.get();
        spk.init(startX + 420 + i * 65, floorY - 36, 40, 36, 'spike');
        this.obstacles.push(spk);
      }

      // Ceiling power-up reward
      const types = ['magnet', 'shield', 'multiplier', 'slowmo', 'ghost'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const pow = this.collectiblePool.get();
      pow.init(startX + 520, ceilY + CONFIG.PLATFORM_THICKNESS + 40, 'powerup', randomType);
      this.collectibles.push(pow);

      // Ceiling coin trail
      for (let i = 0; i < 4; i++) {
        const coin = this.collectiblePool.get();
        coin.init(startX + 420 + i * 60, ceilY + CONFIG.PLATFORM_THICKNESS + 20, 'coin');
        this.collectibles.push(coin);
      }

    } else {
      // 4. Chasm Gap Leap
      this.platforms.push({ x: startX, y: floorY, width: 450, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX + 680, y: floorY, width: 520, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // Coin arc across chasm
      this.spawnCoinArc(startX + 400, floorY - 110, 6);

      // Patrol robot on far platform with generous reaction room
      const pat = this.obstaclePool.get();
      pat.init(startX + 1000, floorY - 48, 48, 48, 'patroller');
      this.obstacles.push(pat);
    }

    this.lastGeneratedX += chunkLen;
  }

  spawnCoinArc(startX, startY, count = 5) {
    for (let i = 0; i < count; i++) {
      const coin = this.collectiblePool.get();
      const arcY = startY - Math.sin((i / (count - 1)) * Math.PI) * 70;
      coin.init(startX + i * 50, arcY, 'coin');
      this.collectibles.push(coin);
    }
  }

  cleanup(cameraX) {
    this.platforms = this.platforms.filter(p => p.x + p.width > cameraX - 200);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o.x + o.width < cameraX - 200) {
        this.obstaclePool.release(o);
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      if (c.x + c.radius < cameraX - 200) {
        this.collectiblePool.release(c);
        this.collectibles.splice(i, 1);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.x < cameraX - 200 || p.x > cameraX + 1600 || p.y < -100 || p.y > 800) {
        this.projectilePool.release(p);
        this.projectiles.splice(i, 1);
      }
    }
  }

  drawPlatforms(ctx, cameraX, cameraY = 0) {
    ctx.save();
    const p = this.currentBiome;

    for (let i = 0; i < this.platforms.length; i++) {
      const plat = this.platforms[i];
      const screenX = plat.x - cameraX;
      const screenY = plat.y + cameraY;
      if (screenX + plat.width < 0 || screenX > 1280) continue;

      // Platform Body
      ctx.fillStyle = p.platformFill;
      ctx.fillRect(screenX, screenY, plat.width, plat.height);

      // Neon Border
      ctx.strokeStyle = p.platformStroke;
      ctx.shadowColor = p.platformStroke;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      if (plat.isCeiling) {
        ctx.moveTo(screenX, screenY + plat.height);
        ctx.lineTo(screenX + plat.width, screenY + plat.height);
      } else {
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + plat.width, screenY);
      }
      ctx.stroke();

      // Circuit hash markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let j = 0; j < plat.width; j += 60) {
        ctx.beginPath();
        ctx.moveTo(screenX + j, screenY + 4);
        ctx.lineTo(screenX + j + 20, screenY + plat.height - 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
