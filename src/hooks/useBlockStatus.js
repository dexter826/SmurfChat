/**
 * useBlockStatus - Custom Hook for Block Status Management
 * 
 * Centralizes all block checking logic to eliminate redundancy.
 * Provides unified interface for checking block status between users.
 * 
 * Created: August 30, 2025
 * Purpose: Eliminate block check duplication (Issue 2.2)
 */

import { useState, useCallback, useEffect, useContext } from 'react';
import { AuthContext } from '../Context/AuthProvider';
import { isUserBlocked, areMutuallyBlocked } from '../firebase/services';

export const useBlockStatus = (targetUserId = null) => {
  const { user } = useContext(AuthContext);
  const [blockStatus, setBlockStatus] = useState({
    isBlockedByMe: false,
    isBlockingMe: false,
    isMutuallyBlocked: false,
    loading: false,
    error: null
  });

  // Check single direction block (currentUser blocked targetUser)
  const checkIsBlocked = useCallback(async (fromUserId, toUserId) => {
    try {
      if (!fromUserId || !toUserId || fromUserId === toUserId) {
        return false;
      }
      
      return await isUserBlocked(fromUserId, toUserId);
    } catch (error) {
      console.error('Error checking block status:', error);
      return false;
    }
  }, []);

  // Check mutual block status between two users
  const checkMutualBlockStatus = useCallback(async (userA, userB) => {
    try {
      if (!userA || !userB || userA === userB) {
        return {
          aBlockedB: false,
          bBlockedA: false,
          isBlocked: false
        };
      }
      
      return await areMutuallyBlocked(userA, userB);
    } catch (error) {
      console.error('Error checking mutual block status:', error);
      return {
        aBlockedB: false,
        bBlockedA: false,
        isBlocked: false
      };
    }
  }, []);

  // Refresh block status for target user
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
      console.error('Error refreshing block status:', error);
      setBlockStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to check block status'
      }));
    }
  }, [user?.uid, targetUserId, checkMutualBlockStatus]);

  // Auto-refresh when target user changes
  useEffect(() => {
    if (targetUserId && user?.uid) {
      refreshBlockStatus(targetUserId);
    }
  }, [targetUserId, user?.uid, refreshBlockStatus]);

  // Utility functions for common use cases
  const canSendMessage = useCallback((recipientId = targetUserId) => {
    if (!user?.uid || !recipientId || user.uid === recipientId) return true;
    
    // Can't send if either user blocked the other
    return !blockStatus.isMutuallyBlocked;
  }, [user?.uid, targetUserId, blockStatus.isMutuallyBlocked]);

  const canViewProfile = useCallback((profileUserId = targetUserId) => {
    if (!user?.uid || !profileUserId || user.uid === profileUserId) return true;
    
    // Can view if not blocking me
    return !blockStatus.isBlockingMe;
  }, [user?.uid, targetUserId, blockStatus.isBlockingMe]);

  const canStartConversation = useCallback((otherUserId = targetUserId) => {
    if (!user?.uid || !otherUserId || user.uid === otherUserId) return false;
    
    // Can start if no blocks exist
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
    // Status
    ...blockStatus,
    
    // Actions
    checkIsBlocked,
    checkMutualBlockStatus,
    refreshBlockStatus,
    
    // Utility functions
    canSendMessage,
    canViewProfile,
    canStartConversation,
    getBlockMessage,
  };
};
