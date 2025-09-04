/**
 * QueryBuilder - Dynamic Firebase Query Builder
 * 
 * Lazy loads Firebase functions to reduce bundle size
 * Provides uniform query building interface
 * 
 * Created: September 4, 2025
 * Task: 4.3 - Optimize Real-time Listeners (Bundle Size Optimization)
 */

class QueryBuilder {
  constructor() {
    this.firestoreFunctions = null;
    this.db = null;
  }

  /**
   * Lazy load Firebase Firestore functions
   */
  async loadFirestore() {
    if (!this.firestoreFunctions) {
      const [firebaseConfig, firestoreFunctions] = await Promise.all([
        import('../config'),
        import('firebase/firestore')
      ]);
      
      this.db = firebaseConfig.db;
      this.firestoreFunctions = firestoreFunctions;
    }
    return this.firestoreFunctions;
  }

  /**
   * Build Firestore query with conditions
   */
  async buildQuery(collectionName, condition = null, orderByField = null, orderDirection = 'asc') {
    const { collection, query, where, orderBy } = await this.loadFirestore();
    
    let q = query(collection(this.db, collectionName));

    // Add where condition
    if (condition) {
      q = query(
        collection(this.db, collectionName),
        where(condition.fieldName, condition.operator, condition.compareValue)
      );
    }

    // Add ordering
    if (orderByField) {
      q = condition
        ? query(
            collection(this.db, collectionName),
            where(condition.fieldName, condition.operator, condition.compareValue),
            orderBy(orderByField, orderDirection)
          )
        : query(
            collection(this.db, collectionName),
            orderBy(orderByField, orderDirection)
          );
    }

    return q;
  }

  /**
   * Generate unique key for query caching
   */
  generateKey(collectionName, condition, orderByField, orderDirection, customKey) {
    if (customKey) return customKey;

    const parts = [collectionName];
    
    if (condition) {
      parts.push(`${condition.fieldName}_${condition.operator}_${condition.compareValue}`);
    }
    
    if (orderByField) {
      parts.push(`order_${orderByField}_${orderDirection}`);
    }

    return parts.join('__');
  }
}

// Singleton instance
const queryBuilder = new QueryBuilder();

export default queryBuilder;
