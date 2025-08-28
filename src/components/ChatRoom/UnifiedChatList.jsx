import React, { useContext, useState } from "react";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import useFirestore from "../../hooks/useFirestore";
import {
  deleteConversation,
  togglePinChat,
  dissolveRoom,
  updateLastSeen,
} from "../../firebase/services";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

// Icon components
const PinIcon = () => (
  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

const MuteIcon = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
  </svg>
);

const MoreIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const GroupIcon = () => (
  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
  </svg>
);

export default function UnifiedChatList() {
  const {
    rooms,
    conversations,
    selectedRoomId,
    selectedConversationId,
    selectRoom,
    selectConversation,
  } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Get all users for conversation lookup
  const allUsersCondition = React.useMemo(
    () => ({
      fieldName: "uid",
      operator: "!=",
      compareValue: user.uid,
    }),
    [user.uid]
  );

  const allUsers = useFirestore("users", allUsersCondition);

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
      try {
        window.alert(
          isPinned ? "Đã bỏ ghim cuộc trò chuyện" : "Đã ghim cuộc trò chuyện"
        );
      } catch {}
    } catch (error) {
      console.error("Error toggling pin:", error);
      try {
        window.alert("Có lỗi xảy ra khi ghim/bỏ ghim");
      } catch {}
    }
  };

  const handleDeleteChat = async (chatId, isConversation) => {
    try {
      if (isConversation) {
        await deleteConversation(chatId);
        try {
          window.alert("Đã xóa cuộc trò chuyện");
        } catch {}
      } else {
        await dissolveRoom(chatId);
        try {
          window.alert("Đã xóa phòng chat");
        } catch {}
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      try {
        window.alert("Có lỗi xảy ra khi xóa");
      } catch {}
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
      try {
        window.alert(
          !current
            ? "Đã tắt thông báo cuộc trò chuyện"
            : "Đã bật thông báo cuộc trò chuyện"
        );
      } catch {}
    } catch (error) {
      console.error("Error toggling mute:", error);
      try {
        window.alert("Có lỗi xảy ra khi tắt/bật thông báo");
      } catch {}
    }
  };

  // Combine rooms and conversations into a single list
  const allChats = React.useMemo(() => {
    const getOtherParticipant = (conversation) => {
      const otherUid = conversation.participants.find(
        (uid) => uid !== user.uid
      );
      return (
        allUsers.find((u) => u.uid === otherUid) || {
          displayName: "Unknown User",
          photoURL: "",
        }
      );
    };

    const roomItems = rooms.map((room) => ({
      ...room,
      type: "room",
      displayName: room.name,
      description: room.description,
      avatar: room.avatar,
      isSelected: selectedRoomId === room.id,
      isMuted: !!(room.mutedBy && room.mutedBy[user.uid]),
      hasUnread: !!(
        room.lastSeen &&
        room.lastSeen[user.uid] &&
        room.lastMessageAt &&
        (room.lastMessageAt?.toDate
          ? room.lastMessageAt.toDate()
          : new Date(room.lastMessageAt)) >
          (room.lastSeen[user.uid]?.toDate
            ? room.lastSeen[user.uid].toDate()
            : new Date(room.lastSeen[user.uid]))
      ),
      isPinned: room.pinned || false,
    }));

    const conversationItems = conversations.map((conversation) => {
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
          conversation.lastSeen &&
          conversation.lastSeen[user.uid] &&
          conversation.lastMessageAt &&
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
    allUsers,
    user.uid,
  ]);

  return (
    <div className="space-y-1">
      {allChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800 mb-3">
            <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.476L3 21l2.476-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">Chưa có cuộc trò chuyện</h3>
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
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`${chat.avatar ? 'hidden' : 'flex'} h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-skybrand-500 to-skybrand-600 text-white ring-2 ring-slate-200 dark:ring-slate-700 font-semibold user-avatar`}
                >
                  {chat.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                
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
                      
                      <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                      
                      <button
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          if (window.confirm(`Bạn có chắc muốn xóa ${chat.type === "room" ? "phòng chat" : "cuộc trò chuyện"} này?`)) {
                            handleDeleteChat(chat.id, chat.type === "conversation");
                          }
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {chat.type === "room" ? "Xóa phòng chat" : "Xóa cuộc trò chuyện"}
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
