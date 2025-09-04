/**
 * Listener Manager - Real-time Listener Optimization
 * 
 * Centralized management và optimization của Firestore listeners
 * Prevents memory leaks và optimizes real-time subscriptions
 * 
 * Created: September 4, 2025
 * Task: 4.3 - Optimize Real-time Listeners
 */

class ListenerManager {
  constructor() {
    this.listeners = new Map(); // key -> unsubscribe function
    this.listenerCounts = new Map(); // key -> subscriber count
    this.listenerData = new Map(); // key -> current data
    this.listenerCallbacks = new Map(); // key -> Set of callbacks
  }

  /**
   * Generate unique key for listener
   */
  generateKey(collectionName, condition, orderBy) {
    const conditionKey = condition 
      ? `${condition.fieldName}_${condition.operator}_${JSON.stringify(condition.compareValue)}`
      : 'all';
    const orderKey = orderBy 
      ? `${orderBy.field}_${orderBy.direction}`
      : 'none';
    return `${collectionName}_${conditionKey}_${orderKey}`;
  }

  /**
   * Subscribe to a listener (ref counting)
   */
  async subscribe(key, query, callback) {
    // Add callback to set
    if (!this.listenerCallbacks.has(key)) {
      this.listenerCallbacks.set(key, new Set());
    }
    this.listenerCallbacks.get(key).add(callback);

    // Increment ref count
    const currentCount = this.listenerCounts.get(key) || 0;
    this.listenerCounts.set(key, currentCount + 1);

    // If first subscriber, create listener
    if (currentCount === 0 && query) {
      await this.createListener(key, query);
    }

    // If data already exists, call callback immediately
    if (this.listenerData.has(key)) {
      callback(this.listenerData.get(key));
    }

    // Return unsubscribe function
    return () => this.unsubscribe(key, callback);
  }

  /**
   * Unsubscribe from listener
   */
  unsubscribe(key, callback) {
    // Remove callback
    const callbacks = this.listenerCallbacks.get(key);
    if (callbacks) {
      callbacks.delete(callback);
    }

    // Decrement ref count
    const currentCount = this.listenerCounts.get(key) || 0;
    const newCount = Math.max(0, currentCount - 1);
    this.listenerCounts.set(key, newCount);

    // If no more subscribers, cleanup listener
    if (newCount === 0) {
      this.cleanupListener(key);
    }
  }

  /**
   * Create actual Firestore listener
   */
  async createListener(key, query) {
    try {
      // Dynamic import để avoid bundle bloat
      const { onSnapshot } = await import('firebase/firestore');
      
      const unsubscribe = onSnapshot(
        query,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
          }));

          // Store data
          this.listenerData.set(key, docs);

          // Notify all callbacks
          const callbacks = this.listenerCallbacks.get(key);
          if (callbacks) {
            callbacks.forEach(callback => callback(docs));
          }
        },
        (error) => {
          console.error(`❌ Listener error for ${key}:`, error);
          
          // Notify callbacks of error
          const callbacks = this.listenerCallbacks.get(key);
          if (callbacks) {
            callbacks.forEach(callback => callback([], error));
          }
        }
      );

      this.listeners.set(key, unsubscribe);
    } catch (error) {
      console.error(`❌ Failed to create listener for ${key}:`, error);
      
      // Notify callbacks of error
      const callbacks = this.listenerCallbacks.get(key);
      if (callbacks) {
        callbacks.forEach(callback => callback([], error));
      }
    }
  }

  /**
   * Cleanup listener when no more subscribers
   */
  cleanupListener(key) {
    console.log(`🧹 Cleaning up listener: ${key}`);
    
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }

    this.listenerData.delete(key);
    this.listenerCallbacks.delete(key);
    this.listenerCounts.delete(key);
  }

  /**
   * Force cleanup all listeners (for app unmount)
   */
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

  /**
   * Get debug stats
   */
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

  /**
   * Manually invalidate cache for specific listener
   */
  invalidate(key) {
    this.listenerData.delete(key);
  }

  /**
   * Get current data without subscribing
   */
  getCurrentData(key) {
    return this.listenerData.get(key) || [];
  }
}

// Global singleton instance
const listenerManager = new ListenerManager();

export default listenerManager;
