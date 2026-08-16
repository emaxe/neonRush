/**
 * EventBus - Observer pattern implementation for decoupled pub/sub events.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event 
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event 
   * @param {Function} callback 
   */
  off(event, callback) {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event 
   * @param {any} [data] 
   */
  emit(event, data) {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err);
        }
      });
    }
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.events.clear();
  }
}

export const eventBus = new EventBus();
