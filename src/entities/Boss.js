import { Entity } from './Entity.js';
import { CONFIG } from '../config/constants.js';
import { audioService } from '../services/AudioService.js';
import { particleSystem } from '../systems/ParticleSystem.js';
import { eventBus } from '../core/EventBus.js';

/**
 * Mini-Boss Entity - Cyber-Drone MK-IV with dynamic targeting, twin railguns, and charged spread blasts.
 */
export class Boss extends Entity {
  constructor() {
    super(0, 300, 130, 95);
    this.maxHp = 10;
    this.hp = 10;
    this.active = false;
    this.animTime = 0;
    this.shootTimer = 0;
    this.laserAttackTimer = 0;
    this.isChargingLaser = false;
    this.name = 'CYBER-DRONE MK-IV';
    this.phase = 1; // 1/2/3 — фазы боя (ускоряют атаки и меняют паттерны)
  }

  spawn(playerX, level = 1) {
    this.x = playerX + 900;
    this.y = 280;
    // HP растёт с уровнем и пройденной дистанцией (смягчённая прогрессия)
    this.maxHp = 10 + Math.floor(playerX / 30000) * 2 + Math.round((level - 1) * CONFIG.LEVEL_BOSS_HP_BONUS * 0.7);
    this.hp = this.maxHp;
    this.level = level;
    this.active = true;
    this.animTime = 0;
    this.shootTimer = 3.0;
    this.laserAttackTimer = 7.5;
    this.isChargingLaser = false;
    this.phase = 1;
    audioService.setBossMusic(true);
  }

  update(dt, player, levelGen, currentSpeed) {
    if (!this.active) return;
    this.animTime += dt;

    // Скорость атак растёт с уровнем (интервалы сокращаются)
    const level = this.level || 1;
    const attackSpeedBonus = 1 + (level - 1) * CONFIG.LEVEL_BOSS_SPEED_BONUS + (this.phase - 1) * 0.10;
    // Актуальная скорость мира (передаётся из Game.update) — снаряды должны
    // лететь быстрее, чем бежит игрок, на любом уровне разгона
    const worldSpeed = currentSpeed || player.vx;

    // Follow player with leading offset
    const targetX = player.x + 640;
    this.x += (targetX - this.x) * Math.min(1, dt * 4);

    // Smooth hover tracking player height
    const targetY = Math.max(140, Math.min(500, player.y - 15));
    this.y += (targetY - this.y) * Math.min(1, dt * 2.2) + Math.sin(this.animTime * 3) * 1.5;

    // Thruster exhaust particles
    if (Math.random() < 0.4) {
      particleSystem.spawnSparks(this.x + this.width + 10, this.y + 30, '#00f0ff', 1);
      particleSystem.spawnSparks(this.x + this.width + 10, this.y + 65, '#ff007f', 1);
    }

    // 1. Regular Attack: Twin Railgun Plasma Volleys
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = 3.2 / attackSpeedBonus;

      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      // Projectile relative speed: must travel faster towards the left than the runner runs right
      const projSpeed = worldSpeed + 120 + Math.min(100, (level - 1) * 18);

      if (level === 1) {
        const proj1 = levelGen.projectilePool.get();
        proj1.init(this.x - 5, this.y + 22, -projSpeed, 0, '#ff0055', false, 8);
        levelGen.projectiles.push(proj1);
        particleSystem.spawnSparks(this.x - 5, this.y + 22, '#ff0055', 4);
      } else {
        const trackingFactor = level <= 3 ? 0.4 : 0.8;

        // Top Gun
        const dy1 = playerCenterY - (this.y + 22);
        const proj1 = levelGen.projectilePool.get();
        proj1.init(this.x - 5, this.y + 22, -projSpeed, Math.max(-140, Math.min(140, dy1 * trackingFactor)), '#ff0055', false, 8);
        levelGen.projectiles.push(proj1);
        particleSystem.spawnSparks(this.x - 5, this.y + 22, '#ff0055', 4);

        // Bottom Gun
        const dy2 = playerCenterY - (this.y + 72);
        const proj2 = levelGen.projectilePool.get();
        proj2.init(this.x - 5, this.y + 72, -projSpeed, Math.max(-140, Math.min(140, dy2 * trackingFactor)), '#ff0055', false, 8);
        levelGen.projectiles.push(proj2);
        particleSystem.spawnSparks(this.x - 5, this.y + 72, '#ff0055', 4);
      }

      audioService.playShoot();
    }

    // 2. Heavy Attack: Charged Tri-Beam Cannon
    this.laserAttackTimer -= dt;

    // Charge phase (telegraph warning line + energy vortex)
    if (this.laserAttackTimer <= 1.8 && !this.isChargingLaser) {
      this.isChargingLaser = true;
      audioService.playBossLaser();
    }

    if (this.isChargingLaser && Math.random() < 0.6) {
      // Sucking in energy particles to core
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      particleSystem.emit(
        this.x + 30 + Math.cos(angle) * dist,
        this.y + this.height / 2 + Math.sin(angle) * dist,
        -Math.cos(angle) * 120,
        -Math.sin(angle) * 120,
        '#ffe600', 2, 0.25, 'rect'
      );
    }

