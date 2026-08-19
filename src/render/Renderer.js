import { CONFIG } from '../config/constants.js';

/**
 * Renderer - Manages high-DPI Canvas scaling, viewport aspect ratio normalization, and render passes.
 *
 * Пропорции сохраняются: используется равномерный масштаб (aspect-ratio fit),
 * а не независимое растяжение по X/Y. Свободные полосы (letterbox) заливаются
 * тёмным фоном в тон неоновой игры, чтобы на мобильных (портрет) не было искажений.
 *
 * Размеры берутся из контейнера #gameRoot (а не window), чтобы корректно
 * работать при принудительном повороте на 90° в портретной ориентации.
 */
export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dpr = 1;

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  /** Возвращает актуальные размеры игровой области (учитывая поворот контейнера). */
  getViewportSize() {
    const root = document.getElementById('gameRoot');
    if (root && root.offsetWidth > 0 && root.offsetHeight > 0) {
      return { width: root.offsetWidth, height: root.offsetHeight };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  handleResize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = this.getViewportSize();
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;

    // Равномерный масштаб — сохраняем пропорции (aspect-ratio fit).
    const scaleX = this.canvas.width / CONFIG.CANVAS_BASE_WIDTH;
    const scaleY = this.canvas.height / CONFIG.CANVAS_BASE_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);

    // Центрирование игровой области; полосы letterbox остаются тёмными.
    this.offsetX = (this.canvas.width - CONFIG.CANVAS_BASE_WIDTH * this.scale) / 2;
    this.offsetY = (this.canvas.height - CONFIG.CANVAS_BASE_HEIGHT * this.scale) / 2;
  }

  begin() {
    this.ctx.resetTransform();
    // Заливаем весь canvas тёмным фоном (полосы letterbox в тон игры).
    this.ctx.fillStyle = '#05060f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Сдвигаем к центру и применяем равномерный масштаб.
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}
