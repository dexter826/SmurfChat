import { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useOnlineStatus = (userId) => {
  const [isOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!userId) return;

    // Update user's online status
    const updateOnlineStatus = async (online) => {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          isOnline: online,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    // Set user as online when component mounts
    updateOnlineStatus(true);

    // Listen for online/offline events
    const handleOnline = () => updateOnlineStatus(true);
    const handleOffline = () => updateOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', () => updateOnlineStatus(false));

    // Set user as offline when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      updateOnlineStatus(false);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        setUserStatus({
          isOnline: data.isOnline || false,
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
