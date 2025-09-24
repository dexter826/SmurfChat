/**
 * Block Utils - Optimized Block Checking
 * Centralized block checking with caching and batch operations
 * Created: September 4, 2025
 */

import { collection, getDocs, query, where, or, and } from 'firebase/firestore';
import { db } from '../config';

// In-memory cache for block status
const blockCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (userA, userB) => {
  const sorted = [userA, userB].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

const isCacheValid = (cacheEntry) => {
  if (!cacheEntry) return false;
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION;
};

const getCachedBlockStatus = (userA, userB) => {
  const cacheKey = getCacheKey(userA, userB);
  const cached = blockCache.get(cacheKey);

  if (isCacheValid(cached)) {
    return cached.data;
  }

  // Remove expired cache
  if (cached) {
    blockCache.delete(cacheKey);
  }

  return null;
};

const setCachedBlockStatus = (userA, userB, blockStatus) => {
  const cacheKey = getCacheKey(userA, userB);
  blockCache.set(cacheKey, {
    data: blockStatus,
    timestamp: Date.now()
  });
};

export const clearBlockCache = (userA, userB = null) => {
  if (userB) {
    const cacheKey = getCacheKey(userA, userB);
    blockCache.delete(cacheKey);
  } else {
    const keysToDelete = [];
    for (const [key] of blockCache) {
      if (key.includes(userA)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => blockCache.delete(key));
  }
};

export const getMutualBlockStatus = async (userA, userB) => {
  try {
    if (!userA || !userB || userA === userB) {
      return {
        aBlockedB: false,
        bBlockedA: false,
        isBlocked: false
      };
    }

    const cached = getCachedBlockStatus(userA, userB);
    if (cached) {
      return cached;
    }

    const blockedUsersRef = collection(db, 'blocked_users');

    const q = query(
      blockedUsersRef,
      or(
        and(
          where('blocker', '==', userA),
          where('blocked', '==', userB)
        ),
        and(
          where('blocker', '==', userB),
          where('blocked', '==', userA)
        )
      )
    );

    const snapshot = await getDocs(q);

    let aBlockedB = false;
    let bBlockedA = false;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.blocker === userA && data.blocked === userB) {
        aBlockedB = true;
      }
      if (data.blocker === userB && data.blocked === userA) {
        bBlockedA = true;
      }
    });

    const result = {
      aBlockedB,
      bBlockedA,
      isBlocked: aBlockedB || bBlockedA
    };

    setCachedBlockStatus(userA, userB, result);

    return result;
  } catch (error) {
    console.error('Error in getMutualBlockStatus:', error);
    return {
      aBlockedB: false,
      bBlockedA: false,
      isBlocked: false
    };
  }
};

export const isUserBlockedOptimized = async (blockerUserId, blockedUserId) => {
  try {
    if (!blockerUserId || !blockedUserId || blockerUserId === blockedUserId) {
      return false;
    }

    const mutualStatus = await getMutualBlockStatus(blockerUserId, blockedUserId);
    return mutualStatus.aBlockedB;
  } catch (error) {
    console.error('Error in isUserBlockedOptimized:', error);
    return false;
  }
};

export const batchCheckBlockStatus = async (currentUserId, userIds) => {
  try {
    if (!currentUserId || !userIds || userIds.length === 0) {
      return new Map();
    }

    const results = new Map();
    const uncachedUsers = [];

    userIds.forEach(userId => {
      if (userId !== currentUserId) {
        const cached = getCachedBlockStatus(currentUserId, userId);
        if (cached) {
          results.set(userId, cached);
        } else {
          uncachedUsers.push(userId);
        }
      }
    });

    if (uncachedUsers.length > 0) {
      const blockedUsersRef = collection(db, 'blocked_users');

      const q = query(
        blockedUsersRef,
        or(
          where('blocker', '==', currentUserId),
          where('blocked', '==', currentUserId)
        )
      );

      const snapshot = await getDocs(q);

      uncachedUsers.forEach(userId => {
        results.set(userId, {
          aBlockedB: false,
          bBlockedA: false,
          isBlocked: false
        });
      });

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const { blocker, blocked } = data;

        if (blocker === currentUserId && uncachedUsers.includes(blocked)) {
          const status = results.get(blocked);
          status.aBlockedB = true;
          status.isBlocked = true;
          results.set(blocked, status);
        }

        if (blocked === currentUserId && uncachedUsers.includes(blocker)) {
          const status = results.get(blocker);
          status.bBlockedA = true;
          status.isBlocked = true;
          results.set(blocker, status);
        }
      });

      uncachedUsers.forEach(userId => {
        const status = results.get(userId);
        setCachedBlockStatus(currentUserId, userId, status);
      });
    }

    return results;
  } catch (error) {
    console.error('Error in batchCheckBlockStatus:', error);
    return new Map();
  }
};

export const blockUtils = {
  canSendMessage: async (fromUserId, toUserId) => {
    const status = await getMutualBlockStatus(fromUserId, toUserId);
    return !status.isBlocked;
  },

  canViewProfile: async (viewerId, profileUserId) => {
    const status = await getMutualBlockStatus(viewerId, profileUserId);
    return !status.bBlockedA;
  },

  canStartConversation: async (userA, userB) => {
    const status = await getMutualBlockStatus(userA, userB);
    return !status.isBlocked;
  },

  canSendFriendRequest: async (fromUserId, toUserId) => {
    const status = await getMutualBlockStatus(fromUserId, toUserId);
    return !status.isBlocked;
  },

  getBlockMessage: (blockStatus, actionType = 'message') => {
    if (!blockStatus.isBlocked) return null;

    const messages = {
      message: blockStatus.aBlockedB
        ? 'Không thể gửi tin nhắn - bạn đã chặn người dùng này'
        : 'Không thể gửi tin nhắn - người dùng này đã chặn bạn',
      conversation: blockStatus.aBlockedB
        ? 'Không thể tạo cuộc trò chuyện - bạn đã chặn người dùng này'
        : 'Không thể tạo cuộc trò chuyện - người dùng này đã chặn bạn',
      friend_request: blockStatus.aBlockedB
        ? 'Không thể gửi lời mời kết bạn - bạn đã chặn người dùng này'
        : 'Không thể gửi lời mời kết bạn - người dùng này đã chặn bạn',
      invite: blockStatus.aBlockedB
        ? 'Không thể mời - bạn đã chặn người dùng này'
        : 'Không thể mời - người dùng này đã chặn bạn'
    };

    return messages[actionType] || messages.message;
  }
};

export const getCacheStats = () => {
  const total = blockCache.size;
  let expired = 0;

  for (const [, entry] of blockCache) {
    if (!isCacheValid(entry)) {
      expired++;
    }
  }

  return {
    totalEntries: total,
    expiredEntries: expired,
    validEntries: total - expired,
    hitRate: total > 0 ? ((total - expired) / total * 100).toFixed(2) + '%' : '0%'
  };
};
