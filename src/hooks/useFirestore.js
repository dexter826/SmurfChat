import React, { useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const useFirestore = (collectionName, condition, orderByField = null, orderDirection = 'asc') => {
  const [documents, setDocuments] = useState([]);

  React.useEffect(() => {
    const collectionRef = collection(db, collectionName);
    let q = query(collectionRef);

    // Add where condition if provided
    if (condition) {
      if (!condition.compareValue || !condition.compareValue.length) {
        // reset documents data
        setDocuments([]);
        return;
      }

      q = query(
        collectionRef,
        where(
          condition.fieldName,
          condition.operator,
          condition.compareValue
        )
      );
    }

    // Add orderBy if specified
    if (orderByField) {
      q = condition 
        ? query(
            collectionRef,
            where(condition.fieldName, condition.operator, condition.compareValue),
            orderBy(orderByField, orderDirection)
          )
        : query(collectionRef, orderBy(orderByField, orderDirection));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // Remove client-side sorting - now handled by Firestore orderBy
      setDocuments(docs);
    });

    return unsubscribe;
  }, [collectionName, condition, orderByField, orderDirection]);

  return documents;
};

export default useFirestore;
