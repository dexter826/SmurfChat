class QueryBuilder {
  constructor() {
    this.firestoreFunctions = null;
    this.db = null;
  }

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

  async buildQuery(collectionName, condition = null, orderByField = null, orderDirection = 'asc') {
    const { collection, query, where, orderBy } = await this.loadFirestore();

    const collectionRef = collection(this.db, collectionName);
    const constraints = [];

    // Validate condition trước khi thêm
    if (condition && this.isValidCondition(condition)) {
      constraints.push(where(condition.fieldName, condition.operator, condition.compareValue));
    }

    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }

    return constraints.length > 0 ? query(collectionRef, ...constraints) : query(collectionRef);
  }

  isValidCondition(condition) {
    if (!condition || !condition.fieldName || !condition.operator) {
      return false;
    }

    const { compareValue } = condition;

    // Kiểm tra undefined/null
    if (compareValue === undefined || compareValue === null) {
      return false;
    }

    // Kiểm tra array rỗng
    if (Array.isArray(compareValue) && compareValue.length === 0) {
      return false;
    }

    // Kiểm tra string rỗng
    if (typeof compareValue === 'string' && compareValue.trim() === '') {
      return false;
    }

    return true;
  }

  generateKey(collectionName, condition, orderByField, orderDirection, customKey) {
    if (customKey) return customKey;

    const parts = [collectionName];

    if (condition && this.isValidCondition(condition)) {
      parts.push(`${condition.fieldName}_${condition.operator}_${condition.compareValue}`);
    }

    if (orderByField) {
      parts.push(`order_${orderByField}_${orderDirection}`);
    }

    return parts.join('__');
  }
}

const queryBuilder = new QueryBuilder();

export default queryBuilder;
