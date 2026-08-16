/**
 * Robust fixed/variable timestep game loop with delta clamping
 */
export class GameLoop {
  /**
   * @param {(dt: number) => void} updateFn 
   * @param {() => void} renderFn 
   */
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.lastTime = 0;
    this.rafId = null;
    this.isRunning = false;
    this.maxDt = 0.1; // 100ms max to prevent tunneling / spiraling
    this.timeScale = 1.0;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setTimeScale(scale) {
    this.timeScale = Math.max(0.01, scale);
  }

  tick(currentTime) {
    if (!this.isRunning) return;

    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp delta time to avoid large jumps when tab is inactive
    if (dt > this.maxDt) {
      dt = this.maxDt;
    }

    // Apply time scaling (for slow-motion abilities)
    dt *= this.timeScale;

    this.updateFn(dt);
    this.renderFn();

    this.rafId = requestAnimationFrame(this.tick);
  }
}
