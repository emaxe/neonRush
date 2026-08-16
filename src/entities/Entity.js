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
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  update(dt) {}

  draw(ctx, cameraX, cameraY = 0) {}
}
