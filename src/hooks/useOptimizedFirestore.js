/**
 * useOptimizedFirestore - Optimized Real-time Hook
 * 
 * Replacement cho useFirestore với listener management và optimization
 * Prevents duplicate listeners và memory leaks
 * Uses dynamic imports để giảm bundle size
 * 
 * Created: September 4, 2025
 * Task: 4.3 - Optimize Real-time Listeners
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

    // Memoize condition để tránh re-render vô nghĩa
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

            // Generate unique key for this query
            const key = queryBuilder.generateKey(
                collectionName,
                condition,
                orderByField,
                orderDirection,
                customKey
            );

            // Early return if condition is invalid
            if (condition && (!condition.compareValue ||
                (Array.isArray(condition.compareValue) && !condition.compareValue.length))) {
                setData([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Build query using QueryBuilder
                const query = await queryBuilder.buildQuery(
                    collectionName,
                    condition,
                    orderByField,
                    orderDirection
                );

                // Callback for data updates
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
                    // Subscribe to managed real-time listener
                    await listenerManager.subscribe(key, query, handleDataUpdate);
                    currentKeyRef.current = key;
                } else {
                    // One-time fetch
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

        // Cleanup on unmount or dependency change
        return () => {
            if (currentKeyRef.current) {
                listenerManager.unsubscribe(currentKeyRef.current, () => { });
                currentKeyRef.current = null;
            }
        };
    }, [collectionName, condition, conditionKey, orderByField, orderDirection, realTime, customKey]);

    // Manual refresh function
    const refresh = async () => {
        if (!collectionName || !currentKeyRef.current) return;

        try {
            setLoading(true);

            // Force refresh listener
            const query = await queryBuilder.buildQuery(
                collectionName,
                condition,
                orderByField,
                orderDirection
            );

            // Unsubscribe and resubscribe to force refresh
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
        documents: data, // Backward compatibility
        loading,
        error,
        refresh
    };
};

export default useOptimizedFirestore;
