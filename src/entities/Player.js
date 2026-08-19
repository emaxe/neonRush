import { Entity } from './Entity.js';
import { CONFIG } from '../config/constants.js';
import { SKINS } from '../config/skins.js';
import { audioService } from '../services/AudioService.js';
import { particleSystem } from '../systems/ParticleSystem.js';
import { storageService } from '../services/StorageService.js';
import { eventBus } from '../core/EventBus.js';

const JUMP_BUFFER_TIME = 0.14;

/**
 * Player Entity - Cyber-Runner with parkour mechanics, vertical gravity flip, dynamic shield, and skin rendering.
 */
export class Player extends Entity {
  constructor() {
    super(200, 500, CONFIG.PLAYER_WIDTH, CONFIG.PLAYER_HEIGHT);
    this.prevX = 200;
    this.prevY = 500;
    this.vx = CONFIG.PLAYER_BASE_SPEED;
    this.vy = 0;
    this.isGrounded = false;
    this.isSliding = false;
    this.isJumping = false;
    this.isFlipping = false;
    this.jumpHoldTimer = 0;
    this.jumpBufferTimer = 0;
    this.gravityDir = 1; // 1 = floor downward, -1 = ceiling upward
    this.scaleY = 1; // 1 to -1 smooth vertical flip
    this.animTime = 0;

    // Abilities & Roguelite state
    this.canDoubleJump = true;
    this.hasShield = false;
    this.shieldCharges = 0; // сколько ударов может поглотить щит (уровень апгрейда)
    this.nitroCharge = 0; // 0 to 100
    this.isNitro = false;
    this.nitroTimer = 0;
    this.isGhost = false;
    this.isSlowMo = false;
    this.magnetTimer = 0;
    this.multiplierTimer = 0;
    this.ghostTimer = 0;
    this.slowMoTimer = 0;

    // Combat shooting
    this.shootCooldown = 0;

    // Skin & visual trail
    this.skin = SKINS[0];
    this.trailPositions = [];
  }

  reset(startY = 500) {
    this.x = 200;
    this.y = startY;
    this.prevX = 200;
    this.prevY = startY;
    this.vx = CONFIG.PLAYER_BASE_SPEED;
    this.vy = 0;
    this.width = CONFIG.PLAYER_WIDTH;
    this.height = CONFIG.PLAYER_HEIGHT;
    this.isGrounded = false;
    this.isSliding = false;
    this.isJumping = false;
    this.isFlipping = false;
    this.jumpHoldTimer = 0;
    this.jumpBufferTimer = 0;
    this.gravityDir = 1;
    this.scaleY = 1;
    this.animTime = 0;
    this.canDoubleJump = true;
    this.nitroCharge = 0;
    this.isNitro = false;
    this.nitroTimer = 0;
    this.isGhost = false;
    this.isSlowMo = false;
    this.magnetTimer = 0;
    this.multiplierTimer = 0;
    this.ghostTimer = 0;
    this.slowMoTimer = 0;
    this.shootCooldown = 0;
    this.trailPositions = [];

    // Load active skin & upgrade perks
    const currentSkinId = storageService.data?.selectedSkin || 'classic';
    this.skin = SKINS.find(s => s.id === currentSkinId) || SKINS[0];
    this.hasShield = (storageService.data?.upgrades?.shield || 0) > 0;
    // Многоуровневый щит: число зарядов = уровень апгрейда (1/2/3 удара)
    this.shieldCharges = storageService.data?.upgrades?.shield || 0;
  }

  getHitbox() {
    const h = this.isSliding ? CONFIG.PLAYER_SLIDE_HEIGHT : CONFIG.PLAYER_HEIGHT;
    const y = this.gravityDir === 1
      ? (this.isSliding ? this.y + (CONFIG.PLAYER_HEIGHT - CONFIG.PLAYER_SLIDE_HEIGHT) : this.y)
      : this.y;
    this._hitbox.x = this.x;
    this._hitbox.y = y;
    this._hitbox.width = this.width;
    this._hitbox.height = h;
    return this._hitbox;
  }

  executeJump() {
    this.jumpBufferTimer = 0;
    this.vy = CONFIG.JUMP_IMPULSE * this.gravityDir;
    this.isGrounded = false;
    this.isJumping = true;
    this.jumpHoldTimer = 0;
    this.canDoubleJump = true;
    audioService.playJump();
    particleSystem.spawnSparks(this.x + this.width / 2, this.gravityDir === 1 ? this.y + this.height : this.y, this.skin.trail, 8);
    eventBus.emit('player_jump');
  }

  startJump() {
    if (this.isGrounded) {
      this.executeJump();
    } else if (this.canDoubleJump) {
      this.vy = CONFIG.DOUBLE_JUMP_IMPULSE * this.gravityDir;
      this.canDoubleJump = false;
      this.isJumping = true;
      this.jumpHoldTimer = 0;
      audioService.playDoubleJump();
      particleSystem.spawnExplosion(this.x + this.width / 2, this.y + this.height / 2, this.skin.trail, 14);
      eventBus.emit('player_jump');
    } else {
      this.jumpBufferTimer = JUMP_BUFFER_TIME;
    }
  }

