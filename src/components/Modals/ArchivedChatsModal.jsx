import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../Context/AuthProvider";
import { AppContext } from "../../Context/AppProvider";
import { useAlert } from "../../Context/AlertProvider";
import { getArchivedChats, unarchiveChat } from "../../firebase/services";
import { useUsers } from "../../Context/UserContext";
import { FaTimes, FaArchive, FaSearch, FaBoxOpen } from "react-icons/fa";

function ArchivedChatsModalComponent() {
  const { user } = useContext(AuthContext);
  const {
    isArchivedChatsVisible,
    setIsArchivedChatsVisible,
    rooms,
    conversations,
    setArchivedChatsRefreshTrigger,
  } = useContext(AppContext);
  const { error, confirm } = useAlert();
  const { getOtherParticipant } = useUsers();
  const [archivedChatsList, setArchivedChatsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unarchivingChats, setUnarchivingChats] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Load archived chats list
  useEffect(() => {
    const loadArchivedChats = async () => {
      if (!isArchivedChatsVisible || !user?.uid) return;

      setIsLoading(true);
      try {
        const archived = await getArchivedChats(user.uid);
        setArchivedChatsList(archived);
      } catch (err) {
        console.error("Error loading archived chats:", err);
        error("Không thể tải danh sách chat đã lưu trữ");
      } finally {
        setIsLoading(false);
      }
    };

    loadArchivedChats();
  }, [isArchivedChatsVisible, user?.uid, error]);

  // Enrich archived chats with chat info
  const enrichedArchivedChats = archivedChatsList.map((archivedChat) => {
    let chatInfo = null;
    if (archivedChat.isConversation) {
      const conversation = conversations.find(
        (c) => c.id === archivedChat.chatId
      );
      if (conversation) {
        const otherUser = getOtherParticipant(conversation);
        chatInfo = {
          displayName: otherUser.displayName,
          avatar: otherUser.photoURL,
          type: "conversation",
        };
      }
    } else {
      const room = rooms.find((r) => r.id === archivedChat.chatId);
      if (room) {
        chatInfo = {
          displayName: room.name,
          avatar: room.avatar,
          type: "room",
        };
      }
    }
    return {
      ...archivedChat,
      chatInfo: chatInfo || {
        displayName: archivedChat.chatId,
        avatar: null,
        type: "unknown",
      },
    };
  });

  // Filter archived chats based on search term
  const filteredArchivedChats = enrichedArchivedChats.filter((chat) =>
    chat.chatInfo.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle unarchive chat
  const handleUnarchiveChat = async (archivedChat) => {
    const confirmed = await confirm(
      `Bạn có chắc muốn bỏ lưu trữ cuộc trò chuyện này?`
    );

    if (!confirmed) return;

    setUnarchivingChats((prev) => new Set(prev).add(archivedChat.chatId));

    try {
      await unarchiveChat(archivedChat.chatId, user.uid);

      // Remove from local state
      setArchivedChatsList((prev) =>
        prev.filter((item) => item.chatId !== archivedChat.chatId)
      );

      // Trigger refresh of archived status in chat list
      setArchivedChatsRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error unarchiving chat:", err);
      error(err.message || "Không thể bỏ lưu trữ cuộc trò chuyện");
    } finally {
      setUnarchivingChats((prev) => {
        const newSet = new Set(prev);
        newSet.delete(archivedChat.chatId);
        return newSet;
      });
    }
  };

  if (!isArchivedChatsVisible) return null;

  const handleClose = () => {
    setIsArchivedChatsVisible(false);
    setSearchTerm("");
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
            <FaArchive className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Chat đã lưu trữ
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
              placeholder="Tìm kiếm chat đã lưu trữ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          ) : filteredArchivedChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FaBoxOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h4 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                {archivedChatsList.length === 0
                  ? "Chưa lưu trữ chat nào"
                  : "Không tìm thấy"}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {archivedChatsList.length === 0
                  ? "Bạn chưa lưu trữ cuộc trò chuyện nào"
                  : "Không có cuộc trò chuyện nào khớp với tìm kiếm"}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              <div className="p-4 space-y-3">
                {filteredArchivedChats.map((archivedChat) => {
                  const isUnarchiving = unarchivingChats.has(
                    archivedChat.chatId
                  );

                  return (
                    <div
                      key={archivedChat.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    >
                      {/* Chat Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {archivedChat.chatInfo.avatar ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={archivedChat.chatInfo.avatar}
                              alt="avatar"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white font-semibold">
                              {(archivedChat.chatInfo.displayName || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Chat Details */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {archivedChat.chatInfo.displayName}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {archivedChat.chatInfo.type === "room"
                              ? "Phòng chat"
                              : "Cuộc trò chuyện"}
                          </p>
                          {archivedChat.archivedAt && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Lưu trữ từ:{" "}
                              {new Date(
                                archivedChat.archivedAt.toDate
                                  ? archivedChat.archivedAt.toDate()
                                  : archivedChat.archivedAt
                              ).toLocaleDateString("vi-VN")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Unarchive Button */}
                      <button
                        onClick={() => handleUnarchiveChat(archivedChat)}
                        disabled={isUnarchiving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                          isUnarchiving
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
                            : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 focus:ring-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30"
                        }`}
                      >
                        {isUnarchiving ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            Đang bỏ lưu trữ...
                          </>
                        ) : (
                          <>
                            <FaBoxOpen className="h-4 w-4" />
                            Bỏ lưu trữ
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
              {archivedChatsList.length === 0
                ? "Không có chat nào được lưu trữ"
                : archivedChatsList.length === 1
                ? "1 chat đã lưu trữ"
                : `${archivedChatsList.length} chat đã lưu trữ`}
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

export default ArchivedChatsModalComponent;
