import { useState, useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '../Context/AuthProvider';
import { useUsers } from '../Context/UserContext';
import useOptimizedFirestore from './useOptimizedFirestore';
import { useBlockStatus } from './useBlockStatus';
import { debounce } from 'lodash';

// Hook để tìm kiếm người dùng với các tùy chọn như loại tìm kiếm, loại trừ người bị chặn, và thời gian debounce
export const useUserSearch = (options = {}) => {
  const {
    searchType = 'all', // Loại tìm kiếm: 'all', 'friends', 'non-friends'
    excludeBlocked = true, // Có loại trừ người dùng bị chặn không
    debounceMs = 300, // Thời gian debounce cho tìm kiếm (ms)
  } = options;

  // Lấy thông tin người dùng hiện tại từ AuthContext
  const { user: currentUser } = useContext(AuthContext);
  // Lấy danh sách tất cả người dùng từ UserContext
  const { allUsers } = useUsers();
  // State cho từ khóa tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  // State cho kết quả tìm kiếm
  const [searchResults, setSearchResults] = useState([]);
  // State cho trạng thái loading
  const [loading, setLoading] = useState(false);
  // State cho lỗi
  const [error, setError] = useState(null);

  // Điều kiện để lấy danh sách bạn bè từ Firestore
  const friendsCondition = useMemo(
    () => currentUser?.uid ? {
      fieldName: 'participants',
      operator: 'array-contains',
      compareValue: currentUser.uid,
    } : null,
    [currentUser?.uid]
  );

  // Lấy danh sách các mối quan hệ bạn bè
  const { documents: friendEdges } = useOptimizedFirestore(
    currentUser?.uid ? 'friends' : null,
    friendsCondition
  );

  // Điều kiện để lấy yêu cầu kết bạn đến (incoming)
  const incomingReqsCondition = useMemo(
    () => currentUser?.uid ? {
      fieldName: 'to',
      operator: '==',
      compareValue: currentUser.uid,
    } : null,
    [currentUser?.uid]
  );

  // Điều kiện để lấy yêu cầu kết bạn đi (outgoing)
  const outgoingReqsCondition = useMemo(
    () => currentUser?.uid ? {
      fieldName: 'from',
      operator: '==',
      compareValue: currentUser.uid,
    } : null,
    [currentUser?.uid]
  );

  // Lấy danh sách yêu cầu kết bạn đến
  const { documents: incomingRequestsRaw } = useOptimizedFirestore(
    currentUser?.uid ? 'friend_requests' : null,
    incomingReqsCondition
  );
  // Lọc chỉ lấy yêu cầu đang chờ
  const incomingRequests = incomingRequestsRaw.filter(r => r.status === 'pending');

  // Lấy danh sách yêu cầu kết bạn đi
  const { documents: outgoingRequestsRaw } = useOptimizedFirestore(
    currentUser?.uid ? 'friend_requests' : null,
    outgoingReqsCondition
  );
  // Lọc chỉ lấy yêu cầu đang chờ
  const outgoingRequests = outgoingRequestsRaw.filter(r => r.status === 'pending');

  // Tạo danh sách ID của bạn bè
  const friendIds = useMemo(() => {
    if (!currentUser?.uid) return [];
    return friendEdges
      .map(edge => edge.participants?.find(id => id !== currentUser.uid))
      .filter(Boolean);
  }, [friendEdges, currentUser?.uid]);

  // Danh sách bạn bè
  const friends = useMemo(() => {
    return allUsers.filter(user => friendIds.includes(user.uid));
  }, [allUsers, friendIds]);

  // Danh sách người không phải bạn bè
  const nonFriends = useMemo(() => {
    return allUsers.filter(user => !friendIds.includes(user.uid));
  }, [allUsers, friendIds]);

  // Danh sách người dùng cơ sở dựa trên loại tìm kiếm
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

  // Hàm lọc người dùng dựa trên từ khóa tìm kiếm
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

  // Hook để kiểm tra trạng thái chặn
  const { checkIsBlocked } = useBlockStatus();

  // Hàm lọc người dùng bị chặn
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

  // Hàm tìm kiếm với debounce
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
        // Định dạng kết quả tìm kiếm
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
        setError(err.message || 'Không thể tìm kiếm người dùng');
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

  // Hàm xử lý thay đổi từ khóa tìm kiếm
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

  // Hàm xóa tìm kiếm
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setError(null);
  }, []);

  // Hàm lấy yêu cầu kết bạn
  const getFriendRequests = useCallback(() => {
    return {
      incoming: incomingRequests,
      outgoing: outgoingRequests
    };
  }, [incomingRequests, outgoingRequests]);

  // Hàm tìm kiếm bạn bè
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

  // Trả về các giá trị và hàm từ hook
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
