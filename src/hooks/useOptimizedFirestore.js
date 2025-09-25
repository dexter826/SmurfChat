import { useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    const queryClient = useQueryClient();
    const currentKeyRef = useRef(null);

    const conditionKey = useMemo(() => {
        return condition ? JSON.stringify(condition) : null;
    }, [condition]);

    const queryKey = useMemo(() => {
        return ['firestore', collectionName, conditionKey, orderByField, orderDirection, customKey];
    }, [collectionName, conditionKey, orderByField, orderDirection, customKey]);

    // Hàm fetch dữ liệu từ Firestore
    const fetchData = async () => {
        if (!collectionName) return [];

        // Kiểm tra condition hợp lệ
        if (condition) {
            if (condition.compareValue === undefined || condition.compareValue === null) {
                return [];
            }
            if (Array.isArray(condition.compareValue) && condition.compareValue.length === 0) {
                return [];
            }
            if (typeof condition.compareValue === 'string' && condition.compareValue.trim() === '') {
                return [];
            }
        }

        try {
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();

            if (!auth.currentUser) {
                const protectedCollections = ['friends', 'friend_requests', 'users', 'conversations', 'rooms'];
                if (protectedCollections.includes(collectionName)) {
                    return [];
                }
            }
        } catch (authError) {
            console.warn('Auth check failed, proceeding with query:', authError);
        }

        const query = await queryBuilder.buildQuery(
            collectionName,
            condition,
            orderByField,
            orderDirection
        );

        const { getDocs } = await import('firebase/firestore');
        const snapshot = await getDocs(query);
        return snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        }));
    };

    const query = useQuery({
        queryKey,
        queryFn: fetchData,
        enabled: !!collectionName,
        staleTime: realTime ? 0 : 5 * 60 * 1000, // Real-time data không cache, static data cache 5 phút
        cacheTime: 10 * 60 * 1000, // Cache trong 10 phút
        refetchOnWindowFocus: false,
        refetchOnMount: !realTime, // Chỉ refetch khi mount nếu không phải real-time
    });

    // Setup real-time listener khi cần
    useEffect(() => {
        if (!realTime || !collectionName || query.isLoading) return;

        const setupListener = async () => {
            try {
                const { getAuth } = await import('firebase/auth');
                const auth = getAuth();

                if (!auth.currentUser) {
                    const protectedCollections = ['friends', 'friend_requests', 'users', 'conversations', 'rooms'];
                    if (protectedCollections.includes(collectionName)) {
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

            const firestoreQuery = await queryBuilder.buildQuery(
                collectionName,
                condition,
                orderByField,
                orderDirection
            );

            const handleDataUpdate = (docs, err = null) => {
                if (err) {
                    console.error('❌ Firestore real-time error:', err);
                    return;
                }

                // Cập nhật cache của React Query với dữ liệu real-time
                queryClient.setQueryData(queryKey, docs);
            };

            await listenerManager.subscribe(key, firestoreQuery, handleDataUpdate);
            currentKeyRef.current = key;
        };

        setupListener();

        return () => {
            if (currentKeyRef.current) {
                listenerManager.unsubscribe(currentKeyRef.current, () => { });
                currentKeyRef.current = null;
            }
        };
    }, [collectionName, condition, conditionKey, orderByField, orderDirection, realTime, customKey, query.isLoading, queryClient, queryKey]);

    const refresh = async () => {
        if (!collectionName) return;

        // Invalidate và refetch query
        await queryClient.invalidateQueries({ queryKey });
    };

    return {
        data: query.data || [],
        documents: query.data || [],
        loading: query.isLoading,
        error: query.error,
        refresh,
        isFetching: query.isFetching,
    };
};

export default useOptimizedFirestore;
