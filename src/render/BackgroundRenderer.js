import { CONFIG } from '../config/constants.js';

/**
 * BackgroundRenderer - Multi-layer procedural parallax synthwave city skyline, stars, and horizon grid.
 * Enhanced: glowing moon, nebula clouds, shooting stars, floating dust motes, detailed towers.
 */
export class BackgroundRenderer {
  constructor() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * CONFIG.CANVAS_BASE_WIDTH,
        y: Math.random() * (CONFIG.CANVAS_BASE_HEIGHT * 0.7),
        size: 0.5 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.002 + Math.random() * 0.004,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }

    // Shooting stars
    this.shootingStars = [];
    for (let i = 0; i < 3; i++) {
      this.shootingStars.push({
        x: Math.random() * CONFIG.CANVAS_BASE_WIDTH,
        y: Math.random() * 200,
        vx: 300 + Math.random() * 200,
        vy: 120 + Math.random() * 80,
        life: Math.random(),
        maxLife: 1.5 + Math.random(),
        active: false
      });
    }

    // Floating dust motes (parallax 0.1)
    this.dust = [];
    for (let i = 0; i < 40; i++) {
      this.dust.push({
        x: Math.random() * CONFIG.CANVAS_BASE_WIDTH,
        y: Math.random() * CONFIG.CANVAS_BASE_HEIGHT,
        size: 1 + Math.random() * 2.5,
        speed: 10 + Math.random() * 30,
        drift: Math.random() * Math.PI * 2,
        alpha: 0.1 + Math.random() * 0.3
      });
    }

    this.cityTowers = [];
    for (let i = 0; i < 24; i++) {
      const w = 50 + Math.random() * 80;
      this.cityTowers.push({
        x: i * 80,
        width: w,
        height: 160 + Math.random() * 300,
        windows: Math.random() > 0.25,
        antenna: Math.random() > 0.5,
        antennaH: 20 + Math.random() * 40,
        colorIdx: Math.floor(Math.random() * 3),
        windowDensity: 0.5 + Math.random() * 0.5,
        canvas: null
      });
    }

    // Кеш градиентов и запечённых слоёв (пересоздаются только при смене биома) — zero-GC
    this._gradCache = null;
    this._cachedBiome = null;
  }

  // Кеширует градиенты (небо, туманности, луна) и запекает башни с окнами в offscreen canvas
  _ensureGradients(ctx, biome) {
    if (!biome) return this._gradCache;
    if (this._cachedBiome === biome && this._gradCache) return this._gradCache;

    const w = CONFIG.CANVAS_BASE_WIDTH;
    const h = CONFIG.CANVAS_BASE_HEIGHT;
    const cache = {
      sky: null,
      nebulas: [],
      moonGlow: null,
      moonBody: null
    };

    // 1. Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, biome.bgTop);
    skyGrad.addColorStop(1, biome.bgBottom);
    cache.sky = skyGrad;

    // 2. Nebula radial gradients (локальные координаты от (0, 0))
    if (biome.nebulaColors) {
      for (let i = 0; i < biome.nebulaColors.length; i++) {
        const rad = 180 + i * 40;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
        grad.addColorStop(0, biome.nebulaColors[i]);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        cache.nebulas.push(grad);
      }
    }

    // 3. Moon gradients (локальные координаты от центра луны)
    const moonR = 46;
    const moonGlow = ctx.createRadialGradient(0, 0, moonR * 0.4, 0, 0, moonR * 3);
    moonGlow.addColorStop(0, biome.moonGlow);
    moonGlow.addColorStop(1, 'rgba(0,0,0,0)');
    cache.moonGlow = moonGlow;

    const moonBody = ctx.createRadialGradient(-8, -8, 4, 0, 0, moonR);
    moonBody.addColorStop(0, '#ffffff');
    moonBody.addColorStop(0.6, biome.moonColor);
    moonBody.addColorStop(1, biome.moonColor);
    cache.moonBody = moonBody;

    // 4. Запекание башен с окнами и неоновой обводкой в offscreen canvas
    for (let i = 0; i < this.cityTowers.length; i++) {
      const t = this.cityTowers[i];
      if (!t.canvas) {
        if (typeof document !== 'undefined') {
          t.canvas = document.createElement('canvas');
        } else if (typeof OffscreenCanvas !== 'undefined') {
          t.canvas = new OffscreenCanvas(Math.ceil(t.width), Math.ceil(t.height));
        }
      }

      if (t.canvas) {
        t.canvas.width = Math.ceil(t.width);
        t.canvas.height = Math.ceil(t.height);
        const offCtx = t.canvas.getContext('2d');
        offCtx.clearRect(0, 0, t.canvas.width, t.canvas.height);

        // Тело башни с градиентом
        const bodyGrad = offCtx.createLinearGradient(0, 0, t.width, 0);
        bodyGrad.addColorStop(0, biome.skylineColors[t.colorIdx]);
        bodyGrad.addColorStop(1, biome.skylineColors[(t.colorIdx + 1) % 3]);
        offCtx.fillStyle = bodyGrad;
        offCtx.fillRect(0, 0, t.width, t.height);

        // Окна (паттерн 4x6, акцентный цвет биома, прозрачность 0.2)
        if (t.windows) {
          offCtx.fillStyle = biome.accentColor;
          offCtx.globalAlpha = 0.2;
          for (let wy = 20; wy < t.height - 20; wy += 20) {
            for (let wx = 6; wx < t.width - 10; wx += 12) {
              if (Math.sin(wx * 10 + wy * 3 + i) > 0.2) {
                offCtx.fillRect(wx, wy, 4, 6);
              }
            }
          }
          offCtx.globalAlpha = 1.0;
        }

        // Неоновая окантовка башни
        offCtx.strokeStyle = biome.gridColor;
        offCtx.lineWidth = 1;
        offCtx.strokeRect(0, 0, t.width, t.height);
      }
    }

    this._gradCache = cache;
    this._cachedBiome = biome;
    return cache;
  }

  draw(ctx, cameraX, cameraY = 0, biome) {
    const w = CONFIG.CANVAS_BASE_WIDTH;
    const h = CONFIG.CANVAS_BASE_HEIGHT;
    const now = performance.now();

    // 1. Sky Gradient (cached per biome)
    const grads = this._ensureGradients(ctx, biome);
    ctx.fillStyle = grads.sky;
    ctx.fillRect(0, 0, w, h);

    // 1b. Nebula clouds (soft radial gradients) - subtle (cached gradients + translate)
    if (biome && biome.nebulaColors) {
      for (let i = 0; i < biome.nebulaColors.length; i++) {
        const nx = (i * 420 + Math.sin(now * 0.0001 + i) * 60) % w;
        const ny = 80 + i * 90 + Math.sin(now * 0.0002 + i * 2) * 30;
        const rad = 180 + i * 40;
        ctx.translate(nx, ny);
        ctx.fillStyle = grads.nebulas[i];
        ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
        ctx.translate(-nx, -ny);
      }
    }

    // 1c. Glowing Moon - dimmed (cached gradients, zero shadowBlur)
    ctx.save();
    const moonX = w * 0.78 - cameraX * 0.02;
    const moonY = 120 + cameraY * 0.1;
    const moonR = 46;

    ctx.translate(moonX, moonY);

    // Outer glow
    ctx.fillStyle = grads.moonGlow;
    ctx.fillRect(-moonR * 3, -moonR * 3, moonR * 6, moonR * 6);

    // Moon body
    ctx.fillStyle = grads.moonBody;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, moonR, 0, Math.PI * 2);
    ctx.fill();

    // Moon craters
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.arc(-14, -10, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -18, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 2. Distant Stars (Parallax 0.05) with twinkle - dimmed
    ctx.save();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const screenX = (star.x - cameraX * 0.05) % w;
      const finalX = screenX < 0 ? screenX + w : screenX;
      const twinkle = 0.6 + Math.sin(now * star.twinkleSpeed * 1000 + star.twinkleOffset) * 0.4;
      ctx.globalAlpha = star.alpha * twinkle * 0.5;
      ctx.fillRect(finalX, star.y + cameraY * 0.1, star.size, star.size);
    }
    ctx.restore();

    // 2b. Shooting stars - dimmed
    ctx.save();
    for (let i = 0; i < this.shootingStars.length; i++) {
      const s = this.shootingStars[i];
      s.life += 0.016;
      if (s.life >= s.maxLife) {
        s.active = true;
        s.life = 0;
        s.x = Math.random() * w;
        s.y = Math.random() * 150;
        s.vx = 300 + Math.random() * 250;
        s.vy = 100 + Math.random() * 100;
      }
      if (s.active) {
        s.x += s.vx * 0.016;
        s.y += s.vy * 0.016;
        const trail = 0.5;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * trail, s.y - s.vy * trail);
        grad.addColorStop(0, 'rgba(255,255,255,0.5)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * trail, s.y - s.vy * trail);
        ctx.stroke();
        if (s.x > w + 200 || s.y > 400) s.active = false;
      }
    }
    ctx.restore();

    // 2c. Floating dust motes - dimmed (batched fillStyle)
    ctx.save();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      d.x -= d.speed * 0.016;
      d.y += Math.sin(now * 0.001 + d.drift) * 0.3;
      if (d.x < -10) { d.x = w + 10; d.y = Math.random() * h; }
      const screenX = d.x - cameraX * 0.1;
      const screenY = d.y + cameraY * 0.1;
      ctx.globalAlpha = d.alpha * 0.5 * (0.7 + Math.sin(now * 0.002 + d.drift) * 0.3);
      ctx.beginPath();
      ctx.arc(screenX, screenY, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Cyber Skyline Silhouettes (Parallax 0.15) - detailed towers (baked offscreen canvas)
    ctx.save();
    const towersWidth = 24 * 80;
    for (let i = 0; i < this.cityTowers.length; i++) {
      const t = this.cityTowers[i];
      const screenX = ((t.x - cameraX * 0.15) % towersWidth + towersWidth) % towersWidth - 50;
      const topY = h - t.height - 100 + cameraY * 0.3;

      // Draw baked tower (body + windows + neon edge highlight)
      if (t.canvas) {
        ctx.drawImage(t.canvas, screenX, topY);
      }

      // Antenna
      if (t.antenna) {
        ctx.strokeStyle = biome.skylineColors[(t.colorIdx + 1) % 3];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX + t.width / 2, topY);
        ctx.lineTo(screenX + t.width / 2, topY - t.antennaH);
        ctx.stroke();
        // Blinking antenna light
        const blink = Math.sin(now * 0.004 + i) > 0.5;
        if (blink) {
          ctx.fillStyle = biome.accentColor;
          ctx.shadowColor = biome.accentColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(screenX + t.width / 2, topY - t.antennaH, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
    ctx.restore();

    // 4. Synthwave Horizon Grid (Parallax 0.3) - dimmed (batched single path + stroke)
    ctx.save();
    ctx.strokeStyle = biome.gridColor;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    const gridOffset = (cameraX * 0.3) % 40;
    const gridTopY = h - 140 + cameraY * 0.5;

    ctx.beginPath();
    for (let x = -gridOffset; x < w; x += 40) {
      ctx.moveTo(x, gridTopY);
      ctx.lineTo(x, h);
    }
    for (let y = h - 140; y < h; y += 25) {
      const lineY = y + cameraY * 0.5;
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
    }
    ctx.stroke();
    ctx.restore();
  }
}
