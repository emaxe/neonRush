import { CONFIG } from '../config/constants.js';
import { storageService } from '../services/StorageService.js';

/**
 * Camera system with horizontal tracking and screen shake support
 */
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  /**
   * Trigger screen shake
   * @param {number} intensity - Max pixel offset
   * @param {number} duration - Seconds
   */
  shake(intensity = 8, duration = 0.25) {
    if (!storageService.data?.settings?.screenShake) return;
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  /**
   * Update camera position based on player runner location
   * @param {number} dt 
   * @param {number} playerX 
   */
  update(dt, playerX) {
    // Keep player centered at 22% from left screen edge
    this.x = playerX - CONFIG.CANVAS_BASE_WIDTH * 0.22;

    // Update screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const decay = Math.max(0, this.shakeDuration);
      this.offsetX = (Math.random() * 2 - 1) * this.shakeIntensity * (decay / 0.25);
      this.offsetY = (Math.random() * 2 - 1) * this.shakeIntensity * (decay / 0.25);
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  /**
   * Get effective screen X including shake offset
   */
  get renderX() {
    return this.x + this.offsetX;
  }

  /**
   * Get effective screen Y including shake offset
   */
  get renderY() {
    return this.offsetY;
  }
}
