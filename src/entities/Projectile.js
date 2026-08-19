import { Entity } from './Entity.js';

/**
 * Projectile entity - Player Blaster bolts & Boss Plasma shots.
 */
export class Projectile extends Entity {
  constructor() {
    super(0, 0, 12, 12);
    this.vx = 0;
    this.vy = 0;
    this.radius = 6;
    this.color = '#00f0ff';
    this.isPlayer = true;
  }

  init(x, y, vx, vy, color, isPlayer, radius = 6) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.isPlayer = isPlayer;
    this.radius = radius;
    this.width = radius * 2;
    this.height = radius * 2;
    this.active = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx, cameraX, cameraY = 0) {
    const screenX = this.x - cameraX;
    const screenY = this.y + cameraY;
    ctx.save();

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    if (this.isPlayer) {
      // Sleek elongated energy laser bolt
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, this.radius * 2.2, this.radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Energy core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, this.radius * 1.2, this.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Spherical plasma orb with pulsating glow - high contrast
      const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.15;
      const r = this.radius * pulse;

      // Outer glow halo
      ctx.shadowBlur = 20;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(screenX, screenY, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Main orb
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screenX, screenY, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
