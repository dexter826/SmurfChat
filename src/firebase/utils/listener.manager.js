class ListenerManager {
  constructor() {
    this.listeners = new Map();
    this.listenerCounts = new Map();
    this.listenerData = new Map();
    this.listenerCallbacks = new Map();
  }

  generateKey(collectionName, condition, orderBy) {
    const conditionKey = condition
      ? `${condition.fieldName}_${condition.operator}_${JSON.stringify(condition.compareValue)}`
      : 'all';
    const orderKey = orderBy
      ? `${orderBy.field}_${orderBy.direction}`
      : 'none';
    return `${collectionName}_${conditionKey}_${orderKey}`;
  }

  async subscribe(key, query, callback) {
    if (!this.listenerCallbacks.has(key)) {
      this.listenerCallbacks.set(key, new Set());
    }
    this.listenerCallbacks.get(key).add(callback);

    const currentCount = this.listenerCounts.get(key) || 0;
    this.listenerCounts.set(key, currentCount + 1);

    if (currentCount === 0 && query) {
      await this.createListener(key, query);
    }

    if (this.listenerData.has(key)) {
      callback(this.listenerData.get(key));
    }

    return () => this.unsubscribe(key, callback);
  }

  unsubscribe(key, callback) {
    const callbacks = this.listenerCallbacks.get(key);
    if (callbacks) {
      callbacks.delete(callback);
    }

    const currentCount = this.listenerCounts.get(key) || 0;
    const newCount = Math.max(0, currentCount - 1);
    this.listenerCounts.set(key, newCount);

    if (newCount === 0) {
      this.cleanupListener(key);
    }
  }

  async createListener(key, query) {
    try {
      const { onSnapshot } = await import('firebase/firestore');

      const unsubscribe = onSnapshot(
        query,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }));

          this.listenerData.set(key, docs);

          const callbacks = this.listenerCallbacks.get(key);
          if (callbacks) {
            callbacks.forEach(callback => callback(docs));
          }
        },
        (error) => {
          console.error(`❌ Listener error for ${key}:`, error);

          const callbacks = this.listenerCallbacks.get(key);
          if (callbacks) {
            callbacks.forEach(callback => callback([], error));
          }
        }
      );

      this.listeners.set(key, unsubscribe);
    } catch (error) {
      console.error(`❌ Failed to create listener for ${key}:`, error);

      const callbacks = this.listenerCallbacks.get(key);
      if (callbacks) {
        callbacks.forEach(callback => callback([], error));
      }
    }
  }

  cleanupListener(key) {
    // console.log(`🧹 Cleaning up listener: ${key}`);

    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }

    this.listenerData.delete(key);
    this.listenerCallbacks.delete(key);
    this.listenerCounts.delete(key);
  }

  cleanupAll() {
    console.log(`🧹 Cleaning up all listeners (${this.listeners.size})`);

    for (const [, unsubscribe] of this.listeners) {
      unsubscribe();
    }

    this.listeners.clear();
    this.listenerCounts.clear();
    this.listenerData.clear();
    this.listenerCallbacks.clear();
  }

  getStats() {
    return {
      activeListeners: this.listeners.size,
      totalSubscribers: Array.from(this.listenerCounts.values()).reduce((a, b) => a + b, 0),
      listenersInfo: Array.from(this.listenerCounts.entries()).map(([key, count]) => ({
        key,
        subscribers: count,
        hasData: this.listenerData.has(key)
      }))
    };
  }

  invalidate(key) {
    this.listenerData.delete(key);
  }

  getCurrentData(key) {
    return this.listenerData.get(key) || [];
  }
}

// Global singleton instance
const listenerManager = new ListenerManager();

export default listenerManager;
