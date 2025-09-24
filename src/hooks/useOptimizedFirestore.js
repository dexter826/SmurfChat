/**
 * useOptimizedFirestore - Optimized Real-time Hook
 * Replacement for useFirestore with listener management
 * Prevents duplicate listeners and memory leaks
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import listenerManager from '../firebase/utils/listener.manager';
import queryBuilder from '../firebase/utils/query.builder';

const useOptimizedFirestore = (
    collectionName,
    condition = null,
    orderByField = null,
    orderDirection = 'asc',
    realTime = true,
    customKey = null
) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const currentKeyRef = useRef(null);

    const conditionKey = useMemo(() => {
        return condition ? JSON.stringify(condition) : null;
    }, [condition]);

    useEffect(() => {
        const setupListener = async () => {
            if (!collectionName) {
                setData([]);
                setLoading(false);
                return;
            }

            if (condition && (!condition.compareValue ||
                (Array.isArray(condition.compareValue) && !condition.compareValue.length))) {
                setData([]);
                setLoading(false);
                return;
            }

            try {
                const { getAuth } = await import('firebase/auth');
                const auth = getAuth();

                if (!auth.currentUser) {
                    const protectedCollections = ['friends', 'friend_requests', 'users', 'conversations', 'rooms'];
                    if (protectedCollections.includes(collectionName)) {
                        setData([]);
                        setLoading(false);
                        return;
                    }
                }
            } catch (authError) {
                console.warn('Auth check failed, proceeding with query:', authError);
            }

            const key = queryBuilder.generateKey(
                collectionName,
                condition,
                orderByField,
                orderDirection,
                customKey
            );

            try {
                setLoading(true);
                setError(null);

                const query = await queryBuilder.buildQuery(
                    collectionName,
                    condition,
                    orderByField,
                    orderDirection
                );

                const handleDataUpdate = (docs, err = null) => {
                    if (err) {
                        console.error('❌ Firestore error:', err);
                        setError(err);
                        setLoading(false);
                        return;
                    }

                    setData(docs);
                    setError(null);
                    setLoading(false);
                };

                if (realTime) {
                    await listenerManager.subscribe(key, query, handleDataUpdate);
                    currentKeyRef.current = key;
                } else {
                    const { getDocs } = await import('firebase/firestore');
                    const snapshot = await getDocs(query);
                    const docs = snapshot.docs.map((doc) => ({
                        ...doc.data(),
                        id: doc.id,
                    }));
                    handleDataUpdate(docs);
                }

            } catch (err) {
                console.error('❌ Failed to setup listener:', err);
                setError(err);
                setLoading(false);
            }
        };

        setupListener();

        return () => {
            if (currentKeyRef.current) {
                listenerManager.unsubscribe(currentKeyRef.current, () => { });
                currentKeyRef.current = null;
            }
        };
    }, [collectionName, condition, conditionKey, orderByField, orderDirection, realTime, customKey]);

    const refresh = async () => {
        if (!collectionName || !currentKeyRef.current) return;

        try {
            setLoading(true);

            const query = await queryBuilder.buildQuery(
                collectionName,
                condition,
                orderByField,
                orderDirection
            );

            listenerManager.unsubscribe(currentKeyRef.current, () => { });

            await listenerManager.subscribe(currentKeyRef.current, query, (docs, err) => {
                if (err) {
                    setError(err);
                    setLoading(false);
                    return;
                }

                setData(docs);
                setError(null);
                setLoading(false);
            });

        } catch (err) {
            console.error('❌ Failed to refresh:', err);
            setError(err);
            setLoading(false);
        }
    };

    return {
        data,
        documents: data, // Alias for backward compatibility
        loading,
        error,
        refresh
    };
};

export default useOptimizedFirestore;
