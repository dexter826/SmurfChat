import React, { useState, useContext } from "react";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import { sendFriendRequest, isUserBlocked } from "../../firebase/services";
import useFirestore from "../../hooks/useFirestore";

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
  const [publicSearchTerm, setPublicSearchTerm] = useState("");
  const [blockedUsers, setBlockedUsers] = useState(new Set());

  // Incoming friend requests for current user
  const incomingReqsCondition = React.useMemo(
    () => ({
      fieldName: "to",
      operator: "==",
      compareValue: user?.uid,
    }),
    [user?.uid]
  );
  const incomingRequests = useFirestore(
    "friend_requests",
    incomingReqsCondition
  ).filter((r) => r.status === "pending");

  // Outgoing friend requests
  const outgoingReqsCondition = React.useMemo(
    () => ({
      fieldName: "from",
      operator: "==",
      compareValue: user?.uid,
    }),
    [user?.uid]
  );
  const outgoingRequests = useFirestore(
    "friend_requests",
    outgoingReqsCondition
  ).filter((r) => r.status === "pending");

  // Friends list (edges containing current user)
  const friendsCondition = React.useMemo(
    () => ({
      fieldName: "participants",
      operator: "array-contains",
      compareValue: user?.uid,
    }),
    [user?.uid]
  );
  const friendEdges = useFirestore("friends", friendsCondition);

  // Fetch all users (to resolve names)
  const allUsersCondition = React.useMemo(
    () => ({
      fieldName: "uid",
      operator: "!=",
      compareValue: user?.uid,
    }),
    [user?.uid]
  );
  const allUsers = useFirestore("users", allUsersCondition);

  // Load blocked users when modal opens
  React.useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!user?.uid || !isAddFriendVisible) return;

      const blocked = new Set();
      const checkPromises = allUsers.map(async (otherUser) => {
        try {
          const isBlocked = await isUserBlocked(user.uid, otherUser.uid);
          if (isBlocked) {
            blocked.add(otherUser.uid);
          }
        } catch (err) {
          console.error('Error checking block status:', err);
        }
      });

      await Promise.all(checkPromises);
      setBlockedUsers(blocked);
    };

    loadBlockedUsers();
  }, [user?.uid, isAddFriendVisible, allUsers]);

  // Filter users for public search
  const publicUsers = allUsers.filter(
    (u) => {
      // Filter out blocked users
      if (blockedUsers.has(u.uid)) {
        return false;
      }
      
      return u.displayName?.toLowerCase().includes(publicSearchTerm.toLowerCase()) ||
             u.email?.toLowerCase().includes(publicSearchTerm.toLowerCase());
    }
  );

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
          {user?.displayName || "Người dùng không xác định"}
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
    setPublicSearchTerm("");
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
              value={publicSearchTerm}
              onChange={(e) => setPublicSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 transition-all duration-200"
              autoFocus
            />
          </div>
        </div>

        <div className="thin-scrollbar max-h-80 overflow-y-auto">
          {publicSearchTerm &&
            publicUsers.slice(0, 10).map((searchUser) => {
              const hasOutgoingRequest = outgoingRequests.some(
                (req) => req.to === searchUser.uid
              );
              const hasIncomingRequest = incomingRequests.some(
                (req) => req.from === searchUser.uid
              );
              const isFriend = friendEdges.some((edge) =>
                edge.participants?.includes(searchUser.uid)
              );

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
                      : "Người dùng"
                  }
                  actions={
                    !isFriend &&
                    !hasOutgoingRequest &&
                    !hasIncomingRequest && (
                      <ActionButton
                        variant="primary"
                        onClick={async () => {
                          await sendFriendRequest(user.uid, searchUser.uid);
                          setPublicSearchTerm("");
                        }}
                      >
                        Kết bạn
                      </ActionButton>
                    )
                  }
                />
              );
            })}
          {publicSearchTerm && publicUsers.length === 0 && (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">
              Không tìm thấy người dùng nào
            </div>
          )}
          {!publicSearchTerm && (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">
              Nhập tên hoặc email để tìm kiếm người dùng
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
