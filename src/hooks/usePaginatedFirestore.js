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

// Hook để phân trang dữ liệu từ Firestore với hỗ trợ thời gian thực
const usePaginatedFirestore = (
  collectionName, // Tên collection trong Firestore
  condition = null, // Điều kiện lọc (nếu có)
  orderByField = 'createdAt', // Trường sắp xếp
  orderDirection = 'asc', // Hướng sắp xếp ('asc' hoặc 'desc')
  pageSize = 20, // Số lượng tài liệu mỗi trang
  realTime = true // Có sử dụng cập nhật thời gian thực hay không
) => {
  // Trạng thái lưu trữ danh sách tài liệu
  const [documents, setDocuments] = useState([]);
  // Trạng thái tải dữ liệu
  const [loading, setLoading] = useState(false);
  // Có còn dữ liệu để tải thêm không
  const [hasMore, setHasMore] = useState(true);
  // Lỗi nếu có
  const [error, setError] = useState(null);

  // Tham chiếu đến tài liệu cuối cùng của trang hiện tại
  const lastDocRef = useRef(null);
  // Tham chiếu đến hàm hủy đăng ký snapshot thời gian thực
  const unsubscribeRef = useRef(null);
  // Đánh dấu đã tải dữ liệu ban đầu chưa
  const initialLoadRef = useRef(false);

  // Hàm reset phân trang về trạng thái ban đầu
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

  // Hàm xây dựng query Firestore dựa trên các tham số
  const buildQuery = useCallback((isLoadMore = false) => {
    const collectionRef = collection(db, collectionName);
    let q = query(collectionRef);

    // Thêm điều kiện lọc nếu có
    if (condition) {
      if (!condition.compareValue || !condition.compareValue.length) {
        return null; // Không có giá trị so sánh, trả về null
      }
      q = query(q, where(condition.fieldName, condition.operator, condition.compareValue));
    }

    // Thêm sắp xếp nếu có
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection));
    }

    // Thêm startAfter nếu đang tải thêm và có lastDoc
    if (isLoadMore && lastDocRef.current) {
      q = query(q, startAfter(lastDocRef.current));
    }

    // Luôn thêm limit
    q = query(q, limit(pageSize));

    return q;
  }, [collectionName, condition, orderByField, orderDirection, pageSize]);

  // Hàm tải dữ liệu ban đầu
  const loadInitialData = useCallback(async () => {
    if (initialLoadRef.current) return; // Đã tải rồi thì bỏ qua

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
        // Sử dụng onSnapshot cho cập nhật thời gian thực
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
            console.error('Lỗi đăng ký thời gian thực:', err);
            setError(err);
            setLoading(false);
          }
        );
      } else {
        // Sử dụng getDocs cho tải một lần
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
      console.error('Lỗi tải dữ liệu ban đầu:', err);
      setError(err);
      setLoading(false);
    }
  }, [buildQuery, realTime, pageSize]);

  // Hàm tải thêm dữ liệu
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !initialLoadRef.current) return; // Kiểm tra điều kiện tải thêm

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
      console.error('Lỗi tải thêm dữ liệu:', err);
      setError(err);
      setLoading(false);
    }
  }, [buildQuery, loading, hasMore, pageSize]);

  // Hàm làm mới dữ liệu (reset và tải lại)
  const refresh = useCallback(async () => {
    resetPagination();
    await loadInitialData();
  }, [resetPagination, loadInitialData]);

  // Effect để tải dữ liệu ban đầu khi các tham số thay đổi
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

  // Cleanup khi component unmount
  React.useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    documents, // Danh sách tài liệu
    loading, // Trạng thái tải
    hasMore, // Có còn dữ liệu để tải thêm
    error, // Lỗi nếu có
    loadMore, // Hàm tải thêm
    refresh, // Hàm làm mới
    isEmpty: documents.length === 0 && !loading, // Có rỗng không
    totalCount: documents.length // Tổng số tài liệu đã tải
  };
};

export default usePaginatedFirestore;
