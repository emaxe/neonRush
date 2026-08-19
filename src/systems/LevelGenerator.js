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
    /** @type {Object[]} decorative props (pylons, signs, cables) */
    this.decor = [];
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

    this._biomeKeys = Object.keys(PALETTES);
  }

  reset() {
    this.obstacles.forEach(o => this.obstaclePool.release(o));
    this.obstacles = [];
    this.collectibles.forEach(c => this.collectiblePool.release(c));
    this.collectibles = [];
    this.projectiles.forEach(p => this.projectilePool.release(p));
    this.projectiles = [];
    this.platforms = [];
    this.decor = [];
    this.lastGeneratedX = 0;
    this.currentBiome = PALETTES.city;
    this.biomeDistanceCounter = 0;

    // Starting platforms
    this.platforms.push({ x: 0, y: 580, width: 2000, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
    this.platforms.push({ x: 0, y: 80, width: 2000, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });
    this.lastGeneratedX = 2000;

    // Заполняем стартовый отрезок монетами (по полу и потолку), чтобы игрок
    // сразу собирал комбо, а не бежал по пустому коридору
    for (let x = 200; x < 1900; x += 60) {
      const coin = this.collectiblePool.get();
      coin.init(x, 560, 'coin');
      this.collectibles.push(coin);
    }
    for (let x = 200; x < 1900; x += 60) {
      const coin = this.collectiblePool.get();
      coin.init(x, 100, 'coin');
      this.collectibles.push(coin);
    }
  }

  updateGeneration(playerX, isBossFight, level = 1) {
    while (this.lastGeneratedX < playerX + 2400) {
      this.generateChunk(this.lastGeneratedX, isBossFight, level);
    }

    // Biome progression check
    const biomeKeys = this._biomeKeys;
    const biomeIdx = Math.floor(playerX / (CONFIG.BIOME_DISTANCE * 2)) % biomeKeys.length;
    const nextBiome = PALETTES[biomeKeys[biomeIdx]];
    if (nextBiome.id !== this.currentBiome.id) {
      this.currentBiome = nextBiome;
      eventBus.emit('biome_changed', this.currentBiome);
    }
  }

  generateChunk(startX, isBossFight, level = 1) {
    const chunkLen = CONFIG.CHUNK_LENGTH;
    const floorY = 580;
    const ceilY = 80;

    // Плотность препятствий растёт с уровнем (но не выше потолка)
    const densityBonus = Math.min(
      CONFIG.LEVEL_MAX_OBSTACLE_DENSITY,
      (level - 1) * CONFIG.LEVEL_OBSTACLE_DENSITY
    );
    // Вероятность добавить "лишние" препятствия в сегмент
    const extraChance = densityBonus;

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

    const segmentType = Math.floor(Math.random() * 8);

    // Ambient decor props for every chunk
    this.spawnDecor(startX, chunkLen);

    if (segmentType === 0) {
      // 0. Flat sprint with jumpable spikes and guiding coin arc
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // Ground spike
      const obs1 = this.obstaclePool.get();
      obs1.init(startX + 400, floorY - 36, 40, 36, 'spike');
      this.obstacles.push(obs1);

      // Coin arc arching over the spike (≥140px before obstacle)
      this.spawnCoinArc(startX + 260, floorY - 50, 6);

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

    } else if (segmentType === 4) {
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

    } else if (segmentType === 5) {
      // 5. Laser + Drone Gauntlet (dense action)
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // Overhead laser gate
      const laser = this.obstaclePool.get();
      laser.init(startX + 350, floorY - 70, 70, 34, 'high_laser');
      this.obstacles.push(laser);

      // Two drones weaving
      const drone1 = this.obstaclePool.get();
      drone1.init(startX + 600, 300, 42, 42, 'drone');
      this.obstacles.push(drone1);
      const drone2 = this.obstaclePool.get();
      drone2.init(startX + 800, 420, 42, 42, 'drone');
      this.obstacles.push(drone2);

      // Ground spike cluster
      for (let i = 0; i < 2; i++) {
        const spk = this.obstaclePool.get();
        spk.init(startX + 950 + i * 60, floorY - 36, 40, 36, 'spike');
        this.obstacles.push(spk);
      }

      // Reward coins (arc guides player before the laser)
      this.spawnCoinArc(startX + 210, floorY - 90, 5);

    } else if (segmentType === 6) {
      // 6. Elevated Platform Parkour
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // Two elevated platforms
      this.platforms.push({ x: startX + 300, y: 420, width: 260, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX + 700, y: 340, width: 260, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });

      // Barrier on first platform
      const bar1 = this.obstaclePool.get();
      bar1.init(startX + 400, 420 - 45, 45, 45, 'barrier');
      this.obstacles.push(bar1);

      // Coin trail on upper route
      for (let i = 0; i < 5; i++) {
        const coin = this.collectiblePool.get();
        coin.init(startX + 750 + i * 50, 340 - 30, 'coin');
        this.collectibles.push(coin);
      }

      // Powerup reward on high platform
      const types = ['magnet', 'shield', 'multiplier', 'slowmo', 'ghost'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const pow = this.collectiblePool.get();
      pow.init(startX + 850, 340 - 50, 'powerup', randomType);
      this.collectibles.push(pow);

    } else {
      // 7. Ceiling Gravity Gauntlet
      this.platforms.push({ x: startX, y: floorY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: false });
      this.platforms.push({ x: startX, y: ceilY, width: chunkLen, height: CONFIG.PLATFORM_THICKNESS, isCeiling: true });

      // Ceiling spikes
      for (let i = 0; i < 3; i++) {
        const spk = this.obstaclePool.get();
        spk.init(startX + 400 + i * 70, ceilY + CONFIG.PLATFORM_THICKNESS, 40, 36, 'spike');
        this.obstacles.push(spk);
      }

      // Ceiling coin trail (past spike cluster ending at startX+580)
      for (let i = 0; i < 5; i++) {
        const coin = this.collectiblePool.get();
        coin.init(startX + 620 + i * 55, ceilY + CONFIG.PLATFORM_THICKNESS + 20, 'coin');
        this.collectibles.push(coin);
      }

      // Floor barrier to force ceiling route
      const bar = this.obstaclePool.get();
      bar.init(startX + 600, floorY - 45, 45, 45, 'barrier');
      this.obstacles.push(bar);

      // Patroller on floor
      const pat = this.obstaclePool.get();
      pat.init(startX + 900, floorY - 48, 48, 48, 'patroller');
      this.obstacles.push(pat);
    }

    // Дополнительные препятствия на высоких уровнях (усложнение)
    if (extraChance > 0 && Math.random() < extraChance) {
      // Случайное "лишнее" препятствие в свободной зоне сегмента
      const extraX = startX + 200 + Math.random() * (chunkLen - 500);
      const roll = Math.random();
      if (roll < 0.4) {
        const spk = this.obstaclePool.get();
        spk.init(extraX, floorY - 36, 40, 36, 'spike');
        this.obstacles.push(spk);
      } else if (roll < 0.7) {
        const drone = this.obstaclePool.get();
        drone.init(extraX, 300 + Math.random() * 150, 42, 42, 'drone');
        this.obstacles.push(drone);
      } else {
        const bar = this.obstaclePool.get();
        bar.init(extraX, floorY - 45, 45, 45, 'barrier');
        this.obstacles.push(bar);
      }
    }

    this.lastGeneratedX += chunkLen;
  }

  /**
   * Spawn ambient decorative props (pylons, neon signs, cables) for a chunk.
   */
  spawnDecor(startX, chunkLen) {
    const floorY = 580;
    const ceilY = 80;
    const biome = this.currentBiome;

    // Neon pylons along the floor
    const pylonCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pylonCount; i++) {
      const px = startX + 150 + Math.random() * (chunkLen - 300);
      this.decor.push({
        type: 'pylon',
        x: px,
        y: floorY,
        height: 60 + Math.random() * 40,
        color: biome.platformStroke,
        seed: Math.random() * 10
      });
    }

    // Hanging neon signs from ceiling
    if (Math.random() > 0.4) {
      const sx = startX + 200 + Math.random() * (chunkLen - 400);
      this.decor.push({
        type: 'sign',
        x: sx,
        y: ceilY + CONFIG.PLATFORM_THICKNESS,
        width: 40 + Math.random() * 30,
        height: 20 + Math.random() * 15,
        color: biome.accentColor,
        seed: Math.random() * 10
      });
    }

    // Floating holographic data shards
    if (Math.random() > 0.5) {
      const hx = startX + 100 + Math.random() * (chunkLen - 200);
      this.decor.push({
        type: 'shard',
        x: hx,
        y: 200 + Math.random() * 250,
        size: 6 + Math.random() * 8,
        color: biome.gridColor,
        seed: Math.random() * 10
      });
    }
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
    // Обратные циклы вместо Array.filter — избегаем аллокаций новых массивов (zero-GC)
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      if (this.platforms[i].x + this.platforms[i].width <= cameraX - 200) {
        this.platforms[i] = this.platforms[this.platforms.length - 1];
        this.platforms.pop();
      }
    }
    for (let i = this.decor.length - 1; i >= 0; i--) {
      if (this.decor[i].x <= cameraX - 200) {
        this.decor[i] = this.decor[this.decor.length - 1];
        this.decor.pop();
      }
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o.x + o.width < cameraX - 200) {
        this.obstaclePool.release(o);
        this.obstacles[i] = this.obstacles[this.obstacles.length - 1];
        this.obstacles.pop();
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      if (c.x + c.radius < cameraX - 200) {
        this.collectiblePool.release(c);
        this.collectibles[i] = this.collectibles[this.collectibles.length - 1];
        this.collectibles.pop();
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.x < cameraX - 200 || p.x > cameraX + 1600 || p.y < -100 || p.y > 800) {
        this.projectilePool.release(p);
        this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
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

      // Neon Border - dimmed
      ctx.strokeStyle = p.platformStroke;
      ctx.shadowColor = p.platformStroke;
      ctx.shadowBlur = 5;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (plat.isCeiling) {
        ctx.moveTo(screenX, screenY + plat.height);
        ctx.lineTo(screenX + plat.width, screenY + plat.height);
      } else {
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + plat.width, screenY);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Circuit hash markings - dimmed
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let j = 0; j < plat.width; j += 60) {
        ctx.moveTo(screenX + j, screenY + 4);
        ctx.lineTo(screenX + j + 20, screenY + plat.height - 4);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDecor(ctx, cameraX, cameraY = 0) {
    ctx.save();
    const now = performance.now();
    for (let i = 0; i < this.decor.length; i++) {
      const d = this.decor[i];
      const screenX = d.x - cameraX;
      const screenY = d.y + cameraY;
      if (screenX < -100 || screenX > 1380) continue;

      if (d.type === 'pylon') {
        // Neon pylon with glowing tip - dimmed
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 4;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX, screenY - d.height);
        ctx.stroke();
        // Glowing tip
        const blink = 0.4 + Math.sin(now * 0.004 + d.seed) * 0.3;
        ctx.fillStyle = d.color;
        ctx.globalAlpha = blink * 0.5;
        ctx.beginPath();
        ctx.arc(screenX, screenY - d.height, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      } else if (d.type === 'sign') {
        // Hanging neon sign - dimmed
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX + d.width / 2, screenY);
        ctx.lineTo(screenX + d.width / 2, screenY - 14);
        ctx.stroke();
        ctx.fillStyle = 'rgba(10, 15, 30, 0.6)';
        ctx.strokeStyle = d.color;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 5;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.fillRect(screenX, screenY, d.width, d.height);
        ctx.strokeRect(screenX, screenY, d.width, d.height);
        // Inner glow line
        ctx.strokeStyle = d.color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(screenX + 4, screenY + d.height / 2);
        ctx.lineTo(screenX + d.width - 4, screenY + d.height / 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      } else if (d.type === 'shard') {
        // Floating holographic data shard - dimmed
        const bob = Math.sin(now * 0.002 + d.seed) * 8;
        const rot = Math.sin(now * 0.001 + d.seed) * 0.4;
        ctx.save();
        ctx.translate(screenX, screenY + bob);
        ctx.rotate(rot);
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 4;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, -d.size);
        ctx.lineTo(d.size, 0);
        ctx.lineTo(0, d.size);
        ctx.lineTo(-d.size, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }
}
