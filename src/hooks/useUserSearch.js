import { useState, useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '../Context/AuthProvider';
import { useUsers } from '../Context/UserContext';
import useOptimizedFirestore from './useOptimizedFirestore';
import { useBlockStatus } from './useBlockStatus';
import { debounce } from 'lodash';

export const useUserSearch = (options = {}) => {
  const {
    searchType = 'all',
    excludeBlocked = true,
    debounceMs = 300,
  } = options;

  const { user: currentUser } = useContext(AuthContext);
  const { allUsers } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const friendsCondition = useMemo(
    () => currentUser?.uid ? {
      fieldName: 'participants',
      operator: 'array-contains',
      compareValue: currentUser.uid,
    } : null,
    [currentUser?.uid]
  );

  const { documents: friendEdges } = useOptimizedFirestore(
    currentUser?.uid ? 'friends' : null,
    friendsCondition
  );

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

  const { documents: incomingRequestsRaw } = useOptimizedFirestore(
    currentUser?.uid ? 'friend_requests' : null,
    incomingReqsCondition
  );
  const incomingRequests = incomingRequestsRaw.filter(r => r.status === 'pending');

  const { documents: outgoingRequestsRaw } = useOptimizedFirestore(
    currentUser?.uid ? 'friend_requests' : null,
    outgoingReqsCondition
  );
  const outgoingRequests = outgoingRequestsRaw.filter(r => r.status === 'pending');

  const friendIds = useMemo(() => {
    if (!currentUser?.uid) return [];
    return friendEdges
      .map(edge => edge.participants?.find(id => id !== currentUser.uid))
      .filter(Boolean);
  }, [friendEdges, currentUser?.uid]);

  const friends = useMemo(() => {
    return allUsers.filter(user => friendIds.includes(user.uid));
  }, [allUsers, friendIds]);

  const nonFriends = useMemo(() => {
    return allUsers.filter(user => !friendIds.includes(user.uid));
  }, [allUsers, friendIds]);

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

  const filterUsersBySearch = useCallback((users, term) => {
    if (typeof term !== 'string') term = String(term || '');
    if (!term.trim()) return users;
    const searchLower = term.toLowerCase();
    return users.filter(user => {
      if (user.displayName?.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (user.email?.toLowerCase().includes(searchLower)) {
        return true;
      }
      if (user.keywords?.some(keyword =>
        keyword.toLowerCase().includes(searchLower)
      )) {
        return true;
      }
      return false;
    });
  }, []);

  const { checkIsBlocked } = useBlockStatus();

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
        filteredUsers.push(user);
      }
    }
    return filteredUsers;
  }, [excludeBlocked, currentUser?.uid, checkIsBlocked]);

  const debouncedSearch = useMemo(
    () => debounce(async (term) => {
      if (!currentUser?.uid) return;
      setLoading(true);
      setError(null);
      try {
        let results = filterUsersBySearch(baseUserList, term);
        if (excludeBlocked) {
          results = await filterBlockedUsers(results);
        }
        const formattedResults = results.map(user => ({
          id: user.uid,
          uid: user.uid,
          label: user.displayName || user.email,
          value: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          keywords: user.keywords || [],
          isFriend: friendIds.includes(user.uid),
        }));
        setSearchResults(formattedResults);
      } catch (err) {
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

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setError(null);
  }, []);

  const getFriendRequests = useCallback(() => {
    return {
      incoming: incomingRequests,
      outgoing: outgoingRequests
    };
  }, [incomingRequests, outgoingRequests]);

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
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, friends, excludeBlocked, filterUsersBySearch, filterBlockedUsers]);

  return {
    searchTerm,
    searchResults,
    loading,
    error,
    allUsers,
    friends,
    nonFriends,
    friendIds,
    incomingRequests,
    outgoingRequests,
    handleSearchChange,
    clearSearch,
    searchFriends,
    getFriendRequests,
    filterUsersBySearch,
    filterBlockedUsers,
  };
};
