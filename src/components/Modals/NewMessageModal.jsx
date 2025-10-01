import React, { useContext } from "react";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import { createOrUpdateConversation } from "../../firebase/services";
import { useAlert } from "../../Context/AlertProvider";
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

export default function NewMessageModal() {
  const { isNewMessageVisible, setIsNewMessageVisible } =
    useContext(AppContext);
  const { setSelectedConversationId, setChatType } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const { error } = useAlert();

  // Use useUserSearch hook
  const {
    searchTerm,
    searchResults,
    friends,
    handleSearchChange,
    clearSearch,
    loading,
  } = useUserSearch({ searchType: "friends" });

  // Use search results when there's a search term, otherwise show all friends
  const displayedUsers = searchTerm ? searchResults : friends;

  const openChatWith = async (selectedUser) => {
    try {
      // Create conversation ID (consistent ordering)
      const conversationId = [user.uid, selectedUser.uid].sort().join("_");

      // Create or update conversation
      await createOrUpdateConversation({
        id: conversationId,
        participants: [user.uid, selectedUser.uid],
        participantDetails: {
          [user.uid]: {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          },
          [selectedUser.uid]: {
            displayName: selectedUser.displayName,
            email: selectedUser.email,
            photoURL: selectedUser.photoURL,
          },
        },
        type: "direct",
        lastMessage: "",
        lastMessageAt: null,
        createdBy: user.uid,
      });

      // Switch to conversation view
      setChatType("direct");
      setSelectedConversationId(conversationId);

      // Close modal and reset search
      setIsNewMessageVisible(false);
      clearSearch();
    } catch (err) {
      console.error("Error creating conversation:", err);
      error(err.message || "Không thể tạo cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  const handleCancel = () => {
    setIsNewMessageVisible(false);
    clearSearch();
  };

  if (!isNewMessageVisible) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="relative z-10 w-full max-w-xl mx-auto rounded-lg border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-slate-900 max-h-[90vh] overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Tạo tin nhắn mới
          </h3>
          <button
            className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={handleCancel}
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
              className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 transition-all duration-200"
              placeholder="Tìm kiếm bạn bè..."
              value={searchTerm}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
        </div>

        {displayedUsers.length > 0 ? (
          <div className="thin-scrollbar max-h-80 space-y-2 overflow-y-auto">
            {displayedUsers.map((friend) => (
              <div
                key={friend.uid}
                className={`flex items-center justify-between rounded-lg p-3 ${
                  loading ? "opacity-60" : ""
                } hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer`}
              >
                <div className="flex items-center">
                  {friend.photoURL ? (
                    <img
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                      src={friend.photoURL}
                      alt="avatar"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skybrand-600 text-white ring-2 ring-slate-200 dark:ring-slate-700">
                      {friend.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="ml-3">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {friend.displayName}
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">
                        Bạn bè
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {friend.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg bg-skybrand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-skybrand-600 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 disabled:opacity-50"
                    onClick={() => openChatWith(friend)}
                    disabled={loading}
                  >
                    Nhắn tin
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500 dark:text-slate-400">
            {friends.length === 0
              ? "Bạn chưa có bạn bè nào. Hãy kết bạn trước khi tạo tin nhắn."
              : "Không tìm thấy bạn bè nào"}
          </div>
        )}
      </div>
    </div>
  );
}
