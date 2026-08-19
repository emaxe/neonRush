import { Entity } from './Entity.js';

/**
 * Obstacle entity - Spikes, barriers, high lasers, aerial drones, ground patrollers.
 */
export class Obstacle extends Entity {
  constructor() {
    super(0, 0, 40, 40);
    this.type = 'spike'; // 'spike', 'barrier', 'high_laser', 'drone', 'patroller'
    this.baseY = 0;
    this.hp = 1;
    this.animTime = 0;
    this.speed = 0;
    this.amplitude = 0;
    this.laserOn = true;
    this.laserTimer = 0;
    this.nearMissed = false;
  }

  init(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.active = true;
    this.hp = type === 'drone' ? 2 : (type === 'patroller' ? 3 : 1);
    this.animTime = Math.random() * 10;
    this.speed = type === 'drone' ? 120 : (type === 'patroller' ? 80 : 0);
    this.amplitude = type === 'drone' ? 45 : 0;
    this.laserOn = true;
    this.laserTimer = 0;
    this.nearMissed = false;
  }

  update(dt) {
    this.animTime += dt;

    if (this.type === 'drone') {
      // Sinusoidal vertical hover
      this.y = this.baseY + Math.sin(this.animTime * 3.5) * this.amplitude;
    } else if (this.type === 'patroller') {
      // Move left against runner
      this.x -= this.speed * dt;
    }
  }

  draw(ctx, cameraX, cameraY = 0, palette) {
    const screenX = this.x - cameraX;
    const screenY = this.y + cameraY;
    ctx.save();

    if (this.type === 'spike') {
      // Metallic spike with gradient + inner highlight
      const grad = ctx.createLinearGradient(screenX, screenY, screenX, screenY + this.height);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, palette.hazardColor);
      grad.addColorStop(1, '#3a0018');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#fff';
      ctx.shadowColor = palette.hazardColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (this.y < 360) {
        // Ceiling Spike
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + this.width / 2, screenY + this.height);
        ctx.lineTo(screenX + this.width, screenY);
      } else {
        // Floor Spike
        ctx.moveTo(screenX, screenY + this.height);
        ctx.lineTo(screenX + this.width / 2, screenY);
        ctx.lineTo(screenX + this.width, screenY + this.height);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner core line
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (this.y < 360) {
        ctx.moveTo(screenX + this.width / 2, screenY + this.height);
        ctx.lineTo(screenX + this.width / 2, screenY + 6);
      } else {
        ctx.moveTo(screenX + this.width / 2, screenY);
        ctx.lineTo(screenX + this.width / 2, screenY + this.height - 6);
      }
      ctx.stroke();

    } else if (this.type === 'barrier') {
      // Energy barrier with animated core
      const pulse = Math.sin(this.animTime * 6) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 0, 127, ${0.15 + pulse * 0.2})`;
      ctx.strokeStyle = palette.hazardColor;
      ctx.shadowColor = palette.hazardColor;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;

      ctx.strokeRect(screenX, screenY, this.width, this.height);
      ctx.fillRect(screenX, screenY, this.width, this.height);

      // Diagonal energy cross
      ctx.strokeStyle = `rgba(255, 0, 127, ${0.5 + pulse * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + this.width, screenY + this.height);
      ctx.moveTo(screenX + this.width, screenY);
      ctx.lineTo(screenX, screenY + this.height);
      ctx.stroke();

      // Pulsing core orb
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(screenX + this.width / 2, screenY + this.height / 2, 4 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'high_laser') {
      // Consistently visible Overhead Laser Gate (requires slide underneath)
      const pulse = Math.sin(this.animTime * 10) * 0.2 + 0.8;
      ctx.strokeStyle = `rgba(255, 0, 85, ${pulse})`;
      ctx.fillStyle = 'rgba(255, 0, 85, 0.25)';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3;

      // Laser beam body with animated energy streaks
      ctx.fillRect(screenX, screenY, this.width, this.height);
      ctx.strokeRect(screenX, screenY, this.width, this.height);

      // Animated energy streaks flowing through beam
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      const streakOffset = (this.animTime * 200) % this.width;
      for (let s = 0; s < 3; s++) {
        const sx = screenX + ((streakOffset + s * 25) % this.width);
        ctx.beginPath();
        ctx.moveTo(sx, screenY);
        ctx.lineTo(sx, screenY + this.height);
        ctx.stroke();
      }

      // Core white-hot laser line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + this.height / 2);
      ctx.lineTo(screenX + this.width, screenY + this.height / 2);
      ctx.stroke();

      // Left and Right Emitter Pylons extending up to ceiling
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.fillRect(screenX - 6, screenY - 20, 8, this.height + 20);
      ctx.strokeRect(screenX - 6, screenY - 20, 8, this.height + 20);

      ctx.fillRect(screenX + this.width - 2, screenY - 20, 8, this.height + 20);
      ctx.strokeRect(screenX + this.width - 2, screenY - 20, 8, this.height + 20);

      // Emitter glow caps
      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 12;
      ctx.fillRect(screenX - 6, screenY - 20, 8, 4);
      ctx.fillRect(screenX + this.width - 2, screenY - 20, 8, 4);
      ctx.shadowBlur = 0;

      // Slide Warning Arrow under beam
      ctx.fillStyle = '#ff007f';
      ctx.font = 'bold 10px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼ SLIDE ▼', screenX + this.width / 2, screenY - 4);

    } else if (this.type === 'drone') {
      const cx = screenX + this.width / 2;
      const cy = screenY + this.height / 2;

      // Rotor blur rings
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy - this.height / 2 - 4, this.width / 2 + 4, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy + this.height / 2 + 4, this.width / 2 + 4, 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Body with gradient
      const bodyGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, this.width / 2);
      bodyGrad.addColorStop(0, '#3a3a7a');
      bodyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(cx, cy, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Eye with glow
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Thruster ring
      const thrusterAngle = this.animTime * 15;
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, this.width / 2 + 5, thrusterAngle, thrusterAngle + Math.PI / 2);
      ctx.stroke();

      // Bottom thruster flame
      const flame = Math.sin(this.animTime * 20) * 3 + 6;
      ctx.fillStyle = 'rgba(255, 230, 0, 0.7)';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + this.height / 2);
      ctx.lineTo(cx, cy + this.height / 2 + flame);
      ctx.lineTo(cx + 4, cy + this.height / 2);
      ctx.closePath();
      ctx.fill();

    } else if (this.type === 'patroller') {
      const cx = screenX + this.width / 2;
      const cy = screenY + this.height / 2;

      // Body with gradient
      const bodyGrad = ctx.createLinearGradient(screenX, screenY, screenX, screenY + this.height);
      bodyGrad.addColorStop(0, '#4a1a5a');
      bodyGrad.addColorStop(1, '#31103f');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;

      ctx.fillRect(screenX, screenY, this.width, this.height);
      ctx.strokeRect(screenX, screenY, this.width, this.height);

      // Legs with walking animation
      const legSwing = Math.sin(this.animTime * 8) * 4;
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenX + 8, screenY + this.height);
      ctx.lineTo(screenX + 8 + legSwing, screenY + this.height + 8);
      ctx.moveTo(screenX + this.width - 8, screenY + this.height);
      ctx.lineTo(screenX + this.width - 8 - legSwing, screenY + this.height + 8);
      ctx.stroke();

      // Scanning Visor
      const scanX = screenX + (Math.sin(this.animTime * 6) * 0.5 + 0.5) * (this.width - 8);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(scanX, screenY + 6, 8, 5);

      // Eye
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(cx, screenY + 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
