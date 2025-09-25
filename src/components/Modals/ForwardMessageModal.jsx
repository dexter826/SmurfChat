import React, { useState, useEffect, useContext, useMemo } from "react";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import { useAlert } from "../../Context/AlertProvider";
import { forwardMessage } from "../../firebase/services";
import useOptimizedFirestore from "../../hooks/useOptimizedFirestore";

export default function ForwardMessageModal({
  isVisible,
  onClose,
  messageData,
  userCredentials = null,
}) {
  const { user } = useContext(AuthContext);
  const { rooms, conversations } = useContext(AppContext);
  const { error } = useAlert();

  // Get friends list
  const friendsCondition = useMemo(
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

  // Get friend user details
  const friendUserIds = useMemo(() => {
    return friendEdges
      .map((edge) => {
        const participants = edge.participants || [];
        return participants.find((p) => p !== user?.uid);
      })
      .filter(Boolean);
  }, [friendEdges, user?.uid]);

  const friendsUsersCondition = useMemo(() => {
    if (friendUserIds.length === 0) return null;
    return {
      fieldName: "uid",
      operator: "in",
      compareValue: friendUserIds,
    };
  }, [friendUserIds]);

  const { documents: friends } = useOptimizedFirestore(
    "users",
    friendsUsersCondition
  );

  const [selectedChats, setSelectedChats] = useState([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMounted, setIsMounted] = useState(true);

  // Combine rooms and conversations for forwarding options
  const getAvailableChats = () => {
    const chatOptions = [];

    // Add rooms
    if (rooms && Array.isArray(rooms)) {
      rooms.forEach((room) => {
        if (!room || !room.id || !room.name) return;

        chatOptions.push({
          id: room.id,
          name: room.name,
          type: "room",
          avatar: room.avatar,
          members: room.members || [],
          lastMessage: room.lastMessage,
        });
      });
    }

    // Add direct conversations
    if (conversations && Array.isArray(conversations) && user?.uid) {
      conversations.forEach((conv) => {
        if (
          !conv ||
          !conv.participants ||
          !Array.isArray(conv.participants) ||
          !conv.id
        )
          return;

        const otherParticipantId = conv.participants.find(
          (p) => p !== user.uid
        );
        if (!otherParticipantId) return;

        const friendData = friends.find(
          (f) => f && f.uid === otherParticipantId
        );

        if (friendData) {
          chatOptions.push({
            id: conv.id,
            name: friendData.displayName || "Unknown User",
            type: "direct",
            avatar: friendData.photoURL,
            participants: conv.participants,
            lastMessage: conv.lastMessage,
          });
        }
      });
    }

    return chatOptions;
  };

  const availableChats = getAvailableChats();

  const filteredChats = availableChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChatSelect = (chatId) => {
    setSelectedChats((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleForward = async () => {
    if (selectedChats.length === 0) {
      error("Vui lòng chọn ít nhất một cuộc trò chuyện để chuyển tiếp");
      return;
    }

    setIsForwarding(true);
    try {
      let successCount = 0;

      for (const chatId of selectedChats) {
        const chat = availableChats.find((c) => c.id === chatId);
        if (!chat) continue;

        let forwardData = {
          ...messageData,
          uid: user?.uid,
          displayName: user?.displayName,
          photoURL: user?.photoURL,
          chatType: chat.type,
          forwarded: true,
          originalSender: messageData.displayName,
          originalChatType: messageData.chatType,
          originalChatId: messageData.chatId,
        };

        if (chat.type === "room") {
          forwardData.chatId = chat.id;
          forwardData.roomId = chat.id;
          forwardData.conversationId = null;
        } else if (chat.type === "direct") {
          // For direct messages, create chatId in format "userA_userB"
          const participants = chat.participants || [];
          const sortedParticipants = [...participants].sort();
          forwardData.chatId = sortedParticipants.join("_");
          forwardData.roomId = null;
          forwardData.conversationId = chat.id;
        }

        // Remove fields that shouldn't be forwarded
        delete forwardData.id;
        delete forwardData.createdAt;
        delete forwardData.readByDetails;
        delete forwardData.reactions;
        delete forwardData.recalled;

        // Clean up undefined values that Firestore doesn't accept
        Object.keys(forwardData).forEach((key) => {
          if (forwardData[key] === undefined) {
            delete forwardData[key];
          }
        });

        await forwardMessage(
          "messages",
          forwardData,
          !!userCredentials,
          userCredentials
        );
        successCount++;
      }

      if (successCount > 0) {
        if (isMounted) {
          onClose();
          setSelectedChats([]);
          setSearchTerm("");
        }
      }
    } catch (err) {
      error(err.message || "Không thể chuyển tiếp tin nhắn");
    } finally {
      if (isMounted) {
        setIsForwarding(false);
      }
    }
  };

  const handleClose = () => {
    if (!isForwarding) {
      onClose();
      setSelectedChats([]);
      setSearchTerm("");
    }
  };

  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setSelectedChats([]);
      setSearchTerm("");
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chuyển tiếp tin nhắn
          </h3>
          <button
            onClick={handleClose}
            disabled={isForwarding}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            />
          </div>

          {/* Chat list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Không tìm thấy cuộc trò chuyện nào
              </p>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChats.includes(chat.id)
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                      : "hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="flex-shrink-0 mr-3">
                    {chat.avatar ? (
                      <img
                        src={chat.avatar}
                        alt={chat.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {chat.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {chat.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {chat.type === "room"
                        ? `${chat.members?.length || 0} thành viên`
                        : "Trò chuyện riêng"}
                    </p>
                  </div>
                  {selectedChats.includes(chat.id) && (
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Selected count */}
          {selectedChats.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Đã chọn {selectedChats.length} cuộc trò chuyện
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={isForwarding}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleForward}
            disabled={isForwarding || selectedChats.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isForwarding && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            Chuyển tiếp
          </button>
        </div>
      </div>
    </div>
  );
}
