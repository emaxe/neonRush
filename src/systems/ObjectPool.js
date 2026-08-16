/**
 * Generic ObjectPool for high-performance recycling of particles, projectiles, enemies, etc.
 * Avoids garbage collection pauses during gameplay.
 * @template T
 */
export class ObjectPool {
  /**
   * @param {() => T} createFn 
   * @param {(obj: T, ...args: any[]) => void} resetFn 
   * @param {number} initialSize 
   */
  constructor(createFn, resetFn, initialSize = 30) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    /** @type {T[]} */
    this.pool = [];

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  /**
   * Retrieve an object from the pool and initialize it
   * @param  {...any} args 
   * @returns {T}
   */
  get(...args) {
    let obj = this.pool.pop();
    if (!obj) {
      obj = this.createFn();
    }
    this.resetFn(obj, ...args);
    return obj;
  }

  /**
   * Return an object to the pool for reuse
   * @param {T} obj 
   */
  release(obj) {
    this.pool.push(obj);
  }

  /**
   * Clear the pool
   */
  clear() {
    this.pool.length = 0;
  }
}
