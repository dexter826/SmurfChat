import { FaChartBar } from "react-icons/fa";
import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import {
  updateLastSeen,
  setTypingStatus,
  markMessageAsRead,
} from "../../firebase/services";
import useOptimizedFirestore from "../../hooks/useOptimizedFirestore";
import usePaginatedFirestore from "../../hooks/usePaginatedFirestore";
import InfiniteScrollContainer from "../Common/InfiniteScrollContainer";
import Message from "./Message";
import { useUserOnlineStatus } from "../../hooks/useOnlineStatus";
import VoteMessage from "./VoteMessage";
import RoomInfoModal from "./RoomInfoModal";
import FileUpload from "../FileUpload/FileUpload";
import VoiceRecording from "../FileUpload/VoiceRecording";
import EmojiPickerComponent from "./EmojiPicker";
import SearchModal from "./SearchModal";
import MentionInput from "./MentionInput";
import { useMessageHandler } from "../../hooks/useMessageHandler";

export default function ChatWindow() {
  const {
    selectedRoom,
    selectedConversation,
    chatType,
    setIsInviteMemberVisible,
    setIsVoteModalVisible,
    members,
  } = useContext(AppContext);
  const {
    user: { uid, email },
  } = useContext(AuthContext);

  // Encryption settings - enable encryption for all messages
  const [enableEncryption] = useState(true);
  const [userCredentials] = useState(() => {
    // Get user credentials for encryption
    // Note: In production, you should store password securely
    const storedPassword =
      localStorage.getItem("userPassword") || "defaultPassword";
    return { email, password: storedPassword };
  });

  const currentChatData =
    chatType === "room" ? selectedRoom : selectedConversation;

  const {
    inputValue,
    setInputValue,
    inputRef,
    handleTextMessage,
    handleFileMessage,
    handleLocationMessage,
    handleEmojiClick,
  } = useMessageHandler(
    chatType,
    currentChatData,
    enableEncryption,
    userCredentials
  );

  const messageListRef = useRef();
  const [isRoomInfoVisible, setIsRoomInfoVisible] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [replyContext, setReplyContext] = useState(null);

  const scrollToMessage = useCallback((messageId) => {
    // Find the message element in the chat
    const messageElement = document.querySelector(
      `[data-message-id="${messageId}"]`
    );
    if (messageElement && messageListRef.current) {
      // Scroll to the message
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight the message temporarily
      messageElement.style.backgroundColor = "rgba(14, 165, 233, 0.2)";
      setTimeout(() => {
        messageElement.style.backgroundColor = "";
      }, 2000);
    }
  }, []);

  const ConversationOnlineStatus = ({
    userId,
    typingStatus,
    currentUserId,
  }) => {
    const { isOnline } = useUserOnlineStatus(userId);
    const isTyping =
      typingStatus &&
      Object.entries(typingStatus).some(([k, v]) => k !== currentUserId && v);

    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {isTyping
          ? "Đang nhập..."
          : isOnline
          ? "Đang hoạt động"
          : "Không hoạt động"}
      </span>
    );
  };

  const handleOnSubmit = async () => {
    await handleTextMessage(members, replyContext);
    setReplyContext(null); // Clear reply context after sending
  };

  const handleReply = (messageData) => {
    setReplyContext(messageData);
  };

  const handleCancelReply = () => {
    setReplyContext(null);
  };

  const handleFileUploaded = async (fileData) => {
    await handleFileMessage(fileData);
  };

  const handleLocationShared = async (locationData) => {
    await handleLocationMessage(locationData);
  };

  const messagesCondition = React.useMemo(() => {
    if (chatType === "room" && selectedRoom?.id) {
      return {
        fieldName: "chatId",
        operator: "==",
        compareValue: selectedRoom.id,
      };
    } else if (chatType === "direct" && selectedConversation?.id) {
      return {
        fieldName: "chatId",
        operator: "==",
        compareValue: selectedConversation.id,
      };
    }
    return null;
  }, [chatType, selectedRoom?.id, selectedConversation?.id]);

  const {
    documents: messages,
    loading: messagesLoading,
    hasMore,
    loadMore,
  } = usePaginatedFirestore(
    "messages",
    messagesCondition,
    "createdAt",
    "desc", // newest first
    30, // page size
    true // real-time
  );

  const votesCondition = React.useMemo(
    () => ({
      fieldName: "roomId",
      operator: "==",
      compareValue: selectedRoom?.id,
    }),
    [selectedRoom?.id]
  );

  const { documents: allVotes } = useOptimizedFirestore(
    "votes",
    votesCondition
  );
  const votes = allVotes;

  const combinedMessages = React.useMemo(() => {
    // Convert messages to items with timestamps (reverse since paginated data comes desc)
    const messageItems = [...messages].reverse().map((msg) => ({
      ...msg,
      type: "message",
      timestamp: msg.createdAt?.toDate?.() || new Date(),
    }));

    if (chatType === "room") {
      const voteItems = (votes || []).map((vote) => ({
        ...vote,
        type: "vote",
        timestamp: vote.createdAt?.toDate?.() || new Date(),
      }));

      return [...messageItems, ...voteItems].sort(
        (a, b) => a.timestamp - b.timestamp
      );
    }

    // For direct messages, only return message items
    return messageItems.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, votes, chatType]);

  useEffect(() => {
    if (messageListRef?.current && combinedMessages.length > 0) {
      if (!messagesLoading) {
        messageListRef.current.scrollTop =
          messageListRef.current.scrollHeight + 50;
      }
    }
  }, [combinedMessages, messagesLoading]);

  useEffect(() => {
    const markSeen = async () => {
      try {
        if (chatType === "room" && selectedRoom.id) {
          await updateLastSeen(selectedRoom.id, uid, false);

          // Mark all unread messages in this room as read
          const unreadMessages = messages.filter((msg) => {
            const readByDetails = msg.readByDetails || {};
            return (
              msg.uid !== uid && // Not sent by current user
              !readByDetails[uid]
            ); // Not already read by current user
          });

          for (const message of unreadMessages) {
            try {
              await markMessageAsRead(message.id, uid, "messages", "room");
            } catch (err) {
              console.error("Error marking message as read:", err);
            }
          }
        } else if (chatType === "direct" && selectedConversation.id) {
          await updateLastSeen(selectedConversation.id, uid, true);

          // Mark all unread direct messages as read
          const unreadMessages = messages.filter((msg) => {
            const readByDetails = msg.readByDetails || {};
            return (
              msg.uid !== uid && // Not sent by current user
              !readByDetails[uid]
            ); // Not already read by current user
          });

          for (const message of unreadMessages) {
            try {
              await markMessageAsRead(message.id, uid, "messages", "direct");
            } catch (err) {
              console.error("Error marking direct message as read:", err);
            }
          }
        }
      } catch (e) {
        console.error("Error updating last seen:", e);
      }
    };
    if (
      (chatType === "room" && selectedRoom.id) ||
      (chatType === "direct" && selectedConversation.id)
    ) {
      markSeen();
    }
  }, [
    chatType,
    selectedRoom.id,
    selectedConversation.id,
    combinedMessages,
    uid,
    messages,
  ]);

  useEffect(() => {
    const isTyping = !!inputValue.trim();
    const chatId =
      chatType === "room" ? selectedRoom.id : selectedConversation.id;
    const isConversation = chatType === "direct";
    if (!chatId) return;

    const updateTyping = async () => {
      try {
        await setTypingStatus(chatId, uid, isTyping, isConversation);
      } catch (e) {
        console.error("Error setting typing status:", e);
      }
    };

    updateTyping();

    // Auto clear typing after idle 3s
    const t = setTimeout(() => {
      setTypingStatus(chatId, uid, false, isConversation).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [inputValue, chatType, selectedRoom.id, selectedConversation.id, uid]);

  const hasActiveChat =
    (chatType === "room" && selectedRoom.id) ||
    (chatType === "direct" && selectedConversation.id);

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-900">
      {hasActiveChat ? (
        <>
          <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
            <div className="flex flex-col justify-center">
              {chatType === "room" ? (
                <p className="m-0 text-base font-semibold">
                  {selectedRoom.name}
                </p>
              ) : (
                <>
                  {selectedConversation.otherUser?.photoURL ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={selectedConversation.otherUser?.photoURL}
                      alt="avatar"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skybrand-600 text-white">
                      {selectedConversation.otherUser?.displayName
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ marginLeft: "12px" }}>
                    <p className="m-0 text-base font-semibold">
                      {selectedConversation.otherUser?.displayName}
                    </p>
                    <ConversationOnlineStatus
                      userId={selectedConversation.otherUser?.uid}
                      typingStatus={selectedConversation.typingStatus}
                      currentUserId={uid}
                    />
                  </div>
                </>
              )}
            </div>
            {/* Action buttons for both room and direct chats */}
            <div className="flex items-center gap-1">
              <button
                className="p-2 rounded-md text-slate-700 hover:bg-gray-100 hover:text-skybrand-600 dark:text-slate-200 dark:hover:bg-gray-800 dark:hover:text-skybrand-400 transition-colors"
                onClick={() => setIsSearchModalVisible(true)}
                title="Tìm kiếm & Thư viện file"
              >
                <svg
                  className="w-5 h-5"
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
              </button>
              {chatType === "room" && (
                <>
                  <button
                    className="p-2 rounded-md text-slate-700 hover:bg-gray-100 hover:text-skybrand-600 dark:text-slate-200 dark:hover:bg-gray-800 dark:hover:text-skybrand-400 transition-colors"
                    onClick={() => setIsInviteMemberVisible(true)}
                    title="Mời thành viên"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </button>
                  <button
                    className="p-2 rounded-md text-slate-700 hover:bg-gray-100 hover:text-skybrand-600 dark:text-slate-200 dark:hover:bg-gray-800 dark:hover:text-skybrand-400 transition-colors"
                    onClick={() => setIsRoomInfoVisible(true)}
                    title="Thông tin nhóm"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex h-[calc(100%_-_56px)] flex-col justify-end p-3">
            <InfiniteScrollContainer
              hasMore={hasMore}
              loading={messagesLoading}
              loadMore={loadMore}
              reverse={true} // Load older messages on top scroll
              className="max-h-full"
              style={{ display: "flex", flexDirection: "column-reverse" }}
            >
              <div ref={messageListRef}>
                {combinedMessages.map((item, index) => {
                  if (item.type === "vote") {
                    return <VoteMessage key={item.id} vote={item} />;
                  } else {
                    return (
                      <Message
                        key={item.id}
                        id={item.id}
                        text={item.text}
                        photoURL={item.photoURL}
                        displayName={item.displayName}
                        createdAt={item.createdAt}
                        uid={item.uid}
                        messageType={item.messageType}
                        fileData={item.fileData}
                        locationData={item.locationData}
                        messageStatus={item.messageStatus || "sent"}
                        readBy={item.readBy || []}
                        readByDetails={item.readByDetails || {}}
                        reactions={item.reactions || {}}
                        recalled={item.recalled}
                        chatType={chatType}
                        chatId={currentChatData?.id}
                        isLatestFromSender={
                          index === combinedMessages.length - 1
                        } // Only the very last message
                        members={members || []} // Pass room members with full user info for avatar display
                        // Encryption props
                        isEncrypted={item.isEncrypted}
                        encryptedText={item.encryptedText}
                        encryptedFileData={item.encryptedFileData}
                        encryptedLocationData={item.encryptedLocationData}
                        contentHash={item.contentHash}
                        userCredentials={userCredentials}
                        // Forward props
                        forwarded={item.forwarded}
                        originalSender={item.originalSender}
                        originalChatType={item.originalChatType}
                        // Reply props
                        onReply={handleReply}
                        replyTo={item.replyTo}
                      />
                    );
                  }
                })}
              </div>
            </InfiniteScrollContainer>
            {(() => {
              const typingMap =
                chatType === "direct"
                  ? selectedConversation?.typingStatus
                  : selectedRoom?.typingStatus;
              const isOtherTyping =
                typingMap &&
                Object.entries(typingMap).some(([k, v]) => k !== uid && v);
              return isOtherTyping ? (
                <div className="mt-1 mb-2 flex h-6 items-center text-xs text-slate-500 dark:text-slate-400">
                  Đang nhập
                  <span className="ml-2 inline-flex gap-1">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400"></span>
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]"></span>
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]"></span>
                  </span>
                </div>
              ) : null;
            })()}

            {/* Reply Preview */}
            {replyContext && (
              <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                        />
                      </svg>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Trả lời {replyContext.displayName}
                      </span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 truncate">
                      {replyContext.messageType === "file"
                        ? "📁 File"
                        : replyContext.messageType === "voice"
                        ? "🎤 Tin nhắn thoại"
                        : replyContext.messageType === "location"
                        ? "📍 Vị trí"
                        : replyContext.text || "Tin nhắn"}
                    </p>
                  </div>
                  <button
                    onClick={handleCancelReply}
                    className="ml-2 p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                    title="Hủy trả lời"
                  >
                    <svg
                      className="w-4 h-4"
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
              </div>
            )}

            <div className="flex items-center space-x-2 rounded border border-gray-200 p-1 dark:border-gray-700">
              <FileUpload
                onFileUploaded={handleFileUploaded}
                onLocationShared={handleLocationShared}
                disabled={false}
              />

              {chatType === "room" && (
                <EmojiPickerComponent
                  onEmojiClick={handleEmojiClick}
                  disabled={false}
                />
              )}

              {chatType === "room" && (
                <button
                  title="Tạo vote"
                  className="flex items-center justify-center p-2 rounded-lg transition-colors duration-200 text-slate-600 hover:bg-slate-100 hover:text-skybrand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-skybrand-400"
                  onClick={() => setIsVoteModalVisible(true)}
                >
                  <FaChartBar className="h-5 w-5" />
                </button>
              )}

              {chatType === "room" ? (
                <MentionInput
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleOnSubmit}
                  placeholder="Nhập tin nhắn..."
                  disabled={false}
                  chatType={chatType}
                  members={members}
                />
              ) : (
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent px-2 py-1 outline-none placeholder:text-slate-400"
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleOnSubmit();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  autoComplete="off"
                  value={inputValue}
                />
              )}

              <VoiceRecording
                onVoiceUploaded={handleFileUploaded}
                disabled={false}
              />

              <button
                className="rounded bg-skybrand-600 px-3 py-1 text-sm font-medium text-white hover:bg-skybrand-700"
                onClick={handleOnSubmit}
              >
                Gửi
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-sky-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-md p-10 text-center">
            <h1 className="mb-4 text-3xl font-bold text-skybrand-600">
              Chào mừng đến với SmurfChat! 👋
            </h1>
            <p className="mb-8 text-sm text-slate-600 dark:text-slate-300">
              Chọn một cuộc trò chuyện hoặc phòng để bắt đầu nhắn tin
            </p>
            <div className="mb-8">
              <img
                src="/welcome.png"
                alt="SmurfChat Welcome"
                className="mx-auto h-auto max-w-[200px] rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      <RoomInfoModal
        visible={isRoomInfoVisible}
        onClose={() => setIsRoomInfoVisible(false)}
        room={selectedRoom}
      />

      <SearchModal
        isVisible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
        chatType={chatType}
        chatId={currentChatData?.id}
        chatName={
          chatType === "room"
            ? selectedRoom?.name
            : selectedConversation?.otherUser?.displayName
        }
        onMessageClick={scrollToMessage}
      />
    </div>
  );
}
