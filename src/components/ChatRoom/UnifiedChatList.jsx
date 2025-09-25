import React, { useContext, useState } from "react";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import { useAlert } from "../../Context/AlertProvider";
import { useUsers } from "../../Context/UserContext";
import { useUserOnlineStatus } from "../../hooks/useOnlineStatus";
import {
  deleteConversation,
  togglePinChat,
  dissolveRoom,
  updateLastSeen,
  blockUser,
  unblockUser,
  archiveChat,
  unarchiveChat,
  isChatArchived,
} from "../../firebase/services";
import { isUserBlockedOptimized } from "../../firebase/utils/block.utils";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  or,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { clearBlockCache } from "../../firebase/utils/block.utils";

// Icon components
const PinIcon = () => (
  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
      clipRule="evenodd"
    />
  </svg>
);

const MuteIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
    />
  </svg>
);

const MoreIcon = () => (
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
      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
    />
  </svg>
);

const GroupIcon = () => (
  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
  </svg>
);

const BlockIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
    />
    <circle
      cx="12"
      cy="12"
      r="9"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

const ArchiveIcon = () => (
  <svg
    className="h-3 w-3"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
    />
  </svg>
);

const OnlineStatusIndicator = ({ userId }) => {
  const { isOnline } = useUserOnlineStatus(userId);

  return (
    <div
      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 transition-colors duration-200 ${
        isOnline ? "bg-emerald-500" : "bg-slate-400"
      }`}
      title={isOnline ? "Đang hoạt động" : "Không hoạt động"}
    ></div>
  );
};

export default function UnifiedChatList() {
  const {
    rooms,
    conversations,
    selectedRoomId,
    selectedConversationId,
    selectRoom,
    selectConversation,
    setSelectedRoomId,
    setSelectedConversationId,
    archivedChatsRefreshTrigger,
  } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const { success, error, confirm } = useAlert();
  const { getOtherParticipant } = useUsers(); // Use optimized user lookup
  const [openMenuId, setOpenMenuId] = useState(null);
  const [blockStatus, setBlockStatus] = useState({}); // Track block status for each conversation
  const [archivedStatus, setArchivedStatus] = useState({}); // Track archived status for each chat

  // REMOVED: Duplicate user loading - now using UserContext
  // const allUsersCondition = React.useMemo(
  //   () => ({
  //     fieldName: "uid",
  //     operator: "!=",
  //     compareValue: user.uid,
  //   }),
  //   [user.uid]
  // );
  // const allUsers = useFirestore("users", allUsersCondition);

  // Check block status for a conversation participant
  const checkBlockStatus = React.useCallback(
    async (conversationId, otherUserId) => {
      try {
        const blocked = await isUserBlockedOptimized(user.uid, otherUserId);
        setBlockStatus((prev) => ({
          ...prev,
          [conversationId]: blocked,
        }));
        return blocked;
      } catch (err) {
        console.error("Error checking block status:", err);
        return false;
      }
    },
    [user.uid]
  );

  // Check block status for all conversations when component mounts or conversations change
  React.useEffect(() => {
    const checkAllBlockStatuses = async () => {
      if (!user?.uid || !conversations.length) return;

      const statusChecks = conversations.map(async (conversation) => {
        const otherUserId = conversation.participants.find(
          (uid) => uid !== user.uid
        );
        if (otherUserId) {
          const blocked = await checkBlockStatus(conversation.id, otherUserId);
          return { conversationId: conversation.id, blocked };
        }
        return null;
      });

      const results = await Promise.all(statusChecks);
      const newBlockStatus = {};
      results.forEach((result) => {
        if (result) {
          newBlockStatus[result.conversationId] = result.blocked;
        }
      });

      setBlockStatus(newBlockStatus);
    };

    checkAllBlockStatuses();
  }, [conversations, user?.uid, checkBlockStatus]);

  // Check archived status for all chats when component mounts or chats change
  React.useEffect(() => {
    const checkAllArchivedStatuses = async () => {
      if (!user?.uid || (!rooms.length && !conversations.length)) return;

      const allChats = [...rooms, ...conversations];
      const statusChecks = allChats.map(async (chat) => {
        const archived = await isChatArchived(chat.id, user.uid);
        return { chatId: chat.id, archived };
      });

      const results = await Promise.all(statusChecks);
      const newArchivedStatus = {};
      results.forEach((result) => {
        newArchivedStatus[result.chatId] = result.archived;
      });

      setArchivedStatus(newArchivedStatus);
    };

    checkAllArchivedStatuses();
  }, [rooms, conversations, user?.uid, archivedChatsRefreshTrigger]);

  // Real-time listener for block status changes
  React.useEffect(() => {
    if (!user?.uid) return;

    const blockedUsersRef = collection(db, "blocked_users");

    // Listen for block changes involving current user
    const q = query(
      blockedUsersRef,
      or(where("blocker", "==", user.uid), where("blocked", "==", user.uid))
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        // Clear cache when changes occur
        clearBlockCache(user.uid);

        // Re-check block status for all conversations
        if (conversations.length > 0) {
          const statusChecks = conversations.map(async (conversation) => {
            const otherUserId = conversation.participants.find(
              (uid) => uid !== user.uid
            );
            if (otherUserId) {
              const blocked = await isUserBlockedOptimized(
                user.uid,
                otherUserId
              );
              return { conversationId: conversation.id, blocked };
            }
            return null;
          });

          const results = await Promise.all(statusChecks);
          const newBlockStatus = {};
          results.forEach((result) => {
            if (result) {
              newBlockStatus[result.conversationId] = result.blocked;
            }
          });

          setBlockStatus(newBlockStatus);
        }
      },
      (error) => {
        console.error("Error listening to block changes in chat list:", error);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user?.uid, conversations]);

  const handleRoomClick = async (roomId) => {
    selectRoom(roomId);
    try {
      await updateLastSeen(roomId, user.uid, false);
    } catch (e) {
      console.error("Error updating room last seen:", e);
    }
  };

  const handleConversationClick = async (conversationId) => {
    selectConversation(conversationId);
    try {
      await updateLastSeen(conversationId, user.uid, true);
    } catch (e) {
      console.error("Error updating conversation last seen:", e);
    }
  };

  const handlePinChat = async (chatId, isPinned, isConversation) => {
    try {
      await togglePinChat(chatId, isPinned, isConversation);
      success(
        isPinned ? "Đã bỏ ghim cuộc trò chuyện" : "Đã ghim cuộc trò chuyện"
      );
    } catch (err) {
      console.error("Error toggling pin:", err);
      error("Có lỗi xảy ra khi ghim/bỏ ghim");
    }
  };

  const handleDeleteChat = async (chatId, isConversation) => {
    try {
      if (isConversation) {
        // Clear selected conversation if it's the one being deleted
        if (selectedConversationId === chatId) {
          setSelectedConversationId("");
        }
        await deleteConversation(chatId);
        success("Đã xóa cuộc trò chuyện");
      } else {
        // Clear selected room if it's the one being deleted
        if (selectedRoomId === chatId) {
          setSelectedRoomId("");
        }
        await dissolveRoom(chatId);
        success("Đã xóa phòng chat");
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
      error("Có lỗi xảy ra khi xóa");
    }
  };

  const handleToggleMute = async (chat, isConversation) => {
    try {
      const collectionName = isConversation ? "conversations" : "rooms";
      const ref = doc(db, collectionName, chat.id);
      const current = !!(chat.mutedBy && chat.mutedBy[user.uid]);
      await updateDoc(ref, {
        [`mutedBy.${user.uid}`]: !current,
      });
      success(
        !current
          ? "Đã tắt thông báo cuộc trò chuyện"
          : "Đã bật thông báo cuộc trò chuyện"
      );
    } catch (err) {
      console.error("Error toggling mute:", err);
      error("Có lỗi xảy ra khi tắt/bật thông báo");
    }
  };

  // Handle block/unblock user in conversation
  const handleToggleBlock = async (conversation, otherUser) => {
    const isBlocked = blockStatus[conversation.id];
    const actionText = isBlocked ? "bỏ chặn" : "chặn";

    const confirmed = await confirm(
      `Bạn có chắc muốn ${actionText} ${otherUser.displayName}?`
    );

    if (!confirmed) return;

    try {
      if (isBlocked) {
        await unblockUser(user.uid, otherUser.uid);
        setBlockStatus((prev) => ({
          ...prev,
          [conversation.id]: false,
        }));
        success(`Đã bỏ chặn ${otherUser.displayName}`);
      } else {
        await blockUser(user.uid, otherUser.uid);
        setBlockStatus((prev) => ({
          ...prev,
          [conversation.id]: true,
        }));
        success(`Đã chặn ${otherUser.displayName}`);
      }
    } catch (err) {
      console.error("Error toggling block:", err);
      error(err.message || `Không thể ${actionText} người dùng`);
    }
  };

  // Handle archive/unarchive chat
  const handleArchiveChat = async (chatId, isConversation) => {
    const isArchived = archivedStatus[chatId];
    try {
      if (isArchived) {
        await unarchiveChat(chatId, user.uid);
        setArchivedStatus((prev) => ({
          ...prev,
          [chatId]: false,
        }));
        success("Đã bỏ lưu trữ đoạn chat");
      } else {
        await archiveChat(chatId, isConversation, user.uid);
        setArchivedStatus((prev) => ({
          ...prev,
          [chatId]: true,
        }));
        success("Đã lưu trữ đoạn chat");
      }
    } catch (err) {
      console.error("Error toggling archive:", err);
      error("Không thể thay đổi trạng thái lưu trữ");
    }
  };

  // Combine rooms and conversations into a single list
  const allChats = React.useMemo(() => {
    // Use optimized getOtherParticipant from UserContext instead of local function

    const roomItems = rooms
      .filter((room) => !archivedStatus[room.id]) // Filter out archived rooms
      .map((room) => ({
        ...room,
        type: "room",
        displayName: room.name,
        description: room.lastMessage || "Chưa có tin nhắn",
        avatar: room.avatar,
        isSelected: selectedRoomId === room.id,
        isMuted: !!(room.mutedBy && room.mutedBy[user.uid]),
        hasUnread: !!(
          room.lastMessageAt &&
          room.lastSeen &&
          room.lastSeen[user.uid] &&
          room.lastMessage &&
          room.lastMessage.trim() !== "" &&
          (room.lastMessageAt?.toDate
            ? room.lastMessageAt.toDate()
            : new Date(room.lastMessageAt)) >
            (room.lastSeen[user.uid]?.toDate
              ? room.lastSeen[user.uid].toDate()
              : new Date(room.lastSeen[user.uid]))
        ),
        isPinned: room.pinned || false,
      }));

    const conversationItems = conversations
      .filter((conversation) => {
        // Filter out conversations with blocked users or archived chats
        return (
          !blockStatus[conversation.id] && !archivedStatus[conversation.id]
        ); // Hide if the other user is blocked or chat is archived
      })
      .map((conversation) => {
        const otherUser = getOtherParticipant(conversation);
        return {
          ...conversation,
          type: "conversation",
          displayName: otherUser.displayName,
          description: conversation.lastMessage || "Chưa có tin nhắn",
          avatar: otherUser.photoURL,
          isSelected: selectedConversationId === conversation.id,
          otherUser,
          isMuted: !!(conversation.mutedBy && conversation.mutedBy[user.uid]),
          hasUnread: !!(
            conversation.lastMessageAt &&
            conversation.lastSeen &&
            conversation.lastSeen[user.uid] &&
            conversation.lastMessage &&
            conversation.lastMessage.trim() !== "" &&
            (conversation.lastMessageAt?.toDate
              ? conversation.lastMessageAt.toDate()
              : new Date(conversation.lastMessageAt)) >
              (conversation.lastSeen[user.uid]?.toDate
                ? conversation.lastSeen[user.uid].toDate()
                : new Date(conversation.lastSeen[user.uid]))
          ),
          isPinned: conversation.pinned || false,
        };
      });

    // Sort by pinned first, then by last activity
    return [...roomItems, ...conversationItems].sort((a, b) => {
      // Pinned items first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then by last activity or creation date
      const normalize = (t) =>
        t?.toDate ? t.toDate() : t ? new Date(t) : new Date(0);
      const aTime = normalize(a.lastMessageAt) || normalize(a.createdAt);
      const bTime = normalize(b.lastMessageAt) || normalize(b.createdAt);
      return bTime - aTime;
    });
  }, [
    rooms,
    conversations,
    selectedRoomId,
    selectedConversationId,
    getOtherParticipant, // Use optimized function from UserContext
    user.uid,
    blockStatus,
    archivedStatus,
  ]);

  return (
    <div className="space-y-1">
      {allChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800 mb-3">
            <svg
              className="h-6 w-6 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.476L3 21l2.476-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">
            Chưa có cuộc trò chuyện
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hãy bắt đầu tạo phòng chat hoặc gửi tin nhắn
          </p>
        </div>
      ) : (
        allChats.map((chat) => {
          const isSelected = chat.isSelected;
          const isOpen = openMenuId === chat.id;
          return (
            <div
              key={`${chat.type}-${chat.id}`}
              className={`group relative flex cursor-pointer items-center rounded-lg mx-3 px-3 py-3 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 ${
                isSelected
                  ? "bg-skybrand-50 dark:bg-skybrand-900/20 border-l-4 border-skybrand-500"
                  : "border-l-4 border-transparent"
              }`}
              onClick={(e) => {
                if (e.target.closest && e.target.closest(".chat-menu")) return;
                // Prevent duplicate clicks
                if (e.detail > 1) return;
                if (chat.type === "room") {
                  handleRoomClick(chat.id);
                } else {
                  handleConversationClick(chat.id);
                }
              }}
            >
              {/* Avatar with online status */}
              <div className="relative mr-3 flex-shrink-0">
                {chat.avatar ? (
                  <img
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 user-avatar"
                    src={chat.avatar}
                    alt="avatar"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`${
                    chat.avatar ? "hidden" : "flex"
                  } h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-skybrand-500 to-skybrand-600 text-white ring-2 ring-slate-200 dark:ring-slate-700 font-semibold user-avatar`}
                >
                  {chat.displayName?.charAt(0)?.toUpperCase() || "?"}
                </div>

                {/* Online status indicator for conversations */}
                {chat.type === "conversation" && (
                  <OnlineStatusIndicator userId={chat.otherUser?.uid} />
                )}

                {/* Unread indicator */}
                {chat.hasUnread && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-skybrand-500 ring-2 ring-white dark:ring-slate-900 notification-badge"></div>
                )}
              </div>

              {/* Chat info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p
                    className={`truncate text-sm flex-1 ${
                      chat.hasUnread
                        ? "font-bold text-slate-900 dark:text-slate-100"
                        : "font-medium text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {chat.displayName}
                  </p>

                  {/* Status indicators */}
                  <div className="flex items-center gap-1">
                    {chat.isPinned && (
                      <div className="text-yellow-500" title="Đã ghim">
                        <PinIcon />
                      </div>
                    )}
                    {chat.isMuted && (
                      <div className="text-slate-400" title="Đã tắt thông báo">
                        <MuteIcon />
                      </div>
                    )}
                    {archivedStatus[chat.id] && (
                      <div className="text-slate-400" title="Đã lưu trữ">
                        <ArchiveIcon />
                      </div>
                    )}
                    {chat.type === "room" && (
                      <div className="flex items-center gap-1 rounded-full bg-skybrand-100 px-2 py-0.5 text-skybrand-700 dark:bg-skybrand-900/30 dark:text-skybrand-300">
                        <GroupIcon />
                        <span className="text-[10px] font-medium">Nhóm</span>
                      </div>
                    )}
                  </div>
                </div>

                <p
                  className={`truncate text-xs leading-tight ${
                    chat.hasUnread
                      ? "font-medium text-slate-700 dark:text-slate-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {(() => {
                    const typingMap = chat.typingStatus;
                    const someoneElseTyping =
                      typingMap &&
                      Object.entries(typingMap).some(
                        ([k, v]) => k !== user.uid && v
                      );
                    if (someoneElseTyping) {
                      return (
                        <span className="italic text-skybrand-600 dark:text-skybrand-400">
                          Đang nhập...
                        </span>
                      );
                    }
                    return chat.description || "Chưa có tin nhắn";
                  })()}
                </p>
              </div>

              {/* Actions menu */}
              <div className="chat-menu ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-skybrand-500 focus:ring-offset-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(isOpen ? null : chat.id);
                  }}
                  title="Tùy chọn"
                >
                  <MoreIcon />
                </button>

                {isOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 py-1">
                      <button
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handlePinChat(
                            chat.id,
                            chat.isPinned,
                            chat.type === "conversation"
                          );
                        }}
                      >
                        <PinIcon />
                        {chat.isPinned ? "Bỏ ghim" : "Ghim cuộc trò chuyện"}
                      </button>

                      <button
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleToggleMute(chat, chat.type === "conversation");
                        }}
                      >
                        <MuteIcon />
                        {chat.isMuted ? "Bật thông báo" : "Tắt thông báo"}
                      </button>

                      {/* Archive chat option */}
                      <button
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleArchiveChat(
                            chat.id,
                            chat.type === "conversation"
                          );
                        }}
                      >
                        <ArchiveIcon />
                        {archivedStatus[chat.id]
                          ? "Bỏ lưu trữ"
                          : "Lưu trữ đoạn chat"}
                      </button>

                      {/* Block/Unblock option - only for direct conversations */}
                      {chat.type === "conversation" && (
                        <button
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20 transition-colors duration-150"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            const otherUser = getOtherParticipant(chat);
                            if (otherUser) {
                              handleToggleBlock(chat, otherUser);
                            }
                          }}
                        >
                          <BlockIcon />
                          {blockStatus[chat.id] ? "Bỏ chặn" : "Chặn người dùng"}
                        </button>
                      )}

                      <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>

                      <button
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors duration-150"
                        onClick={async () => {
                          const confirmed = await confirm(
                            `Bạn có chắc muốn xóa ${
                              chat.type === "room"
                                ? "phòng chat"
                                : "cuộc trò chuyện"
                            } này?`
                          );
                          if (confirmed) {
                            handleDeleteChat(
                              chat.id,
                              chat.type === "conversation"
                            );
                          }
                        }}
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        {chat.type === "room"
                          ? "Xóa phòng chat"
                          : "Xóa cuộc trò chuyện"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
