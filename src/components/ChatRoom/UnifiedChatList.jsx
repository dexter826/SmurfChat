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
    <div className="py-4">
      <div className="space-y-1">
        {allChats.map((chat) => {
          const isSelected = chat.isSelected;
          const isOpen = openMenuId === chat.id;
          return (
            <div
              key={`${chat.type}-${chat.id}`}
              className={`relative flex cursor-pointer items-center rounded-md px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                isSelected ? "bg-slate-100 dark:bg-slate-800" : ""
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
              {chat.isPinned && (
                <span
                  className="absolute right-2 top-1 text-xs"
                  title="Đã ghim"
                >
                  📌
                </span>
              )}

              <div className="mr-3 h-10 w-10 flex-shrink-0">
                {chat.avatar ? (
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={chat.avatar}
                    alt="avatar"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skybrand-600 text-white">
                    {chat.displayName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${
                    chat.hasUnread
                      ? "font-bold text-skybrand-600"
                      : "font-medium"
                  }`}
                >
                  {chat.displayName}
                  {chat.isMuted && (
                    <span className="ml-2 text-xs text-slate-500">🔕</span>
                  )}
                  {chat.type === "room" && (
                    <span className="ml-2 rounded-full bg-skybrand-500 px-2 py-0.5 text-[10px] text-white">
                      Nhóm
                    </span>
                  )}
                </p>
                <p
                  className={`truncate text-xs ${
                    chat.hasUnread
                      ? "font-semibold text-skybrand-600"
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
                    if (someoneElseTyping) return "Đang nhập...";
                    return chat.description;
                  })()}
                </p>
              </div>

              <div className="chat-menu ml-3">
                <button
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(isOpen ? null : chat.id);
                  }}
                >
                  ⋯
                </button>
                {isOpen && (
                  <div className="absolute right-2 top-8 z-10 w-44 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-slate-900">
                    <button
                      className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
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
                      {chat.isPinned ? "Bỏ ghim" : "Ghim cuộc trò chuyện"}
                    </button>
                    <button
                      className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        handleToggleMute(chat, chat.type === "conversation");
                      }}
                    >
                      {chat.isMuted ? "Bật thông báo" : "Tắt thông báo"}
                    </button>
                    <button
                      className="block w-full rounded px-2 py-1 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        handleDeleteChat(chat.id, chat.type === "conversation");
                      }}
                    >
                      {chat.type === "room"
                        ? "Xóa phòng chat"
                        : "Xóa cuộc trò chuyện"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
