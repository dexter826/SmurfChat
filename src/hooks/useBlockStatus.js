/**
 * useBlockStatus - Hook Tùy Chỉnh cho Quản Lý Trạng Thái Chặn
 */

import { useState, useCallback, useEffect, useContext } from 'react';
import { AuthContext } from '../Context/AuthProvider';
import { getMutualBlockStatus, isUserBlockedOptimized, clearBlockCache } from '../firebase/utils/block.utils';
import { collection, query, where, or, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useBlockStatus = (targetUserId = null) => {
  const { user } = useContext(AuthContext);
  const [blockStatus, setBlockStatus] = useState({
    isBlockedByMe: false,
    isBlockingMe: false,
    isMutuallyBlocked: false,
    loading: false,
    error: null
  });

  // Kiểm tra chặn một chiều (người dùng hiện tại chặn người dùng đích)
  const checkIsBlocked = useCallback(async (fromUserId, toUserId) => {
    try {
      if (!fromUserId || !toUserId || fromUserId === toUserId) {
        return false;
      }

      return await isUserBlockedOptimized(fromUserId, toUserId);
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái chặn:', error);
      return false;
    }
  }, []);

  // Kiểm tra trạng thái chặn lẫn nhau giữa hai người dùng
  const checkMutualBlockStatus = useCallback(async (userA, userB) => {
    try {
      if (!userA || !userB || userA === userB) {
        return {
          aBlockedB: false,
          bBlockedA: false,
          isBlocked: false
        };
      }

      return await getMutualBlockStatus(userA, userB);
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái chặn lẫn nhau:', error);
      return {
        aBlockedB: false,
        bBlockedA: false,
        isBlocked: false
      };
    }
  }, []);

  // Làm mới trạng thái chặn cho người dùng đích
  const refreshBlockStatus = useCallback(async (userId = targetUserId) => {
    if (!user?.uid || !userId || user.uid === userId) {
      setBlockStatus({
        isBlockedByMe: false,
        isBlockingMe: false,
        isMutuallyBlocked: false,
        loading: false,
        error: null
      });
      return;
    }

    setBlockStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const mutualStatus = await checkMutualBlockStatus(user.uid, userId);

      setBlockStatus({
        isBlockedByMe: mutualStatus.aBlockedB,
        isBlockingMe: mutualStatus.bBlockedA,
        isMutuallyBlocked: mutualStatus.isBlocked,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Lỗi khi làm mới trạng thái chặn:', error);
      setBlockStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Không thể kiểm tra trạng thái chặn'
      }));
    }
  }, [user?.uid, targetUserId, checkMutualBlockStatus]);

  // Trình nghe thời gian thực cho các thay đổi trạng thái chặn
  useEffect(() => {
    if (!user?.uid) return;

    // Thiết lập trình nghe cho các thay đổi chặn liên quan đến người dùng hiện tại và người dùng đích
    const blockedUsersRef = collection(db, 'blocked_users');

    // Truy vấn cho các tài liệu nơi người dùng hiện tại hoặc người dùng đích bị liên quan
    const conditions = [where('blocker', '==', user.uid), where('blocked', '==', user.uid)];
    if (targetUserId) {
      conditions.push(where('blocker', '==', targetUserId), where('blocked', '==', targetUserId));
    }

    const q = query(blockedUsersRef, or(...conditions));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Xóa bộ nhớ cache khi có thay đổi
      clearBlockCache(user.uid, targetUserId);

      // Làm mới trạng thái chặn
      if (targetUserId) {
        refreshBlockStatus(targetUserId);
      }
    }, (error) => {
      console.error('Lỗi khi lắng nghe các thay đổi chặn:', error);
    });

    // Dọn dẹp trình nghe khi unmount hoặc khi dependencies thay đổi
    return () => unsubscribe();
  }, [user?.uid, targetUserId, refreshBlockStatus]);

  // Các hàm tiện ích cho các trường hợp sử dụng phổ biến
  const canSendMessage = useCallback((recipientId = targetUserId) => {
    if (!user?.uid || !recipientId || user.uid === recipientId) return true;

    // Không thể gửi nếu một trong hai người dùng chặn người kia
    return !blockStatus.isMutuallyBlocked;
  }, [user?.uid, targetUserId, blockStatus.isMutuallyBlocked]);

  const canViewProfile = useCallback((profileUserId = targetUserId) => {
    if (!user?.uid || !profileUserId || user.uid === profileUserId) return true;

    // Có thể xem nếu không bị chặn bởi tôi
    return !blockStatus.isBlockingMe;
  }, [user?.uid, targetUserId, blockStatus.isBlockingMe]);

  const canStartConversation = useCallback((otherUserId = targetUserId) => {
    if (!user?.uid || !otherUserId || user.uid === otherUserId) return false;

    // Có thể bắt đầu nếu không có chặn nào
    return !blockStatus.isMutuallyBlocked;
  }, [user?.uid, targetUserId, blockStatus.isMutuallyBlocked]);

  const getBlockMessage = useCallback((actionType = 'message') => {
    if (!blockStatus.isMutuallyBlocked) return null;

    const messages = {
      message: blockStatus.isBlockedByMe
        ? 'Không thể gửi tin nhắn - bạn đã chặn người dùng này'
        : 'Không thể gửi tin nhắn - người dùng này đã chặn bạn',
      conversation: blockStatus.isBlockedByMe
        ? 'Không thể tạo cuộc trò chuyện - bạn đã chặn người dùng này'
        : 'Không thể tạo cuộc trò chuyện - người dùng này đã chặn bạn',
      friend_request: blockStatus.isBlockedByMe
        ? 'Không thể gửi lời mời kết bạn - bạn đã chặn người dùng này'
        : 'Không thể gửi lời mời kết bạn - người dùng này đã chặn bạn',
      invite: blockStatus.isBlockedByMe
        ? 'Không thể mời - bạn đã chặn người dùng này'
        : 'Không thể mời - người dùng này đã chặn bạn'
    };

    return messages[actionType] || messages.message;
  }, [blockStatus]);

  return {
    // Trạng thái
    ...blockStatus,

    // Hành động
    checkIsBlocked,
    checkMutualBlockStatus,
    refreshBlockStatus,

    // Các hàm tiện ích
    canSendMessage,
    canViewProfile,
    canStartConversation,
    getBlockMessage,
  };
};
