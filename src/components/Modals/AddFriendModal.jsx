import React, { useContext } from "react";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import { sendFriendRequest } from "../../firebase/services";
import { useUserSearch } from "../../hooks/useUserSearch";

const SearchIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

export default function AddFriendModal() {
  const { isAddFriendVisible, setIsAddFriendVisible } = useContext(AppContext);
  const { user } = useContext(AuthContext);

  // Use useUserSearch hook for non-friends search
  const {
    searchTerm,
    searchResults,
    nonFriends,
    incomingRequests,
    outgoingRequests,
    friendIds,
    handleSearchChange,
    clearSearch
  } = useUserSearch({ 
    searchType: 'non-friends', 
    excludeBlocked: true 
  });

  // Use search results when there's a search term, otherwise show non-friends
  const displayedUsers = searchTerm ? searchResults : nonFriends;

  const ActionButton = ({
    onClick,
    variant = "primary",
    children,
    size = "sm",
    className = "",
  }) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1";
    const variants = {
      primary:
        "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
      secondary: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
      ghost:
        "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
    };

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      >
        {children}
      </button>
    );
  };

  const UserCard = ({ user, description, actions, className = "" }) => (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${className}`}
    >
      <div className="relative">
        <img
          className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
          src={user?.photoURL || ""}
          alt="avatar"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
        <div
          className="hidden h-10 w-10 items-center justify-center rounded-full bg-skybrand-500 text-white ring-2 ring-slate-200 dark:ring-slate-700"
          style={{ display: "none" }}
        >
          {user?.displayName?.charAt(0)?.toUpperCase() || "?"}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {user?.displayName || user?.email || "Người dùng không xác định"}
        </div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          {description}
        </div>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );

  const handleCancel = () => {
    setIsAddFriendVisible(false);
    clearSearch();
  };

  if (!isAddFriendVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div className="relative z-10 w-full max-w-md mx-auto rounded-lg border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-slate-900 max-h-[90vh] overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Kết bạn
          </h3>
          <button
            onClick={handleCancel}
            className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 transition-all duration-200"
              autoFocus
            />
          </div>
        </div>

        <div className="thin-scrollbar max-h-80 overflow-y-auto">
          {searchTerm &&
            displayedUsers.slice(0, 10).map((searchUser) => {
              const hasOutgoingRequest = outgoingRequests.some(
                (req) => req.to === searchUser.uid
              );
              const hasIncomingRequest = incomingRequests.some(
                (req) => req.from === searchUser.uid
              );
              const isFriend = friendIds.includes(searchUser.uid);

              return (
                <UserCard
                  key={searchUser.uid}
                  user={searchUser}
                  description={
                    isFriend
                      ? "Đã là bạn bè"
                      : hasOutgoingRequest
                      ? "Đã gửi lời mời"
                      : hasIncomingRequest
                      ? "Đã nhận lời mời"
                      : searchUser.email || "Người dùng"
                  }
                  actions={
                    !isFriend &&
                    !hasOutgoingRequest &&
                    !hasIncomingRequest && (
                      <ActionButton
                        variant="primary"
                        onClick={async () => {
                          await sendFriendRequest(user.uid, searchUser.uid);
                          clearSearch();
                        }}
                      >
                        Kết bạn
                      </ActionButton>
                    )
                  }
                />
              );
            })}
          {searchTerm && displayedUsers.length === 0 && (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">
              Không tìm thấy người dùng nào
            </div>
          )}
          {!searchTerm && (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">
              Nhập tên hoặc email để tìm kiếm người dùng
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
