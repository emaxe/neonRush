/**
 * Base Entity class
 */
export class Entity {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.active = true;
    // Переиспользуемый хитбокс — избегаем аллокаций в hot path (zero-GC)
    this._hitbox = { x: 0, y: 0, width: 0, height: 0 };
  }

  getHitbox() {
    this._hitbox.x = this.x;
    this._hitbox.y = this.y;
    this._hitbox.width = this.width;
    this._hitbox.height = this.height;
    return this._hitbox;
  }

  update(dt) {}

  draw(ctx, cameraX, cameraY = 0) {}
}
