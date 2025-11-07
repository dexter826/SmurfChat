import React, { useContext, useState } from "react";
import UserInfo from "./UserInfo";
import UnifiedChatList from "./UnifiedChatList";
import { AuthContext } from "../../Context/AuthProvider";
import { AppContext } from "../../Context/AppProvider";
import { useUsers } from "../../Context/UserContext";
import { useAlert } from "../../Context/AlertProvider";
import useOptimizedFirestore from "../../hooks/useOptimizedFirestore";
import {
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriendship,
  createOrUpdateConversation,
  logoutUser,
} from "../../firebase/services";
import { isUserBlockedOptimized } from "../../firebase/utils/block.utils";

// Icon components
const ChevronDownIcon = ({ className = "h-4 w-4", ...props }) => (
  <svg
    className={`${className} transition-transform duration-200`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M6 9l6 6 6-6"
    />
  </svg>
);

const SearchIcon = ({ className = "h-4 w-4", ...props }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M11 4a7 7 0 104.899 11.899L20 20"
    />
  </svg>
);

const UserPlusIcon = ({ className = "h-4 w-4", ...props }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M15 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M5.5 20.5v-.75A5.75 5.75 0 0111.25 14h1.5A5.75 5.75 0 0118.5 19.75v.75"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M19.5 7.5v6m3-3h-6"
    />
  </svg>
);

const UserFriendsIcon = ({ className = "h-4 w-4", ...props }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <circle cx={12} cy={9} r={3} strokeWidth={1.8} />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M6 20.5v-.75A4.75 4.75 0 0110.75 15h2.5A4.75 4.75 0 0118 19.75v.75"
    />
    <circle cx={5.5} cy={9.5} r={2.5} strokeWidth={1.8} />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M3 20.5v-.75a3.5 3.5 0 012.5-3.37"
    />
    <circle cx={18.5} cy={9.5} r={2.5} strokeWidth={1.8} />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M21 20.5v-.75a3.5 3.5 0 00-2.5-3.37"
    />
  </svg>
);

const MailIcon = ({ className = "h-4 w-4", ...props }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <rect x={3} y={5} width={18} height={14} rx={2.25} strokeWidth={1.8} />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M4 7l8 5 8-5"
    />
  </svg>
);

const MessageCircleIcon = ({ className = "h-4 w-4", ...props }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M4.5 5.5h15a2 2 0 012 2v7a2 2 0 01-2 2H12l-4.5 3v-3h-3a2 2 0 01-2-2v-7a2 2 0 012-2z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"
    />
  </svg>
);

const LogOutIcon = ({ className = "h-4 w-4", ...props }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M15 16l4-4-4-4"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M19 12H9"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 19v1a3 3 0 01-3 3H7a3 3 0 01-3-3V4a3 3 0 013-3h2a3 3 0 013 3v1"
    />
  </svg>
);

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const {
    selectConversation,
    setChatType,
    clearState,
    setIsAddFriendVisible,
    setIsUserProfileVisible,
    setSelectedUser,
  } = useContext(AppContext);
  const { getUserById } = useUsers(); // Use optimized user lookup
  const { confirm } = useAlert();
  const isMountedRef = React.useRef(true);

  // Tab state
  const [activeTab, setActiveTab] = useState("conversations");
  const [friendSearchTerm, setFriendSearchTerm] = useState("");
  const [blockedUsers, setBlockedUsers] = useState(new Set()); // Track blocked users

  // Collapsible sections state
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    incoming: false,
    outgoing: false,
    friends: false,
  });

  // Incoming friend requests for current user
  const incomingReqsCondition = React.useMemo(
    () => ({
      fieldName: "to",
      operator: "==",
      compareValue: user?.uid,
    }),
    [user?.uid]
  );
  const { documents: incomingRequestsRaw } = useOptimizedFirestore(
    "friend_requests",
    incomingReqsCondition
  );
  const incomingRequests = incomingRequestsRaw.filter(
    (r) => r.status === "pending"
  );

  // Outgoing friend requests
  const outgoingReqsCondition = React.useMemo(
    () => ({
      fieldName: "from",
      operator: "==",
      compareValue: user?.uid,
    }),
    [user?.uid]
  );
  const { documents: outgoingRequestsRaw } = useOptimizedFirestore(
    "friend_requests",
    outgoingReqsCondition
  );
  const outgoingRequests = outgoingRequestsRaw.filter(
    (r) => r.status === "pending"
  );

  // Friends list (edges containing current user)
  const friendsCondition = React.useMemo(
    () => ({
      fieldName: "participants",
      operator: "array-contains",
      compareValue: user?.uid,
    }),
    [user?.uid]
  );
  const { documents: friendEdges } = useOptimizedFirestore(
    "friends",
    friendsCondition
  );

  // REMOVED: Duplicate user loading - now using UserContext
  // const allUsersCondition = React.useMemo(() => ({
  //   fieldName: 'uid',
  //   operator: '!=',
  //   compareValue: user?.uid,
  // }), [user?.uid]);
  // const allUsers = useFirestore('users', allUsersCondition);

  // REMOVED: Local getUserById - now using optimized version from UserContext
  // const getUserById = (uid) => allUsers.find(u => u.uid === uid);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load blocked users list
  React.useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!user?.uid || !friendEdges.length || !isMountedRef.current) return;

      const blocked = new Set();
      const checkPromises = friendEdges.map(async (edge) => {
        const otherId = edge.participants.find((id) => id !== user.uid);
        if (otherId && isMountedRef.current) {
          try {
            const isBlocked = await isUserBlockedOptimized(user.uid, otherId);
            if (isBlocked && isMountedRef.current) {
              blocked.add(otherId);
            }
          } catch (err) {
            console.error("Error checking block status:", err);
          }
        }
      });

      await Promise.all(checkPromises);
      if (isMountedRef.current) {
        setBlockedUsers(blocked);
      }
    };

    loadBlockedUsers();
  }, [user?.uid, friendEdges]);

  // Handler to open user profile
  const handleUserClick = (targetUser) => {
    if (targetUser && targetUser.uid !== user.uid) {
      setSelectedUser(targetUser);
      setIsUserProfileVisible(true);
    }
  };

  // Filter friends for friend search
  const filteredFriends = friendEdges.filter((edge) => {
    const otherId = (edge.participants || []).find((id) => id !== user.uid);
    const other = getUserById(otherId) || {};

    // Filter out blocked users
    if (blockedUsers.has(otherId)) {
      return false;
    }

    return (
      other.displayName
        ?.toLowerCase()
        .includes(friendSearchTerm.toLowerCase()) ||
      other.email?.toLowerCase().includes(friendSearchTerm.toLowerCase())
    );
  });

  const handleLogout = async () => {
    const confirmed = await confirm("Bạn có chắc chắn muốn đăng xuất?");
    if (confirmed) {
      await logoutUser();
      clearState && clearState();
    }
  };

  const toggleSection = (section) => {
    setSectionsCollapsed((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const TabButton = ({ active, onClick, children, count = 0 }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
        active
          ? "border-skybrand-500 text-skybrand-600 bg-skybrand-50 dark:bg-skybrand-900/20 dark:text-skybrand-400 dark:border-skybrand-400"
          : "border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
    >
      {children}
      {count > 0 && (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-skybrand-500 px-1.5 text-xs font-medium text-white">
          {count}
        </span>
      )}
    </button>
  );

  const SectionHeader = ({
    title,
    count = 0,
    icon: Icon,
    isCollapsed,
    onToggle,
    showBadge = false,
  }) => (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <div className="flex items-center gap-3">
        <Icon />
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </span>
        {showBadge && count > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-skybrand-500 px-1.5 text-xs font-medium text-white">
            {count}
          </span>
        )}
      </div>
      <div
        className={`transform transition-transform duration-200 ${
          isCollapsed ? "rotate-0" : "rotate-180"
        }`}
      >
        <ChevronDownIcon />
      </div>
    </button>
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

  const UserCard = ({
    user,
    description,
    actions,
    className = "",
    onClick,
    onAvatarClick,
  }) => (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${className}`}
      onClick={onClick}
    >
      <div
        className="relative cursor-pointer"
        onClick={(e) => {
          if (onAvatarClick) {
            e.stopPropagation(); // Prevent triggering the card's onClick
            onAvatarClick(user);
          }
        }}
        title="Xem hồ sơ"
      >
        <img
          className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-skybrand-400 transition-all duration-200"
          src={user?.photoURL || ""}
          alt="avatar"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
        <div
          className="hidden h-10 w-10 items-center justify-center rounded-full bg-skybrand-500 text-white ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-skybrand-400 transition-all duration-200"
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

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      {/* Header Section */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <UserInfo />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex">
          <TabButton
            active={activeTab === "conversations"}
            onClick={() => setActiveTab("conversations")}
          >
            <MessageCircleIcon />
            Cuộc trò chuyện
          </TabButton>
          <TabButton
            active={activeTab === "friends"}
            onClick={() => setActiveTab("friends")}
            count={incomingRequests.length + outgoingRequests.length}
          >
            <UserFriendsIcon />
            Bạn bè
          </TabButton>
        </div>
      </div>

      {/* Tab Content */}
      <div className="thin-scrollbar flex-1 overflow-y-auto">
        {activeTab === "conversations" && (
          <div className="py-2">
            <UnifiedChatList />
          </div>
        )}

        {activeTab === "friends" && (
          <>
            {/* Friend Search */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm kiếm bạn bè..."
                    value={friendSearchTerm}
                    onChange={(e) => setFriendSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={() => setIsAddFriendVisible(true)}
                  className="flex items-center justify-center rounded-lg bg-skybrand-500 p-2.5 text-white transition-all duration-200 hover:bg-skybrand-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 active:scale-95"
                  title="Kết bạn mới"
                >
                  <UserPlusIcon />
                </button>
              </div>
            </div>

            {/* Incoming Friend Requests */}
            {incomingRequests.length > 0 && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <SectionHeader
                  title="Lời mời kết bạn"
                  count={incomingRequests.length}
                  icon={MailIcon}
                  isCollapsed={sectionsCollapsed.incoming}
                  onToggle={() => toggleSection("incoming")}
                  showBadge={true}
                />
                {!sectionsCollapsed.incoming && (
                  <div className="space-y-2 px-2 pb-3">
                    {incomingRequests.map((req) => {
                      const fromUser = getUserById(req.from);
                      return (
                        <UserCard
                          key={req.id}
                          user={fromUser}
                          description="đã gửi lời mời kết bạn"
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          onAvatarClick={handleUserClick}
                          actions={
                            <>
                              <ActionButton
                                variant="primary"
                                onClick={async () => {
                                  try {
                                    await acceptFriendRequest(req.id, user.uid);
                                    const otherId = req.from;
                                    const conversationId = [user.uid, otherId]
                                      .sort()
                                      .join("_");
                                    await createOrUpdateConversation({
                                      id: conversationId,
                                      participants: [user.uid, otherId],
                                      type: "direct",
                                      lastMessage: "",
                                      lastMessageAt: null,
                                      createdBy: user.uid,
                                    });
                                    setChatType && setChatType("direct");
                                    selectConversation(conversationId);
                                  } catch (err) {
                                    console.error(
                                      "Error accepting friend request:",
                                      err
                                    );
                                    // Note: Sidebar doesn't have access to alert context,
                                    // so we'll just log the error for now
                                  }
                                }}
                              >
                                Chấp nhận
                              </ActionButton>
                              <ActionButton
                                variant="secondary"
                                onClick={async () => {
                                  await declineFriendRequest(req.id, user.uid);
                                }}
                              >
                                Từ chối
                              </ActionButton>
                            </>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Outgoing Friend Requests */}
            {outgoingRequests.length > 0 && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <SectionHeader
                  title="Lời mời đã gửi"
                  count={outgoingRequests.length}
                  icon={MailIcon}
                  isCollapsed={sectionsCollapsed.outgoing}
                  onToggle={() => toggleSection("outgoing")}
                  showBadge={true}
                />
                {!sectionsCollapsed.outgoing && (
                  <div className="space-y-1 pb-3">
                    {outgoingRequests.map((req) => {
                      const toUser = getUserById(req.to);
                      return (
                        <UserCard
                          key={req.id}
                          user={toUser}
                          description="đang chờ chấp nhận"
                          onAvatarClick={handleUserClick}
                          actions={
                            <ActionButton
                              variant="secondary"
                              onClick={async () => {
                                await cancelFriendRequest(req.id, user.uid);
                              }}
                            >
                              Hủy lời mời
                            </ActionButton>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Friends List */}
            <div>
              <SectionHeader
                title="Danh sách bạn bè"
                count={filteredFriends.length}
                icon={UserFriendsIcon}
                isCollapsed={sectionsCollapsed.friends}
                onToggle={() => toggleSection("friends")}
                showBadge={false}
              />
              {!sectionsCollapsed.friends && (
                <div className="space-y-1 px-2 pb-3">
                  {filteredFriends.map((edge) => {
                    const otherId = (edge.participants || []).find(
                      (id) => id !== user.uid
                    );
                    const other = getUserById(otherId) || {};
                    return (
                      <UserCard
                        key={edge.id || otherId}
                        user={other}
                        description="Bạn bè"
                        className="hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 cursor-pointer"
                        onAvatarClick={handleUserClick}
                        onClick={async () => {
                          try {
                            // Open chat with friend
                            const conversationId = [user.uid, otherId]
                              .sort()
                              .join("_");
                            await createOrUpdateConversation({
                              id: conversationId,
                              participants: [user.uid, otherId],
                              participantDetails: {
                                [user.uid]: {
                                  displayName: user.displayName,
                                  email: user.email,
                                  photoURL: user.photoURL,
                                },
                                [otherId]: {
                                  displayName: other.displayName,
                                  email: other.email,
                                  photoURL: other.photoURL,
                                },
                              },
                              type: "direct",
                              lastMessage: "",
                              lastMessageAt: null,
                              createdBy: user.uid,
                            });
                            setChatType("direct");
                            selectConversation(conversationId);
                          } catch (err) {
                            console.error("Error creating conversation:", err);
                            // Note: This component doesn't have access to alert context
                          }
                        }}
                        actions={
                          <ActionButton
                            variant="secondary"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const confirmed = await confirm(
                                "Bạn có chắc muốn hủy kết bạn?"
                              );
                              if (confirmed) {
                                await removeFriendship(user.uid, otherId);
                              }
                            }}
                          >
                            Hủy kết bạn
                          </ActionButton>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Empty State */}
            {incomingRequests.length === 0 &&
              outgoingRequests.length === 0 &&
              friendEdges.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                    <UserFriendsIcon />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Chưa có bạn bè
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Hãy bắt đầu kết nối bằng cách gửi lời mời kết bạn
                  </p>
                </div>
              )}
          </>
        )}
      </div>

      {/* Footer with Logout */}
      <div className="border-t border-slate-200 bg-white/95 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <ActionButton
          variant="ghost"
          size="md"
          onClick={handleLogout}
          className="w-full justify-center gap-2 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 dark:hover:bg-rose-900/20 dark:hover:border-rose-700 dark:hover:text-rose-400"
        >
          <LogOutIcon />
          Đăng xuất
        </ActionButton>
      </div>
    </div>
  );
}
