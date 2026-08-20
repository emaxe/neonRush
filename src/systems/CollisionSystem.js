import { audioService } from '../services/AudioService.js';
import { particleSystem } from './ParticleSystem.js';
import { storageService } from '../services/StorageService.js';
import { CONFIG } from '../config/constants.js';

/**
 * CollisionSystem - Evaluates collisions between player, platforms, obstacles, collectibles, and projectiles.
 */
export class CollisionSystem {
  static _tempHitbox = { x: 0, y: 0, width: 0, height: 0 };

  /**
   * Axis-Aligned Bounding Box (AABB) overlap check
   * @param {{ x: number, y: number, width: number, height: number }} r1 
   * @param {{ x: number, y: number, width: number, height: number }} r2 
   * @returns {boolean}
   */
  static checkAABB(r1, r2) {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  }

  /**
   * Process all game physics and collision interactions
   * @param {Object} context
   */
  static resolve(context) {
    const { player, levelGen, boss, stats, camera, onPlayerDeath, onIncreaseCombo, onApplyPowerUp, onQuestProgress, onPerfectLanding } = context;
    const pHitbox = player.getHitbox();
    player.isGrounded = false;

    // 1. Platform Collisions (Continuous Collision Detection)
    for (let i = 0; i < levelGen.platforms.length; i++) {
      const plat = levelGen.platforms[i];
      const playerLeft = player.x;
      const playerRight = player.x + player.width;
      const platLeft = plat.x;
      const platRight = plat.x + plat.width;

      if (playerRight > platLeft && playerLeft < platRight) {
        if (player.gravityDir === 1) {
          // Downward gravity - landing on top of floor platforms
          if (!plat.isCeiling) {
            const prevBottom = (player.prevY !== undefined ? player.prevY : player.y) + player.height;
            const currentBottom = player.y + player.height;
            const floorTop = plat.y;

            const crossedSurface = prevBottom <= floorTop + 8 && currentBottom >= floorTop - 4;
            const withinPlatformDepth = currentBottom >= floorTop && currentBottom <= floorTop + plat.height + 40;

            if ((crossedSurface || withinPlatformDepth) && player.vy >= 0) {
              // Perfect Landing: точное приземление на пол после прыжка/падения
              if (player.airTime >= CONFIG.PERFECT_LANDING_MIN_AIR_TIME && !player.isSliding && !player.isFlipping) {
                if (onPerfectLanding) onPerfectLanding(player.x + player.width / 2, floorTop);
              }
              player.airTime = 0;
              player.y = floorTop - player.height;
              player.vy = 0;
              player.isGrounded = true;
              player.isFlipping = false;
              player.canDoubleJump = true;
            }
          }
        } else {
          // Inverted upward gravity - landing on bottom of ceiling platforms
          if (plat.isCeiling) {
            const prevTop = player.prevY !== undefined ? player.prevY : player.y;
            const currentTop = player.y;
            const ceilBottom = plat.y + plat.height;

            const crossedSurface = prevTop >= ceilBottom - 8 && currentTop <= ceilBottom + 4;
            const withinCeilingDepth = currentTop <= ceilBottom && currentTop >= plat.y - 40;

            if ((crossedSurface || withinCeilingDepth) && player.vy <= 0) {
              // Perfect Landing: точное приземление на потолок после прыжка/падения
              if (player.airTime >= CONFIG.PERFECT_LANDING_MIN_AIR_TIME && !player.isSliding && !player.isFlipping) {
                if (onPerfectLanding) onPerfectLanding(player.x + player.width / 2, ceilBottom);
              }
              player.airTime = 0;
              player.y = ceilBottom;
              player.vy = 0;
              player.isGrounded = true;
              player.isFlipping = false;
              player.canDoubleJump = true;
            }
          }
        }
      }
    }

    // Void pit check
    if (player.y > 750 || player.y < -150) {
      camera.shake(12, 0.4);
      onPlayerDeath('VOID PIT FALL');
      return;
    }

    // 2. Obstacle Collisions
    for (let i = levelGen.obstacles.length - 1; i >= 0; i--) {
      const obs = levelGen.obstacles[i];
      const oHitbox = obs.getHitbox();

      if (this.checkAABB(pHitbox, oHitbox)) {
        if (player.isNitro) {
          obs.active = false;
          levelGen.obstaclePool.release(obs);
          levelGen.obstacles.splice(i, 1);
          particleSystem.spawnExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, '#00f0ff', 20);
          camera.shake(6, 0.2);
          stats.score += 300 * stats.combo;
          continue;
        }

        if (player.isGhost && (obs.type === 'drone' || obs.type === 'patroller')) {
          continue;
        }

        if (player.hasShield) {
          player.shieldCharges--;
          if (player.shieldCharges <= 0) player.hasShield = false;
          obs.active = false;
          levelGen.obstaclePool.release(obs);
          levelGen.obstacles.splice(i, 1);
          audioService.playHit();
          camera.shake(10, 0.3);
          particleSystem.spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, '#00f0ff', 30);
          particleSystem.spawnFloatingText(player.x, player.y, player.hasShield ? `SHIELD ${player.shieldCharges}` : 'SHIELD BROKEN!', '#00f0ff', 18);
          stats.combo = 1.0;
          continue;
        }

        camera.shake(15, 0.5);
        if (navigator.vibrate) { try { navigator.vibrate([60, 30, 60]); } catch (e) {} }
        onPlayerDeath(`HIT ${obs.type.toUpperCase()}`);
        return;
      }

