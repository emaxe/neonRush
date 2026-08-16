import { CONFIG } from '../config/constants.js';

/**
 * BackgroundRenderer - Multi-layer procedural parallax synthwave city skyline, stars, and horizon grid.
 */
export class BackgroundRenderer {
  constructor() {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * CONFIG.CANVAS_BASE_WIDTH,
        y: Math.random() * (CONFIG.CANVAS_BASE_HEIGHT * 0.7),
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.7
      });
    }

    this.cityTowers = [];
    for (let i = 0; i < 20; i++) {
      this.cityTowers.push({
        x: i * 90,
        width: 60 + Math.random() * 70,
        height: 180 + Math.random() * 260,
        windows: Math.random() > 0.3
      });
    }
  }

  draw(ctx, cameraX, cameraY = 0, biome) {
    const w = CONFIG.CANVAS_BASE_WIDTH;
    const h = CONFIG.CANVAS_BASE_HEIGHT;

    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, biome.bgTop);
    skyGrad.addColorStop(1, biome.bgBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Distant Stars (Parallax 0.05)
    ctx.save();
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const screenX = (star.x - cameraX * 0.05) % w;
      const finalX = screenX < 0 ? screenX + w : screenX;
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = star.alpha * (0.6 + Math.sin(performance.now() * 0.003 + i) * 0.4);
      ctx.fillRect(finalX, star.y + cameraY * 0.1, star.size, star.size);
    }
    ctx.restore();

    // 3. Cyber Skyline Silhouettes (Parallax 0.15)
    ctx.save();
    const towersWidth = 20 * 90;
    for (let i = 0; i < this.cityTowers.length; i++) {
      const t = this.cityTowers[i];
      const screenX = ((t.x - cameraX * 0.15) % towersWidth + towersWidth) % towersWidth - 50;

      ctx.fillStyle = biome.skylineColors[0];
      ctx.fillRect(screenX, h - t.height - 100 + cameraY * 0.3, t.width, t.height);

      ctx.strokeStyle = biome.gridColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, h - t.height - 100 + cameraY * 0.3, t.width, t.height);

      // Glowing Windows
      if (t.windows) {
        ctx.fillStyle = biome.accentColor;
        ctx.globalAlpha = 0.35;
        for (let wy = h - t.height - 80; wy < h - 120; wy += 22) {
          for (let wx = screenX + 8; wx < screenX + t.width - 12; wx += 14) {
            if (Math.sin(wx * 10 + wy) > 0) {
              ctx.fillRect(wx, wy + cameraY * 0.3, 4, 6);
            }
          }
        }
      }
    }
    ctx.restore();

    // 4. Synthwave Horizon Grid (Parallax 0.3)
    ctx.save();
    ctx.strokeStyle = biome.gridColor;
    ctx.lineWidth = 1.5;
    const gridOffset = (cameraX * 0.3) % 40;
    for (let x = -gridOffset; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, h - 140 + cameraY * 0.5);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = h - 140; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y + cameraY * 0.5);
      ctx.lineTo(w, y + cameraY * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
