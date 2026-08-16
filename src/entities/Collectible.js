import { Entity } from './Entity.js';
import { storageService } from '../services/StorageService.js';

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
      const dist = Math.hypot(dx, dy);

      if (dist < magnetRadius && dist > 1) {
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
      ctx.fillStyle = '#ffe600';
      ctx.strokeStyle = '#fff';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;

      const pulse = Math.abs(Math.sin(performance.now() * 0.006 + this.floatOffset));
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, this.radius * (0.5 + 0.5 * pulse), this.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('¢', screenX, screenY);

    } else if (this.type === 'nitro') {
      ctx.fillStyle = '#00f0ff';
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#002244';
      ctx.font = 'bold 12px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', screenX, screenY);

    } else if (this.type === 'powerup') {
      const colors = {
        magnet: '#9d00ff',
        shield: '#00f0ff',
        multiplier: '#ff007f',
        slowmo: '#00ff66',
        ghost: '#e2e8f0'
      };
      const icons = {
        magnet: '🧲',
        shield: '🛡️',
        multiplier: '2X',
        slowmo: '⏳',
        ghost: '👻'
      };

      const col = colors[this.subType] || '#00f0ff';
      ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 2.5;

      // Hexagon capsule
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

      ctx.fillStyle = col;
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icons[this.subType] || '★', screenX, screenY);
    }

    ctx.restore();
  }
}
