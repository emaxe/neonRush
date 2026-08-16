import { CONFIG } from '../config/constants.js';

/**
 * Renderer - Manages high-DPI Canvas scaling, viewport aspect ratio normalization, and render passes.
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scaleX = 1;
    this.scaleY = 1;
    this.dpr = 1;

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  handleResize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * this.dpr;
    this.canvas.height = window.innerHeight * this.dpr;

    this.scaleX = this.canvas.width / CONFIG.CANVAS_BASE_WIDTH;
    this.scaleY = this.canvas.height / CONFIG.CANVAS_BASE_HEIGHT;
  }

  begin() {
    this.ctx.resetTransform();
    this.ctx.scale(this.scaleX, this.scaleY);
    this.ctx.clearRect(0, 0, CONFIG.CANVAS_BASE_WIDTH, CONFIG.CANVAS_BASE_HEIGHT);
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}