  endJump() {
    this.isJumping = false;
  }

  flipGravity() {
    // Forbid flipping gravity while in mid-air or when a flip is already underway
    if (!this.isGrounded || this.isFlipping) return;

    this.jumpBufferTimer = 0;
    this.isFlipping = true;
    this.isGrounded = false;
    this.gravityDir *= -1;
    audioService.playGravityFlip();
    particleSystem.spawnExplosion(this.x + this.width / 2, this.y + this.height / 2, '#9d00ff', 12);
    eventBus.emit('gravity_flipped');
  }

  activateNitro() {
    if (this.nitroCharge >= 99 && !this.isNitro) {
      this.isNitro = true;
      const nitroLvl = storageService.data?.upgrades?.nitro || 0;
      this.nitroTimer = CONFIG.NITRO_DURATION + (nitroLvl * 0.3);
      this.nitroCharge = 0;
      audioService.playNitro();
      eventBus.emit('nitro_activated');
    }
  }

  update(dt, worldSpeed) {
    this.animTime += dt * (worldSpeed / 200);

    // Jump buffering
    if (this.jumpBufferTimer > 0) {
      if (this.isGrounded) {
        this.executeJump();
      } else {
        this.jumpBufferTimer -= dt;
        if (this.jumpBufferTimer < 0) this.jumpBufferTimer = 0;
      }
    }

    // Nitro timer
    if (this.isNitro) {
      this.nitroTimer -= dt;
      if (this.nitroTimer <= 0) {
        this.isNitro = false;
      }
    }

    // Variable jump height hold
    if (this.isJumping && this.jumpHoldTimer < CONFIG.MAX_JUMP_HOLD_TIME) {
      this.jumpHoldTimer += dt;
      this.vy += CONFIG.JUMP_HOLD_ACCEL * this.gravityDir * dt;
    }

    this.prevX = this.x;
    this.prevY = this.y;

    // Gravity physics
    this.vy += CONFIG.WORLD_GRAVITY * this.gravityDir * dt;
    this.y += this.vy * dt;

    // Smooth Vertical Scale Y Lerp (1 = floor, -1 = ceiling)
    const targetScaleY = this.gravityDir;
    this.scaleY += (targetScaleY - this.scaleY) * Math.min(1, dt * 20);

    // Slide sparks
    if (this.isSliding && this.isGrounded && Math.random() < 0.3) {
      const sparkY = this.gravityDir === 1 ? this.y + this.height : this.y;
      particleSystem.spawnSparks(this.x + 10, sparkY, '#ff007f', 2);
    }

    // Running dust puffs
    if (this.isGrounded && !this.isSliding && Math.random() < 0.12) {
      const dustY = this.gravityDir === 1 ? this.y + this.height : this.y;
      particleSystem.emit(
        this.x + 4, dustY,
        -40 - Math.random() * 30, (this.gravityDir === 1 ? -1 : 1) * (10 + Math.random() * 20),
        this.skin.trail, 2 + Math.random() * 2, 0.3 + Math.random() * 0.2, 'circle'
      );
    }

    // Jetpack flame when airborne (jumping/falling)
    if (!this.isGrounded && !this.isSliding) {
      const flameX = this.x + this.width / 2;
      const flameY = this.gravityDir === 1 ? this.y + this.height : this.y;
      if (Math.random() < 0.5) {
        particleSystem.emit(
          flameX, flameY,
          -20 + (Math.random() - 0.5) * 20,
          (this.gravityDir === 1 ? 1 : -1) * (60 + Math.random() * 60),
          this.isNitro ? '#ffe600' : this.skin.trail,
          2 + Math.random() * 3, 0.2 + Math.random() * 0.15, 'circle'
        );
      }
    }

    // Nitro flame trail
    if (this.isNitro && Math.random() < 0.6) {
      const flameX = this.x + this.width / 2;
      const flameY = this.gravityDir === 1 ? this.y + this.height : this.y;
      particleSystem.emit(
        flameX, flameY,
        -80 - Math.random() * 60,
        (this.gravityDir === 1 ? 1 : -1) * (30 + Math.random() * 40),
        Math.random() > 0.5 ? '#ffe600' : '#ff007f',
        3 + Math.random() * 3, 0.25 + Math.random() * 0.2, 'circle'
      );
    }

    // Store trail snapshots (reuse objects to avoid GC in hot path)
    let trailObj;
    if (this.trailPositions.length >= 5) {
      trailObj = this.trailPositions.pop();
    } else {
      trailObj = { x: 0, y: 0, scaleY: 1, sliding: false };
    }
    trailObj.x = this.x;
    trailObj.y = this.y;
    trailObj.scaleY = this.scaleY;
    trailObj.sliding = this.isSliding;
    this.trailPositions.unshift(trailObj);

    // Power-up timers
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
    if (this.multiplierTimer > 0) this.multiplierTimer -= dt;
    if (this.ghostTimer > 0) this.ghostTimer -= dt;
    if (this.slowMoTimer > 0) this.slowMoTimer -= dt;

    this.isGhost = this.ghostTimer > 0;
    this.isSlowMo = this.slowMoTimer > 0;

    // Shoot cooldown
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
  }

