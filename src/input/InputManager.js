import { audioService } from '../services/AudioService.js';
import { GameState } from '../core/GameState.js';

/**
 * InputManager - Handles keyboard keys, swipe gestures, double taps, and virtual touch buttons.
 */
export class InputManager {
  /**
   * @param {import('../entities/Player.js').Player} player 
   * @param {import('../core/Game.js').Game} game 
   */
  constructor(player, game) {
    this.player = player;
    this.game = game;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.lastTapTime = 0;

    this.initKeyboard();
    this.initTouch();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (this.game.state !== GameState.PLAYING) {
        if (e.code === 'Escape' && this.game.state === GameState.PAUSED) {
          this.game.togglePause();
        }
        return;
      }

      // Jump
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!e.repeat) this.player.startJump();
      }

      // Slide
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.player.isSliding = true;
      }

      // Gravity Flip
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyG') {
        if (!e.repeat) this.player.flipGravity();
      }

      // Nitro Hyperdrive
      if (e.code === 'ControlLeft' || e.code === 'KeyF') {
        if (!e.repeat) this.player.activateNitro();
      }

      // Pause
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.game.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.player.endJump();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.player.isSliding = false;
      }
    });
  }

  initTouch() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    // Swipes & Taps on Canvas
    canvas.addEventListener('touchstart', (e) => {
      audioService.ensureContext();
      if (this.game.state !== GameState.PLAYING) return;

      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = performance.now();

      // Double tap check for Nitro
      if (this.touchStartTime - this.lastTapTime < 280) {
        this.player.activateNitro();
      }
      this.lastTapTime = this.touchStartTime;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      if (this.game.state !== GameState.PLAYING) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - this.touchStartX;
      const dy = touch.clientY - this.touchStartY;
      const dur = performance.now() - this.touchStartTime;

      // Swipe Gestures
      if (Math.abs(dy) > 35 && dur < 350) {
        if (dy < -35) {
          // Swipe Up -> Jump
          this.player.startJump();
          setTimeout(() => this.player.endJump(), 180);
        } else if (dy > 35) {
          // Swipe Down -> Slide
          this.player.isSliding = true;
          setTimeout(() => { this.player.isSliding = false; }, 450);
        }
      } else if (Math.abs(dx) < 25 && Math.abs(dy) < 25) {
        // Tap: Left half = Flip Gravity, Right half = Jump
        if (this.touchStartX < window.innerWidth * 0.45) {
          this.player.flipGravity();
        } else {
          this.player.startJump();
          setTimeout(() => this.player.endJump(), 150);
        }
      }
    }, { passive: true });

    // On-Screen Touch Buttons Binding
    const btnJump = document.getElementById('btnTouchJump');
    const btnSlide = document.getElementById('btnTouchSlide');
    const btnFlip = document.getElementById('btnTouchFlip');
    const btnNitro = document.getElementById('btnTouchNitro');

    if (btnJump) {
      btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); audioService.ensureContext(); this.player.startJump(); });
      btnJump.addEventListener('touchend', (e) => { e.preventDefault(); this.player.endJump(); });
    }

    if (btnSlide) {
      btnSlide.addEventListener('touchstart', (e) => { e.preventDefault(); audioService.ensureContext(); this.player.isSliding = true; });
      btnSlide.addEventListener('touchend', (e) => { e.preventDefault(); this.player.isSliding = false; });
    }

    if (btnFlip) {
      btnFlip.addEventListener('touchstart', (e) => { e.preventDefault(); audioService.ensureContext(); this.player.flipGravity(); });
    }

    if (btnNitro) {
      btnNitro.addEventListener('touchstart', (e) => { e.preventDefault(); audioService.ensureContext(); this.player.activateNitro(); });
    }
  }
}
