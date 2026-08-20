import { ObjectPool } from './ObjectPool.js';

/**
 * ParticleSystem - High-performance pooled visual particle effects, tumbling cyber-debris, shockwave rings, and combat text.
 */
export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.cyberDebris = [];
    this.glitchTimer = 0;
    this.maxParticles = 300;
    this._fontCache = new Map();

    this.pool = new ObjectPool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, color: '#fff', size: 3, life: 0, maxLife: 1, alpha: 1, shape: 'circle' }),
      (p, x, y, vx, vy, color, size, maxLife, shape = 'circle') => {
        p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.color = color;
        p.size = size; p.life = 0; p.maxLife = maxLife; p.alpha = 1; p.shape = shape;
      },
      150
    );

    this.textPool = new ObjectPool(
      () => ({ x: 0, y: 0, text: '', color: '#fff', life: 0, maxLife: 1, size: 16 }),
      (t, x, y, text, color, size = 16, maxLife = 0.8) => {
        t.x = x; t.y = y; t.text = text; t.color = color;
        t.life = 0; t.maxLife = maxLife; t.size = size;
      },
      25
    );

    // Пулы для shockwaves и cyber debris — избегаем аллокаций при взрывах
    this.shockwavePool = new ObjectPool(
      () => ({ x: 0, y: 0, radius: 5, maxRadius: 160, color: '#00f0ff', life: 0, maxLife: 0.6 }),
      (s, x, y, color, maxRadius, duration) => {
        s.x = x; s.y = y; s.radius = 5; s.maxRadius = maxRadius;
        s.color = color; s.life = 0; s.maxLife = duration;
      },
      8
    );
    this.debrisPool = new ObjectPool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, vrot: 0, color: '#fff', w: 6, h: 4, life: 0, maxLife: 1 }),
      (d, x, y, vx, vy, rot, vrot, color, w, h, maxLife) => {
        d.x = x; d.y = y; d.vx = vx; d.vy = vy; d.rot = rot; d.vrot = vrot;
        d.color = color; d.w = w; d.h = h; d.life = 0; d.maxLife = maxLife;
      },
      30
    );
  }

  emit(x, y, vx, vy, color, size, life, shape) {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push(this.pool.get(x, y, vx, vy, color, size, life, shape));
  }

  spawnExplosion(x, y, color = '#ff007f', count = 25) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 320;
      this.emit(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        2 + Math.random() * 5,
        0.3 + Math.random() * 0.4,
        Math.random() > 0.5 ? 'circle' : 'rect'
      );
    }
  }

  spawnSparks(x, y, color = '#00f0ff', count = 10) {
    for (let i = 0; i < count; i++) {
      this.emit(
        x, y,
        (Math.random() - 0.5) * 200 - 80,
        (Math.random() - 0.5) * 160,
        color,
        1.5 + Math.random() * 2.5,
        0.2 + Math.random() * 0.25,
        'line'
      );
    }
  }

  spawnFloatingText(x, y, text, color = '#ffe600', size = 16) {
    this.floatingTexts.push(this.textPool.get(x, y, text, color, size));
  }

  /**
   * Confetti burst (celebration effect)
   */
  spawnConfetti(x, y, count = 30) {
    const colors = ['#00f0ff', '#ff007f', '#ffe600', '#00ff66', '#9d00ff', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 120 + Math.random() * 220;
      this.emit(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        colors[Math.floor(Math.random() * colors.length)],
        3 + Math.random() * 4,
        0.6 + Math.random() * 0.5,
        Math.random() > 0.5 ? 'rect' : 'circle'
      );
    }
  }

  /**
   * Speed lines for high-velocity moments
   */
  spawnSpeedLines(count = 12) {
    for (let i = 0; i < count; i++) {
      this.emit(
        Math.random() * 1400,
        Math.random() * 720,
        -900 - Math.random() * 500,
        0,
        Math.random() > 0.5 ? '#00f0ff' : '#ff007f',
        1.5 + Math.random() * 2,
        0.15 + Math.random() * 0.2,
        'line'
      );
    }
  }

  spawnShockwave(x, y, color = '#00f0ff', maxRadius = 160, duration = 0.6) {
    this.shockwaves.push(this.shockwavePool.get(x, y, color, maxRadius, duration));
  }

  /**
   * Cinematic cybernetic death fragmentation & shockwaves
   * @param {number} x 
   * @param {number} y 
   * @param {Object} skin 
   */
  spawnDeathDisintegration(x, y, skin) {
    this.glitchTimer = 1.0;

    // 1. Dual Shockwaves
    this.spawnShockwave(x, y, '#ff007f', 220, 0.7);
    this.spawnShockwave(x, y, '#00f0ff', 160, 0.5);

    // 2. Tumbling Cyber Armor Shards (Head, Visor, Torso, Limbs)
    const shardColors = [skin.head, skin.body, skin.visor, skin.trail, '#ffffff', '#ff0055'];
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.4;
      const speed = 120 + Math.random() * 380;
      this.cyberDebris.push(this.debrisPool.get(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 150, // pop upwards
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 16,
        shardColors[i % shardColors.length],
        6 + Math.random() * 12,
        4 + Math.random() * 10,
        1.1 + Math.random() * 0.4
      ));
    }

    // 3. Dense Explosion & Voxel Sparks
    this.spawnExplosion(x, y, skin.head, 35);
    this.spawnExplosion(x, y, '#ff007f', 25);
    this.spawnExplosion(x, y, '#ffe600', 20);

    // 4. Floating Holographic Flatline Banner
    this.spawnFloatingText(x, y - 40, '⚡ CRITICAL FLATLINE ⚡', '#ff0055', 22);
  }

  update(dt) {
    // Update Glitch
    if (this.glitchTimer > 0) {
      this.glitchTimer -= dt;
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.pool.release(p);
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - (p.life / p.maxLife);
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        this.shockwavePool.release(sw);
        this.shockwaves[i] = this.shockwaves[this.shockwaves.length - 1];
        this.shockwaves.pop();
        continue;
      }
      const progress = sw.life / sw.maxLife;
      sw.radius = 5 + (sw.maxRadius - 5) * Math.pow(progress, 0.7);
    }

    // Update Cyber Debris with gravity physics
    for (let i = this.cyberDebris.length - 1; i >= 0; i--) {
      const d = this.cyberDebris[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        this.debrisPool.release(d);
        this.cyberDebris[i] = this.cyberDebris[this.cyberDebris.length - 1];
        this.cyberDebris.pop();
        continue;
      }
      d.vy += 800 * dt; // Gravity
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vrot * dt;
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life += dt;
      if (t.life >= t.maxLife) {
        this.textPool.release(t);
        this.floatingTexts[i] = this.floatingTexts[this.floatingTexts.length - 1];
        this.floatingTexts.pop();
        continue;
      }
      t.y -= 45 * dt;
    }
  }

  draw(ctx, cameraX, cameraY = 0) {
    ctx.save();

    // 1. Draw Shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const screenX = sw.x - cameraX;
      const screenY = sw.y + cameraY;
      const progress = sw.life / sw.maxLife;
      const alpha = 1 - progress;

      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(1, (1 - progress) * 6);
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.arc(screenX, screenY, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Tumbling Cyber Debris
    for (let i = 0; i < this.cyberDebris.length; i++) {
      const d = this.cyberDebris[i];
      const screenX = d.x - cameraX;
      const screenY = d.y + cameraY;
      const progress = d.life / d.maxLife;
      const alpha = 1 - progress;

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(d.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
      ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);
      ctx.restore();
    }

    // 3. Draw Particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const screenX = p.x - cameraX;
      const screenY = p.y + cameraY;
      if (screenX < -50 || screenX > 1330) continue;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'rect') {
        ctx.fillRect(screenX - p.size / 2, screenY - p.size / 2, p.size, p.size);
      } else if (p.shape === 'line') {
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX - p.vx * 0.04, screenY - p.vy * 0.04);
        ctx.lineWidth = p.size;
        ctx.stroke();
      }
    }

    // 4. Draw Floating Texts
    ctx.font = 'bold 16px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const t = this.floatingTexts[i];
      const screenX = t.x - cameraX;
      const screenY = t.y + cameraY;
      const progress = t.life / t.maxLife;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = t.color;
      let cached = this._fontCache.get(t.size);
      if (!cached) {
        cached = `bold ${t.size}px Orbitron, sans-serif`;
        this._fontCache.set(t.size, cached);
      }
      ctx.font = cached;
      ctx.fillText(t.text, screenX, screenY);
    }

    // 5. Draw Digital CRT Glitch Lines during death impact
    if (this.glitchTimer > 0) {
      const intensity = this.glitchTimer;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 85, 0.15)';
      ctx.fillRect(0, 0, 1280, 720);

      // Random horizontal glitch slice displacement
      for (let g = 0; g < 4; g++) {
        const sliceY = Math.random() * 720;
        const sliceHeight = 10 + Math.random() * 30;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 0, 127, 0.25)';
        ctx.fillRect(0, sliceY, 1280, sliceHeight);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  clear() {
    for (let i = 0; i < this.particles.length; i++) this.pool.release(this.particles[i]);
    this.particles.length = 0;
    for (let i = 0; i < this.floatingTexts.length; i++) this.textPool.release(this.floatingTexts[i]);
    this.floatingTexts.length = 0;
    for (let i = 0; i < this.shockwaves.length; i++) this.shockwavePool.release(this.shockwaves[i]);
    this.shockwaves.length = 0;
    for (let i = 0; i < this.cyberDebris.length; i++) this.debrisPool.release(this.cyberDebris[i]);
    this.cyberDebris.length = 0;
    this.glitchTimer = 0;
  }
}

export const particleSystem = new ParticleSystem();
