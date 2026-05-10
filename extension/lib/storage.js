// extension/lib/storage.js
// Thin promise wrapper over chrome.storage.local plus a queue helper.

export const storage = {
  get(keys) {
    return new Promise(resolve =>
      chrome.storage.local.get(keys, result => resolve(result))
    );
  },
  set(items) {
    return new Promise(resolve =>
      chrome.storage.local.set(items, resolve)
    );
  },
  remove(keys) {
    return new Promise(resolve =>
      chrome.storage.local.remove(keys, resolve)
    );
  }
};

/**
 * A persistent queue for typing events that haven't been uploaded yet.
 * Resilient to extension restarts and offline periods.
 */
export class EventQueue {
  constructor(key = "tq_event_queue") {
    this.key = key;
  }

  async push(event) {
    const { [this.key]: existing = [] } = await storage.get(this.key);
    existing.push(event);
    // Cap at 1000 to prevent unbounded growth in catastrophic failures
    const trimmed = existing.slice(-1000);
    await storage.set({ [this.key]: trimmed });
  }

  async drain() {
    const { [this.key]: existing = [] } = await storage.get(this.key);
    await storage.set({ [this.key]: [] });
    return existing;
  }

  async size() {
    const { [this.key]: existing = [] } = await storage.get(this.key);
    return existing.length;
  }

  async restore(events) {
    // Push back to the front if upload failed, preserving order
    const { [this.key]: existing = [] } = await storage.get(this.key);
    await storage.set({ [this.key]: [...events, ...existing].slice(-1000) });
  }
}