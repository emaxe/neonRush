import { Entity } from './Entity.js';
import { storageService } from '../services/StorageService.js';

// Константы модуля — не пересоздаются каждый кадр (zero-GC)
const POWERUP_COLORS = Object.freeze({
  magnet: '#9d00ff',
  shield: '#00f0ff',
  multiplier: '#ff007f',
  slowmo: '#00ff66',
  ghost: '#e2e8f0'
});
const POWERUP_ICONS = Object.freeze({
  magnet: '🧲',
  shield: '🛡️',
  multiplier: '2X',
  slowmo: '⏳',
  ghost: '👻'
});

/**
 * Collectible entity - Coins, Nitro Orbs, PowerUp capsules (Magnet, Shield, Multiplier, SlowMo, Ghost).
 */
export class Collectible extends Entity {
  constructor() {
    super(0, 0, 24, 24);
    this.type = 'coin'; // 'coin', 'nitro', 'powerup'
    this.subType = 'magnet'; // 'magnet', 'shield', 'multiplier', 'slowmo', 'ghost'
    this.radius = 12;
    this.baseY = 0;
    this.floatOffset = Math.random() * Math.PI * 2;
  }

  init(x, y, type, subType = 'coin') {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.type = type;
    this.subType = subType;
    this.radius = type === 'powerup' ? 16 : (type === 'nitro' ? 13 : 11);
    this.width = this.radius * 2;
    this.height = this.radius * 2;
    this.active = true;
    this.floatOffset = Math.random() * Math.PI * 2;
  }

  update(dt, player) {
    // Hover bobbing
    this.y = this.baseY + Math.sin(performance.now() * 0.005 + this.floatOffset) * 6;

    // Magnet attraction
    if (player.magnetTimer > 0 && this.type === 'coin') {
      const magnetLvl = storageService.data?.upgrades?.magnet || 0;
      const magnetRadius = 220 + (magnetLvl * 50);
      const dx = (player.x + player.width / 2) - this.x;
      const dy = (player.y + player.height / 2) - this.y;
      const dist2 = dx * dx + dy * dy;
      const magnetRadius2 = magnetRadius * magnetRadius;

      if (dist2 < magnetRadius2 && dist2 > 1) {
        const dist = Math.sqrt(dist2);
        const speed = 750;
        this.x += (dx / dist) * speed * dt;
        this.y += (dy / dist) * speed * dt;
        this.baseY = this.y;
      }
    }
  }

  draw(ctx, cameraX, cameraY = 0) {
    const screenX = this.x - cameraX;
    const screenY = this.y + cameraY;
    ctx.save();

    if (this.type === 'coin') {
      // Gold coin with gradient + glow
      const pulse = Math.abs(Math.sin(performance.now() * 0.006 + this.floatOffset));
      const rx = this.radius * (0.5 + 0.5 * pulse);

      const grad = ctx.createRadialGradient(screenX - 3, screenY - 3, 1, screenX, screenY, this.radius);
      grad.addColorStop(0, '#fff8c0');
      grad.addColorStop(0.5, '#ffe600');
      grad.addColorStop(1, '#b8860b');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#fff';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.ellipse(screenX, screenY, rx, this.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner rim
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, rx * 0.6, this.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#7a5200';
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¢', screenX, screenY);

    } else if (this.type === 'nitro') {
      // Nitro orb with pulsing energy
      const pulse = Math.sin(performance.now() * 0.008 + this.floatOffset) * 0.5 + 0.5;
      const grad = ctx.createRadialGradient(screenX - 3, screenY - 3, 1, screenX, screenY, this.radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#00f0ff');
      grad.addColorStop(1, '#0066aa');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer energy ring
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 + pulse * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius + 4 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#002244';
      ctx.font = 'bold 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', screenX, screenY);

    } else if (this.type === 'powerup') {
      const col = POWERUP_COLORS[this.subType] || '#00f0ff';
      const pulse = Math.sin(performance.now() * 0.005 + this.floatOffset) * 0.5 + 0.5;

      // Outer glow ring
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.3 + pulse * 0.3;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius * 1.6 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Hexagon capsule with gradient
      const grad = ctx.createRadialGradient(screenX - 3, screenY - 3, 1, screenX, screenY, this.radius * 1.2);
      grad.addColorStop(0, 'rgba(30, 40, 70, 0.95)');
      grad.addColorStop(1, 'rgba(10, 15, 30, 0.9)');
      ctx.fillStyle = grad;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = screenX + this.radius * 1.2 * Math.cos(angle);
        const py = screenY + this.radius * 1.2 * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner hexagon
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = screenX + this.radius * 0.7 * Math.cos(angle);
        const py = screenY + this.radius * 0.7 * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = col;
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POWERUP_ICONS[this.subType] || '★', screenX, screenY);
    }

    ctx.restore();
  }
}
