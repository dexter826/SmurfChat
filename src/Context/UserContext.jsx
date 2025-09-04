import React, { createContext, useContext, useMemo } from 'react';
import useOptimizedFirestore from '../hooks/useOptimizedFirestore';
import { AuthContext } from './AuthProvider';

// Global User Context để tránh N+1 queries
const UserContext = createContext({});

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within UserProvider');
  }
  return context;
};

export function UserProvider({ children }) {
  const { user: currentUser } = useContext(AuthContext);

  // Single source of truth cho tất cả users
  const allUsersCondition = useMemo(() => 
    currentUser?.uid ? {
      fieldName: 'displayName',
      operator: '>=',
      compareValue: '',
    } : null,
    [currentUser?.uid]
  );

  const { documents: allUsers } = useOptimizedFirestore(
    currentUser?.uid ? 'users' : null, // Only fetch if user is authenticated
    allUsersCondition
  );

  // Filter out current user from the result
  const filteredUsers = useMemo(() => 
    allUsers?.filter(user => user.uid !== currentUser?.uid) || [],
    [allUsers, currentUser?.uid]
  );

  // Optimized user lookup với Map để O(1) performance
  const usersMap = useMemo(() => {
    const map = new Map();
    filteredUsers.forEach(user => {
      if (user?.uid) {
        map.set(user.uid, user);
      }
    });
    // Include current user
    if (currentUser?.uid) {
      map.set(currentUser.uid, currentUser);
    }
    return map;
  }, [filteredUsers, currentUser]);

  // Fast lookup functions
  const getUserById = useMemo(() => (uid) => {
    if (!uid) return null;
    return usersMap.get(uid) || {
      uid,
      displayName: 'Unknown User',
      photoURL: '',
      email: ''
    };
  }, [usersMap]);

  const getUsersByIds = useMemo(() => (uids = []) => {
    return uids.map(uid => getUserById(uid)).filter(Boolean);
  }, [getUserById]);

  // Get other participant in a conversation (optimized)
  const getOtherParticipant = useMemo(() => (conversation) => {
    if (!conversation?.participants || !currentUser?.uid) {
      return { displayName: 'Unknown User', photoURL: '', uid: '' };
    }
    
    const otherUid = conversation.participants.find(uid => uid !== currentUser.uid);
    return getUserById(otherUid) || { displayName: 'Unknown User', photoURL: '', uid: otherUid };
  }, [getUserById, currentUser?.uid]);

  // Batch user lookups để giảm re-renders
  const batchGetUsers = useMemo(() => (requests = []) => {
    const results = {};
    requests.forEach(({ key, uids }) => {
      results[key] = getUsersByIds(uids);
    });
    return results;
  }, [getUsersByIds]);

  const contextValue = useMemo(() => ({
    // Core data
    allUsers: filteredUsers,
    usersMap,
    
    // Fast lookup functions  
    getUserById,
    getUsersByIds,
    getOtherParticipant,
    batchGetUsers,
    
    // Performance stats
    totalUsers: filteredUsers.length,
    isLoading: !allUsersCondition && filteredUsers.length === 0
  }), [
    filteredUsers,
    usersMap, 
    getUserById,
    getUsersByIds,
    getOtherParticipant,
    batchGetUsers,
    allUsersCondition
  ]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export { UserContext };
