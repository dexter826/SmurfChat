/**
 * useUserSearch - Custom Hook for User Search Operations
 * 
 * Consolidates duplicate user search logic across multiple modals.
 * Provides unified interface for searching users, friends, and filtering blocked users.
 * 
 * Created: August 30, 2025
 * Purpose: Eliminate user search duplication (Issue 2.3)
 */

import { useState, useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '../Context/AuthProvider';
import useFirestore from './useFirestore';
import { useBlockStatus } from './useBlockStatus';
import { debounce } from 'lodash';

export const useUserSearch = (options = {}) => {
  const {
    searchType = 'all', // 'all' | 'friends' | 'non-friends'
    excludeBlocked = true,
    excludeCurrentUser = true,
    debounceMs = 300,
  } = options;

  const { user: currentUser } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get all users (excluding current user if needed)
  const allUsersCondition = useMemo(
    () => excludeCurrentUser && currentUser?.uid ? {
      fieldName: 'uid',
      operator: '!=',
      compareValue: currentUser.uid,
    } : null,
    [currentUser?.uid, excludeCurrentUser]
  );

  const allUsers = useFirestore('users', allUsersCondition);

  // Get friends data
  const friendsCondition = useMemo(
    () => currentUser?.uid ? {
      fieldName: 'participants',
      operator: 'array-contains',
      compareValue: currentUser.uid,
    } : null,
    [currentUser?.uid]
  );

  const friendEdges = useFirestore('friends', friendsCondition);

  // Friend requests data (always loaded for efficiency)
  const incomingReqsCondition = useMemo(
    () => currentUser?.uid ? {
      fieldName: 'to',
      operator: '==',
      compareValue: currentUser.uid,
    } : null,
    [currentUser?.uid]
  );

  const outgoingReqsCondition = useMemo(
    () => currentUser?.uid ? {
      fieldName: 'from',
      operator: '==',
      compareValue: currentUser.uid,
    } : null,
    [currentUser?.uid]
  );

  const incomingRequests = useFirestore('friend_requests', incomingReqsCondition)
    .filter(r => r.status === 'pending');

  const outgoingRequests = useFirestore('friend_requests', outgoingReqsCondition)
    .filter(r => r.status === 'pending');

  // Extract friend IDs
  const friendIds = useMemo(() => {
    if (!currentUser?.uid) return [];
    
    return friendEdges
      .map(edge => edge.participants?.find(id => id !== currentUser.uid))
      .filter(Boolean);
  }, [friendEdges, currentUser?.uid]);

  // Get friends with full user data
  const friends = useMemo(() => {
    return allUsers.filter(user => friendIds.includes(user.uid));
  }, [allUsers, friendIds]);

  // Get non-friends
  const nonFriends = useMemo(() => {
    return allUsers.filter(user => !friendIds.includes(user.uid));
  }, [allUsers, friendIds]);

  // Get base user list based on search type
  const baseUserList = useMemo(() => {
    switch (searchType) {
      case 'friends':
        return friends;
      case 'non-friends':
        return nonFriends;
      case 'all':
      default:
        return allUsers;
    }
  }, [searchType, friends, nonFriends, allUsers]);

  // Filter users by search term
  const filterUsersBySearch = useCallback((users, term) => {
  if (typeof term !== 'string') term = String(term || '');
  if (!term.trim()) return users;

    const searchLower = term.toLowerCase();
    
    return users.filter(user => {
      // Search in display name
      if (user.displayName?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in email
      if (user.email?.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in keywords (if available)
      if (user.keywords?.some(keyword => 
        keyword.toLowerCase().includes(searchLower)
      )) {
        return true;
      }

      return false;
    });
  }, []);

  // Check if user should be excluded due to blocking
  const { checkIsBlocked } = useBlockStatus();

  // Filter blocked users
  const filterBlockedUsers = useCallback(async (users) => {
    if (!excludeBlocked || !currentUser?.uid) return users;

    const filteredUsers = [];
    
    for (const user of users) {
      try {
        const isBlocked = await checkIsBlocked(currentUser.uid, user.uid);
        if (!isBlocked) {
          filteredUsers.push(user);
        }
      } catch (err) {
        console.error('Error checking block status for user:', user.uid, err);
        // Include user if can't check (default behavior)
        filteredUsers.push(user);
      }
    }

    return filteredUsers;
  }, [excludeBlocked, currentUser?.uid, checkIsBlocked]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(async (term) => {
      if (!currentUser?.uid) return;

      setLoading(true);
      setError(null);

      try {
        // Filter by search term
        let results = filterUsersBySearch(baseUserList, term);

        // Filter blocked users if needed
        if (excludeBlocked) {
          results = await filterBlockedUsers(results);
        }

        // Format results for consistent structure
        const formattedResults = results.map(user => ({
          id: user.uid,
          uid: user.uid,
          label: user.displayName || user.email,
          value: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          keywords: user.keywords || [],
          // Additional metadata
          isFriend: friendIds.includes(user.uid),
        }));

        setSearchResults(formattedResults);
      } catch (err) {
        console.error('Error in user search:', err);
        setError(err.message || 'Failed to search users');
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs),
    [
      currentUser?.uid,
      baseUserList,
      excludeBlocked,
      friendIds,
      filterUsersBySearch,
      filterBlockedUsers,
      debounceMs
    ]
  );

  // Handle search term change
  const handleSearchChange = useCallback((term) => {
    let value = term;
    if (typeof value !== 'string') {
      if (value && value.target && typeof value.target.value === 'string') {
        value = value.target.value;
      } else {
        value = String(value || '');
      }
    }
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setError(null);
  }, []);

  // Get friend requests data
  const getFriendRequests = useCallback(() => {
    return { 
      incoming: incomingRequests, 
      outgoing: outgoingRequests 
    };
  }, [incomingRequests, outgoingRequests]);

  // Search specifically in friend list (optimized for AddRoomModal)
  const searchFriends = useCallback(async (term = '') => {
    if (!currentUser?.uid) return [];

    setLoading(true);
    try {
      let results = filterUsersBySearch(friends, term);
      
      if (excludeBlocked) {
        results = await filterBlockedUsers(results);
      }

      return results.map(user => ({
        label: user.displayName,
        value: user.uid,
        photoURL: user.photoURL,
        keywords: user.keywords || [],
      }));
    } catch (err) {
      console.error('Error searching friends:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, friends, excludeBlocked, filterUsersBySearch, filterBlockedUsers]);

  return {
    // State
    searchTerm,
    searchResults,
    loading,
    error,
    
    // Data
    allUsers,
    friends,
    nonFriends,
    friendIds,
    incomingRequests,
    outgoingRequests,
    
    // Actions  
    handleSearchChange,
    clearSearch,
    searchFriends,
    getFriendRequests,
    
    // Utilities
    filterUsersBySearch,
    filterBlockedUsers,
  };
};
