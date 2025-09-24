/**
 * QueryBuilder - Dynamic Firebase Query Builder
 * Lazy loads Firebase functions to reduce bundle size
 */

class QueryBuilder {
  constructor() {
    this.firestoreFunctions = null;
    this.db = null;
  }

  /**
   * Lazy load Firebase functions
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
   * Build query with conditions
   */
  async buildQuery(collectionName, condition = null, orderByField = null, orderDirection = 'asc') {
    const { collection, query, where, orderBy } = await this.loadFirestore();

    const collectionRef = collection(this.db, collectionName);
    const constraints = [];

    // Add where condition
    if (condition) {
      constraints.push(where(condition.fieldName, condition.operator, condition.compareValue));
    }

    // Add ordering
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }

    // Build the query with all constraints
    return constraints.length > 0 ? query(collectionRef, ...constraints) : query(collectionRef);
  }

  /**
   * Generate unique cache key
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

// Export singleton instance
const queryBuilder = new QueryBuilder();

export default queryBuilder;