    // Fire phase
    if (this.laserAttackTimer <= 0) {
      this.laserAttackTimer = 12.0 / attackSpeedBonus;
      this.isChargingLaser = false;

      const heavySpeed = worldSpeed + 180 + (level - 1) * 20;
      let spreadAngles;
      if (level >= 5 && this.phase >= 3) {
        spreadAngles = [-140, -70, 0, 70, 140];
      } else if (level >= 3) {
        spreadAngles = [-140, 0, 140];
      } else {
        spreadAngles = [-70, 0, 70];
      }

      for (let i = 0; i < spreadAngles.length; i++) {
        const proj = levelGen.projectilePool.get();
        proj.init(this.x - 15, this.y + this.height / 2, -heavySpeed, spreadAngles[i], '#ffe600', false, 12);
        levelGen.projectiles.push(proj);
      }

      particleSystem.spawnExplosion(this.x - 10, this.y + this.height / 2, '#ffe600', 16);
      particleSystem.spawnShockwave(this.x - 10, this.y + this.height / 2, '#ff0055', 90, 0.35);
      audioService.playExplosion();
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    particleSystem.spawnSparks(this.x, this.y + 45, '#00f0ff', 6);

    // Смена фазы при потере HP (75% / 50% / 25% — ускоряет атаки)
    const hpPct = this.hp / this.maxHp;
    const newPhase = hpPct > 0.6 ? 1 : (hpPct > 0.3 ? 2 : 3);
    if (newPhase !== this.phase) {
      this.phase = newPhase;
      particleSystem.spawnShockwave(this.x, this.y + this.height / 2, '#ff0055', 120, 0.5);
      particleSystem.spawnFloatingText(this.x, this.y - 30, `PHASE ${this.phase}`, '#ff0055', 20);
      audioService.playExplosion();
    }

    if (this.hp <= 0) {
      this.defeat();
    }
  }

  defeat() {
    this.active = false;
    audioService.setBossMusic(false);
    audioService.playExplosion();
    particleSystem.spawnDeathDisintegration(this.x + this.width / 2, this.y + this.height / 2, {
      head: '#ffe600',
      body: '#ff0055',
      visor: '#00f0ff',
      trail: '#9d00ff'
    });
    eventBus.emit('boss_defeated', { x: this.x, y: this.y });
  }

  draw(ctx, cameraX, cameraY = 0) {
    if (!this.active) return;
    const screenX = this.x - cameraX;
    const screenY = this.y + cameraY;
    ctx.save();

    // 1. Heavy Laser Targeting Sight Line
    if (this.isChargingLaser) {
      const pulse = Math.sin(this.animTime * 25) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255, 0, 85, ${pulse})`;
      ctx.lineWidth = 2.5 + Math.sin(this.animTime * 30) * 1.5;
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + this.height / 2);
      ctx.lineTo(screenX - 700, screenY + this.height / 2);
      ctx.stroke();

      // Lock-on crosshair at target line end
      ctx.fillStyle = '#ff0055';
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('⚠ LOCK-ON WARNING ⚠', screenX - 100, screenY + this.height / 2 - 12);
    }

    // 2. Boss Armored Hull
    ctx.fillStyle = '#0f1123';
    ctx.strokeStyle = this.isChargingLaser ? '#ffe600' : '#ff0055';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 3;

    // Swept-wing dreadnought hull
    ctx.beginPath();
    ctx.moveTo(screenX + 25, screenY);
    ctx.lineTo(screenX + this.width, screenY + 15);
    ctx.lineTo(screenX + this.width, screenY + this.height - 15);
    ctx.lineTo(screenX + 25, screenY + this.height);
    ctx.lineTo(screenX - 10, screenY + this.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Top and Bottom Railgun Barrels
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX - 12, screenY + 16, 22, 12);
    ctx.fillRect(screenX - 12, screenY + 16, 22, 12);

    ctx.strokeRect(screenX - 12, screenY + 66, 22, 12);
    ctx.fillRect(screenX - 12, screenY + 66, 22, 12);

    // 4. Glowing Reactor Core
    const pulse = Math.sin(this.animTime * (this.isChargingLaser ? 16 : 6)) * 4;
    const coreColor = this.isChargingLaser ? '#ffe600' : '#00f0ff';
    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(screenX + 38, screenY + this.height / 2, 14 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner White-Hot Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screenX + 38, screenY + this.height / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // 5. Twin Rear Thruster Jets
    const thrusterFlame = 20 + Math.sin(this.animTime * 30) * 10 + Math.random() * 8;
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;

    // Upper Thruster
    ctx.beginPath();
    ctx.moveTo(screenX + this.width, screenY + 22);
    ctx.lineTo(screenX + this.width + thrusterFlame, screenY + 30);
    ctx.lineTo(screenX + this.width, screenY + 38);
    ctx.fill();

    // Lower Thruster
    ctx.beginPath();
    ctx.moveTo(screenX + this.width, screenY + 56);
    ctx.lineTo(screenX + this.width + thrusterFlame, screenY + 64);
    ctx.lineTo(screenX + this.width, screenY + 72);
    ctx.fill();

    ctx.restore();
  }
}
