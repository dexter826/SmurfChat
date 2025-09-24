import { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useOnlineStatus = (userId) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!userId) return;

    // Cập nhật trạng thái online của người dùng
    const updateOnlineStatus = async (online) => {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          isOnline: online,
          lastSeen: new Date()
        });
        setIsOnline(online);
      } catch (error) {
        // Silent fail for online status updates
      }
    };

    // Đặt người dùng online khi component mount
    updateOnlineStatus(true);

    // Lắng nghe sự kiện online/offline
    const handleOnline = () => updateOnlineStatus(true);
    const handleOffline = () => updateOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', () => updateOnlineStatus(false));

    // Đặt người dùng offline khi tab bị ẩn
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat để duy trì trạng thái online mỗi 30 giây
    const heartbeatInterval = setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        updateOnlineStatus(true);
      }
    }, 30000);

    // Dọn dẹp
    return () => {
      updateOnlineStatus(false);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
    };
  }, [userId]);

  return { isOnline };
};

export const useUserOnlineStatus = (userId) => {
  const [userStatus, setUserStatus] = useState({ isOnline: false, lastSeen: null });

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const lastSeen = data.lastSeen;
        let isOnline = data.isOnline || false;

        // Kiểm tra xem người dùng có nên được coi là offline dựa trên hoạt động cuối cùng
        if (isOnline && lastSeen) {
          const lastSeenTime = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
          const now = new Date();
          const timeDiff = now - lastSeenTime;

          // Coi người dùng offline nếu không có hoạt động trong hơn 5 phút
          if (timeDiff > 5 * 60 * 1000) {
            isOnline = false;
          }
        }

        setUserStatus({
          isOnline,
          lastSeen: data.lastSeen
        });
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return userStatus;
};

export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Chưa xác định';

  const now = new Date();
  const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
  const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));

  if (diffInMinutes < 1) return 'Vừa xong';
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ngày trước`;

  return lastSeenDate.toLocaleDateString('vi-VN');
};