      // Near-Miss combo builder
      if (!obs.nearMissed && Math.abs((player.x + player.width / 2) - (obs.x + obs.width / 2)) < 50 && Math.abs((player.y + player.height / 2) - (obs.y + obs.height / 2)) < 90) {
        obs.nearMissed = true;
        onIncreaseCombo(0.2);
        particleSystem.spawnFloatingText(player.x, player.y - 30, 'NEAR MISS! +0.2x', '#00ff66', 13);
      }
    }

    // 3. Collectible Collisions
    for (let i = levelGen.collectibles.length - 1; i >= 0; i--) {
      const c = levelGen.collectibles[i];
      const dx = (player.x + player.width / 2) - c.x;
      const dy = (player.y + player.height / 2) - c.y;
      const rSum = player.width / 2 + c.radius;

      if (dx * dx + dy * dy < rSum * rSum) {
        c.active = false;
        levelGen.collectiblePool.release(c);
        levelGen.collectibles.splice(i, 1);

        if (c.type === 'coin') {
          const coinBonusLvl = storageService.data?.upgrades?.coinBonus || 0;
          const coinVal = 1 + Math.floor(coinBonusLvl * 0.2);
          stats.coins += coinVal;
          stats.score += 100 * stats.combo;
          onIncreaseCombo(0.05);
          player.nitroCharge = Math.min(100, player.nitroCharge + 2.5);
          audioService.playCoin(Math.floor(stats.combo));
          particleSystem.spawnSparks(c.x, c.y, '#ffe600', 6);
          // Occasional confetti burst on coin pickup
          if (Math.random() < 0.15) {
            particleSystem.spawnConfetti(c.x, c.y, 12);
          }
          if (onQuestProgress) onQuestProgress('acc_coins', coinVal);

        } else if (c.type === 'nitro') {
          player.nitroCharge = 100;
          audioService.playNitro();
          camera.shake(4, 0.15);
          particleSystem.spawnExplosion(c.x, c.y, '#00f0ff', 18);
          particleSystem.spawnFloatingText(player.x, player.y - 20, 'NITRO FULL!', '#00f0ff', 16);

        } else if (c.type === 'powerup') {
          onApplyPowerUp(c.subType);
          audioService.playPowerUp();
          camera.shake(5, 0.2);
          particleSystem.spawnExplosion(c.x, c.y, '#ff007f', 25);
          particleSystem.spawnFloatingText(player.x, player.y - 30, `${c.subType.toUpperCase()} ACQUIRED!`, '#ff007f', 18);
        }
      }
    }

    // 4. Projectile Collisions
    for (let i = levelGen.projectiles.length - 1; i >= 0; i--) {
      const p = levelGen.projectiles[i];

      if (p.isPlayer) {
        // Player shot hitting Boss
        if (boss.active) {
          if (
            p.x + p.radius > boss.x &&
            p.x - p.radius < boss.x + boss.width &&
            p.y + p.radius > boss.y &&
            p.y - p.radius < boss.y + boss.height
          ) {
            boss.takeDamage(1);
            p.active = false;
            levelGen.projectilePool.release(p);
            levelGen.projectiles.splice(i, 1);
            particleSystem.spawnSparks(p.x, p.y, '#00f0ff', 5);
            continue;
          }
        }

        // Player shot hitting drones/patrollers
        for (let j = levelGen.obstacles.length - 1; j >= 0; j--) {
          const obs = levelGen.obstacles[j];
          if (obs.type === 'drone' || obs.type === 'patroller') {
            CollisionSystem._tempHitbox.x = p.x - p.radius;
            CollisionSystem._tempHitbox.y = p.y - p.radius;
            CollisionSystem._tempHitbox.width = p.radius * 2;
            CollisionSystem._tempHitbox.height = p.radius * 2;
            if (this.checkAABB(CollisionSystem._tempHitbox, obs.getHitbox())) {
              obs.hp--;
              if (obs.hp <= 0) {
                obs.active = false;
                levelGen.obstaclePool.release(obs);
                levelGen.obstacles.splice(j, 1);
                particleSystem.spawnExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, '#ff0055', 20);
                stats.score += 500 * stats.combo;
                onIncreaseCombo(0.5);
              }
              p.active = false;
              levelGen.projectilePool.release(p);
              levelGen.projectiles.splice(i, 1);
              break;
            }
          }
        }
      } else {
        // Enemy / Boss plasma hitting player
        if (player.isNitro || player.isGhost) continue;
        CollisionSystem._tempHitbox.x = p.x - p.radius;
        CollisionSystem._tempHitbox.y = p.y - p.radius;
        CollisionSystem._tempHitbox.width = p.radius * 2;
        CollisionSystem._tempHitbox.height = p.radius * 2;
        if (this.checkAABB(pHitbox, CollisionSystem._tempHitbox)) {
          if (player.hasShield) {
            player.shieldCharges--;
            if (player.shieldCharges <= 0) player.hasShield = false;
            p.active = false;
            levelGen.projectilePool.release(p);
            levelGen.projectiles.splice(i, 1);
            audioService.playHit();
            camera.shake(8, 0.25);
            particleSystem.spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, '#00f0ff', 25);
            continue;
          }
          camera.shake(14, 0.4);
          onPlayerDeath('FATAL PLASMA BOLT');
          return;
        }
      }
    }
  }
}
