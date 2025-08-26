import React, { useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const useFirestore = (collectionName, condition) => {
  const [documents, setDocuments] = useState([]);

  React.useEffect(() => {
    const collectionRef = collection(db, collectionName);
    let q = query(collectionRef);

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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // client-side sort by createdAt if present
      docs.sort((a, b) => {
        const aTime = a?.createdAt?.seconds || 0;
        const bTime = b?.createdAt?.seconds || 0;
        return aTime - bTime;
      });

      setDocuments(docs);
    });

    return unsubscribe;
  }, [collectionName, condition]);

  return documents;
};

export default useFirestore;