  draw(ctx, cameraX, cameraY = 0) {
    const screenX = this.x - cameraX;
    const screenY = this.y + cameraY;

    // Motion blur trail
    if (this.isNitro || this.isGhost || this.trailPositions.length > 2) {
      ctx.save();
      for (let i = 1; i < this.trailPositions.length; i++) {
        const t = this.trailPositions[i];
        const tScreenX = t.x - cameraX;
        const tScreenY = t.y + cameraY;
        const alpha = (1 - i / this.trailPositions.length) * (this.isNitro ? 0.7 : 0.3);
        ctx.globalAlpha = alpha;
        this.renderRunnerFigure(ctx, tScreenX, tScreenY, t.scaleY, t.sliding, this.skin.trail, true);
      }
      ctx.restore();
    }

    // Main runner body
    ctx.save();
    ctx.globalAlpha = this.isGhost ? 0.5 : 1.0;
    this.renderRunnerFigure(ctx, screenX, screenY, this.scaleY, this.isSliding, this.skin.head, false);
    ctx.restore();

    // Reactive Shield Bubble (morphs dynamically during slide)
    if (this.hasShield) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      const pulse = Math.sin(performance.now() * 0.008) * 2;

      let shieldCenterX = screenX + this.width / 2;
      let shieldCenterY;
      let shieldRadiusX;
      let shieldRadiusY;

      if (this.isSliding) {
        // Flattened elongated oval for sliding posture
        shieldRadiusX = 36 + pulse;
        shieldRadiusY = 20 + pulse;
        shieldCenterY = this.gravityDir === 1
          ? screenY + this.height - CONFIG.PLAYER_SLIDE_HEIGHT / 2
          : screenY + CONFIG.PLAYER_SLIDE_HEIGHT / 2;
      } else {
        // Upright oval for running/jumping posture
        shieldRadiusX = this.width / 2 + 14 + pulse;
        shieldRadiusY = this.height / 2 + 10 + pulse;
        shieldCenterY = screenY + this.height / 2;
      }

      ctx.beginPath();
      ctx.ellipse(shieldCenterX, shieldCenterY, shieldRadiusX, shieldRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Energy core lattice
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(shieldCenterX, shieldCenterY, shieldRadiusX * 0.65, shieldRadiusY * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  renderRunnerFigure(ctx, x, y, scaleY, isSliding, glowColor, isTrail) {
    ctx.save();
    const centerX = x + this.width / 2;
    const centerY = y + this.height / 2;
    ctx.translate(centerX, centerY);
    
    // Scale vertically to flip between floor and ceiling without inverting forward-running direction
    ctx.scale(1, scaleY);

    if (!isTrail) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
    }

    if (isSliding) {
      ctx.fillStyle = isTrail ? glowColor : this.skin.body;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 3;

      // Torso
      ctx.beginPath();
      ctx.roundRect(-22, 5, 44, 18, 6);
      ctx.fill();
      ctx.stroke();

      // Visor / Head
      ctx.fillStyle = this.skin.visor;
      ctx.beginPath();
      ctx.arc(16, 12, 7, 0, Math.PI * 2);
      ctx.fill();

      // Sparks
      ctx.strokeStyle = glowColor;
      ctx.beginPath();
      ctx.moveTo(-20, 22);
      ctx.lineTo(-30, 25);
      ctx.stroke();
    } else {
      const legSwing = Math.sin(this.animTime * 14) * 0.7;
      const armSwing = Math.cos(this.animTime * 14) * 0.7;

      ctx.fillStyle = isTrail ? glowColor : this.skin.body;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 3.5;

      // Back Leg
      ctx.beginPath();
      ctx.moveTo(-4, 10);
      ctx.lineTo(-4 - Math.sin(-legSwing) * 16, 24);
      ctx.lineTo(-4 - Math.sin(-legSwing) * 22, 34);
      ctx.stroke();

      // Torso Core
      ctx.beginPath();
      ctx.roundRect(-10, -14, 20, 26, 5);
      ctx.fill();
      ctx.stroke();

      // Chest core
      ctx.fillStyle = this.skin.visor;
      ctx.beginPath();
      ctx.arc(2, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Helmet
      ctx.fillStyle = isTrail ? glowColor : this.skin.head;
      ctx.beginPath();
      ctx.arc(0, -22, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor
      ctx.fillStyle = this.skin.visor;
      ctx.beginPath();
      ctx.arc(4, -22, 4.5, -Math.PI / 3, Math.PI / 3);
      ctx.fill();

      // Front Leg
      ctx.beginPath();
      ctx.moveTo(4, 10);
      ctx.lineTo(4 + Math.sin(legSwing) * 16, 24);
      ctx.lineTo(4 + Math.sin(legSwing) * 22, 34);
      ctx.stroke();

      // Front Arm
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.lineTo(2 + Math.sin(armSwing) * 14, 2);
      ctx.lineTo(6 + Math.sin(armSwing) * 18, 10);
      ctx.stroke();
    }

    ctx.restore();
  }
}
