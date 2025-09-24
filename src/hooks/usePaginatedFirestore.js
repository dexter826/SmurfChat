import React, { useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';

const usePaginatedFirestore = (
  collectionName,
  condition = null,
  orderByField = 'createdAt',
  orderDirection = 'asc',
  pageSize = 20,
  realTime = true
) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const lastDocRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const initialLoadRef = useRef(false);

  const resetPagination = useCallback(() => {
    setDocuments([]);
    setLoading(false);
    setHasMore(true);
    setError(null);
    lastDocRef.current = null;
    initialLoadRef.current = false;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  const buildQuery = useCallback((isLoadMore = false) => {
    const collectionRef = collection(db, collectionName);
    let q = query(collectionRef);

    if (condition) {
      if (!condition.compareValue || !condition.compareValue.length) {
        return null;
      }
      q = query(
        collectionRef,
        where(condition.fieldName, condition.operator, condition.compareValue)
      );
    }

    if (orderByField) {
      q = condition
        ? query(
          collectionRef,
          where(condition.fieldName, condition.operator, condition.compareValue),
          orderBy(orderByField, orderDirection)
        )
        : query(collectionRef, orderBy(orderByField, orderDirection));
    }

    if (isLoadMore && lastDocRef.current) {
      q = condition
        ? query(
          collectionRef,
          where(condition.fieldName, condition.operator, condition.compareValue),
          orderBy(orderByField, orderDirection),
          startAfter(lastDocRef.current),
          limit(pageSize)
        )
        : query(
          collectionRef,
          orderBy(orderByField, orderDirection),
          startAfter(lastDocRef.current),
          limit(pageSize)
        );
    } else {
      q = condition
        ? query(
          collectionRef,
          where(condition.fieldName, condition.operator, condition.compareValue),
          orderBy(orderByField, orderDirection),
          limit(pageSize)
        )
        : query(
          collectionRef,
          orderBy(orderByField, orderDirection),
          limit(pageSize)
        );
    }

    return q;
  }, [collectionName, condition, orderByField, orderDirection, pageSize]);

  const loadInitialData = useCallback(async () => {
    if (initialLoadRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const q = buildQuery(false);
      if (!q) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      if (realTime) {
        unsubscribeRef.current = onSnapshot(
          q,
          (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({
              ...doc.data(),
              id: doc.id,
            }));

            setDocuments(docs);
            setLoading(false);
            setHasMore(docs.length === pageSize);

            if (docs.length > 0) {
              lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            }

            initialLoadRef.current = true;
          },
          (err) => {
            console.error('Real-time subscription error:', err);
            setError(err);
            setLoading(false);
          }
        );
      } else {
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        setDocuments(docs);
        setLoading(false);
        setHasMore(docs.length === pageSize);

        if (docs.length > 0) {
          lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        }

        initialLoadRef.current = true;
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err);
      setLoading(false);
    }
  }, [buildQuery, realTime, pageSize]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !initialLoadRef.current) return;

    setLoading(true);

    try {
      const q = buildQuery(true);
      if (!q) {
        setLoading(false);
        return;
      }

      const snapshot = await getDocs(q);
      const newDocs = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      if (newDocs.length > 0) {
        setDocuments(prev => [...prev, ...newDocs]);
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        setHasMore(newDocs.length === pageSize);
      } else {
        setHasMore(false);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading more data:', err);
      setError(err);
      setLoading(false);
    }
  }, [buildQuery, loading, hasMore, pageSize]);

  const refresh = useCallback(async () => {
    resetPagination();
    await loadInitialData();
  }, [resetPagination, loadInitialData]);

  React.useEffect(() => {
    resetPagination();
    loadInitialData();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [collectionName, condition, orderByField, orderDirection, resetPagination, loadInitialData]);

  React.useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    documents,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
    isEmpty: documents.length === 0 && !loading,
    totalCount: documents.length
  };
};

export default usePaginatedFirestore;
