import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import { useAlert } from '../../Context/AlertProvider';
import { getBlockedUsers, unblockUser } from '../../firebase/services';
import { useUserSearch } from '../../hooks/useUserSearch';
import { FaTimes, FaBan, FaSearch, FaUserSlash } from 'react-icons/fa';

function BlockedUsersModalComponent() {
  const { user } = useContext(AuthContext);
  const { isBlockedUsersVisible, setIsBlockedUsersVisible } =
    useContext(AppContext);
  const { success, error, confirm } = useAlert();
  const [blockedUsersList, setBlockedUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unblockingUsers, setUnblockingUsers] = useState(new Set());

  // Use useUserSearch hook for search functionality
  const {
    searchTerm,
    handleSearchChange,
    clearSearch,
    filterUsersBySearch,
    allUsers
  } = useUserSearch({ excludeCurrentUser: true });

  // Load blocked users list
  useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!isBlockedUsersVisible || !user?.uid) return;

      setIsLoading(true);
      try {
        const blocked = await getBlockedUsers(user.uid);
        setBlockedUsersList(blocked);
      } catch (err) {
        console.error("Error loading blocked users:", err);
        error("Không thể tải danh sách người bị chặn");
      } finally {
        setIsLoading(false);
      }
    };

    loadBlockedUsers();
  }, [isBlockedUsersVisible, user?.uid, error]);

  // Get user details for blocked users
  const blockedUsersWithDetails = blockedUsersList.map((blockedUser) => {
    const userDetails = allUsers.find((u) => u.uid === blockedUser.blocked);
    return {
      ...blockedUser,
      userDetails: userDetails || {
        displayName: userDetails?.email || "Người dùng không xác định",
        email: "",
        photoURL: "",
      },
    };
  });

  // Filter blocked users based on search term using hook utility
  const filteredBlockedUsers = searchTerm 
    ? filterUsersBySearch(blockedUsersWithDetails.map(bu => ({
        ...bu.userDetails,
        originalData: bu // Keep original blocked user data
      })), searchTerm).map(filtered => filtered.originalData)
    : blockedUsersWithDetails;

  // Handle unblock user
  const handleUnblockUser = async (blockedUser) => {
    const confirmed = await confirm(
      `Bạn có chắc muốn bỏ chặn ${blockedUser.userDetails.displayName}?`
    );

    if (!confirmed) return;

    setUnblockingUsers((prev) => new Set(prev).add(blockedUser.blocked));

    try {
      await unblockUser(user.uid, blockedUser.blocked);

      // Remove from local state
      setBlockedUsersList((prev) =>
        prev.filter((item) => item.blocked !== blockedUser.blocked)
      );

      success(`Đã bỏ chặn ${blockedUser.userDetails.displayName}`);
    } catch (err) {
      console.error("Error unblocking user:", err);
      error(err.message || "Không thể bỏ chặn người dùng");
    } finally {
      setUnblockingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(blockedUser.blocked);
        return newSet;
      });
    }
  };

  if (!isBlockedUsersVisible) return null;

  const handleClose = () => {
    setIsBlockedUsersVisible(false);
    clearSearch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FaUserSlash className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Quản lý người bị chặn
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <FaTimes className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm người bị chặn..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-skybrand-500 focus:border-skybrand-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-skybrand-500 border-t-transparent"></div>
                <span className="text-slate-600 dark:text-slate-400">
                  Đang tải...
                </span>
              </div>
            </div>
          ) : filteredBlockedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FaBan className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h4 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                {blockedUsersList.length === 0
                  ? "Chưa chặn ai"
                  : "Không tìm thấy"}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {blockedUsersList.length === 0
                  ? "Bạn chưa chặn người dùng nào"
                  : "Không có người dùng nào khớp với tìm kiếm"}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <div className="p-4 space-y-3">
                {filteredBlockedUsers.map((blockedUser) => {
                  const isUnblocking = unblockingUsers.has(blockedUser.blocked);

                  return (
                    <div
                      key={blockedUser.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {blockedUser.userDetails.photoURL ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={blockedUser.userDetails.photoURL}
                              alt="avatar"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white font-semibold">
                              {(blockedUser.userDetails.displayName || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* User Details */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {blockedUser.userDetails.displayName}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {blockedUser.userDetails.email}
                          </p>
                          {blockedUser.createdAt && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Chặn từ:{" "}
                              {new Date(
                                blockedUser.createdAt.toDate
                                  ? blockedUser.createdAt.toDate()
                                  : blockedUser.createdAt
                              ).toLocaleDateString("vi-VN")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Unblock Button */}
                      <button
                        onClick={() => handleUnblockUser(blockedUser)}
                        disabled={isUnblocking}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                          isUnblocking
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                            : "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 focus:ring-orange-500 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/30"
                        }`}
                      >
                        {isUnblocking ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            Đang bỏ chặn...
                          </>
                        ) : (
                          <>
                            <FaBan className="h-4 w-4" />
                            Bỏ chặn
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {blockedUsersList.length === 0
                ? "Không có ai bị chặn"
                : blockedUsersList.length === 1
                ? "1 người bị chặn"
                : `${blockedUsersList.length} người bị chặn`}
            </span>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlockedUsersModalComponent;
