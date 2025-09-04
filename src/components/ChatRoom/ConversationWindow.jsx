import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import {
  updateLastSeen,
  setTypingStatus,
  areUsersFriends,
  markMessageAsRead,
} from "../../firebase/services";
import useFirestore from "../../hooks/useFirestore";
import Message from "./Message";
import { useUserOnlineStatus } from "../../hooks/useOnlineStatus";
import FileUpload from "../FileUpload/FileUpload";
import VoiceRecording from "../FileUpload/VoiceRecording";
import EmojiPickerComponent from "./EmojiPicker";
import { QuickReactions } from "./EmojiText";
import { useMessageHandler } from "../../hooks/useMessageHandler";
import { useBlockStatus } from "../../hooks/useBlockStatus";

export default function ConversationWindow() {
  const { selectedConversation } = useContext(AppContext);
  const {
    user: { uid },
  } = useContext(AuthContext);

  // Get other user ID from conversation
  const otherUserId = selectedConversation?.participants?.find(
    (id) => id !== uid
  );

  // Use the new message handler hook
  const {
    inputValue,
    setInputValue,
    showQuickReactions,
    inputRef,
    handleTextMessage,
    handleFileMessage,
    handleLocationMessage,
    handleEmojiClick,
    toggleQuickReactions,
  } = useMessageHandler("direct", selectedConversation);

  // Use the new block status hook
  const { isBlockedByMe, isBlockingMe, canSendMessage } =
    useBlockStatus(otherUserId);

  const messageListRef = useRef();
  const [canChat, setCanChat] = useState(true);

  // Computed value: can chat if friends AND not blocked
  const canActuallyChat = canChat && canSendMessage();

  // Online status component
  const OnlineStatus = ({ userId }) => {
    const { isOnline } = useUserOnlineStatus(userId);
    return (
      <p className="m-0 text-xs text-slate-500">
        {isOnline ? "Đang hoạt động" : "Không hoạt động"}
      </p>
    );
  };

  const handleOnSubmit = async () => {
    await handleTextMessage();
  };

  // Toggle quick reactions
  // Handle file upload
  const handleFileUploaded = async (fileData) => {
    await handleFileMessage(fileData);
  };

  // Handle location sharing
  const handleLocationShared = async (locationData) => {
    await handleLocationMessage(locationData);
  };

  const directCondition = React.useMemo(
    () => ({
      fieldName: "type",
      operator: "==",
      compareValue: "direct",
    }),
    []
  );
  const conversationCondition = React.useMemo(
    () => ({
      fieldName: "conversationId",
      operator: "==",
      compareValue: selectedConversation.id,
    }),
    [selectedConversation.id]
  );
  const messages = useFirestore(
    "unified",
    directCondition && conversationCondition
      ? {
          ...conversationCondition,
          ...directCondition,
        }
      : conversationCondition,
    "createdAt",  // orderBy field
    "asc"         // order direction
  );

  useEffect(() => {
    // scroll to bottom after message changed
    if (messageListRef?.current) {
      messageListRef.current.scrollTop =
        messageListRef.current.scrollHeight + 50;
    }
  }, [messages]);

  // Check friendship to enable/disable chat
  useEffect(() => {
    const check = async () => {
      try {
        if (!otherUserId) {
          setCanChat(true);
          return;
        }
        const ok = await areUsersFriends(uid, otherUserId);
        setCanChat(!!ok);
      } catch {
        setCanChat(true);
      }
    };
    if (selectedConversation && selectedConversation.participants) {
      check();
    }
  }, [selectedConversation, uid, otherUserId]);

  // Mark conversation as read when messages change and this conversation is open
  useEffect(() => {
    const markSeen = async () => {
      try {
        if (selectedConversation.id) {
          await updateLastSeen(selectedConversation.id, uid, true);
        }
      } catch (e) {
        console.error("Error updating last seen:", e);
      }
    };
    if (selectedConversation.id) {
      markSeen();
    }
  }, [selectedConversation.id, uid, messages]);

  // Mark individual messages as read when conversation is open
  useEffect(() => {
    const markMessagesRead = async () => {
      try {
        if (messages && messages.length > 0 && selectedConversation.id && uid) {
          // Mark all unread messages in this conversation as read
          const unreadMessages = messages.filter(
            (msg) =>
              msg.senderId !== uid && (!msg.readBy || !msg.readBy.includes(uid))
          );

          for (const message of unreadMessages) {
            await markMessageAsRead(message.id, uid, "unified", "direct");
          }
        }
      } catch (e) {
        console.error("Error marking messages as read:", e);
      }
    };

    if (selectedConversation.id && messages && messages.length > 0) {
      markMessagesRead();
    }
  }, [selectedConversation.id, uid, messages]);

  // Update typing status (self)
  useEffect(() => {
    const isTyping = !!inputValue.trim();
    const chatId = selectedConversation.id;
    if (!chatId) return;

    const updateTyping = async () => {
      try {
        await setTypingStatus(chatId, uid, isTyping, true);
      } catch (e) {
        console.error("Error setting typing status:", e);
      }
    };

    updateTyping();
    const t = setTimeout(() => {
      setTypingStatus(chatId, uid, false, true).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [inputValue, selectedConversation.id, uid]);

  // Get other participant info
  const otherParticipant = React.useMemo(() => {
    if (!selectedConversation.participants) return null;
    return (
      selectedConversation.otherUser || {
        displayName: "Unknown User",
        photoURL: "",
      }
    );
  }, [selectedConversation]);

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-900">
      {selectedConversation.id ? (
        <>
          <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
            <div className="flex items-center">
              {otherParticipant?.photoURL ? (
                <img
                  className="h-8 w-8 rounded-full"
                  src={otherParticipant?.photoURL}
                  alt="avatar"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skybrand-600 text-white">
                  {otherParticipant?.displayName?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className="ml-3">
                <p className="m-0 text-base font-semibold">
                  {otherParticipant?.displayName}
                </p>
                <OnlineStatus userId={otherParticipant?.uid} />
              </div>
            </div>
          </div>
          <div className="flex h-[calc(100%_-_56px)] flex-col justify-end p-3">
            <div
              ref={messageListRef}
              className="thin-scrollbar max-h-full overflow-y-auto"
            >
              {messages.map((mes, index) => {
                // Only the very last message in conversation should show read status
                const isLatestFromSender = index === messages.length - 1;

                return (
                  <Message
                    key={mes.id}
                    id={mes.id}
                    text={mes.text}
                    photoURL={mes.photoURL} // Keep original message photo for message display
                    displayName={mes.displayName}
                    createdAt={mes.createdAt}
                    uid={mes.uid}
                    messageType={mes.messageType || "text"}
                    fileData={mes.fileData}
                    locationData={mes.locationData}
                    recalled={mes.recalled}
                    readBy={mes.readBy || []}
                    readByDetails={mes.readByDetails || {}}
                    chatType="direct"
                    isLatestFromSender={isLatestFromSender}
                    otherParticipant={otherParticipant} // Pass other participant info for read status display
                  />
                );
              })}
            </div>
            {(() => {
              const typingMap = selectedConversation?.typingStatus;
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
            {!canChat && (
              <div className="my-2 rounded border border-skybrand-300 bg-skybrand-50 p-2 text-xs text-skybrand-700 dark:border-skybrand-700 dark:bg-skybrand-900/20 dark:text-skybrand-300">
                Hai bạn chưa là bạn bè. Hãy kết bạn để có thể nhắn tin.
              </div>
            )}

            {/* Block Status Messages */}
            {isBlockedByMe && (
              <div className="my-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
                Bạn đã chặn người này. Bỏ chặn để có thể nhắn tin.
              </div>
            )}

            {isBlockingMe && (
              <div className="my-2 rounded border border-gray-300 bg-gray-50 p-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
                👤 Người này hiện không có mặt
              </div>
            )}

            {/* Quick Reactions */}
            {showQuickReactions && canActuallyChat && (
              <div className="mb-2">
                <QuickReactions
                  onEmojiClick={handleEmojiClick}
                  disabled={!canActuallyChat}
                />
              </div>
            )}

            <div className="flex items-center space-x-2 rounded border border-gray-200 p-1 dark:border-gray-700">
              {/* File Upload Component */}
              <FileUpload
                onFileUploaded={handleFileUploaded}
                onLocationShared={handleLocationShared}
                disabled={!canActuallyChat}
              />

              {/* Emoji Picker */}
              <EmojiPickerComponent
                onEmojiClick={handleEmojiClick}
                disabled={!canActuallyChat}
              />

              {/* Quick Reactions Toggle */}
              <button
                type="button"
                onClick={toggleQuickReactions}
                disabled={!canActuallyChat}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
                  !canActuallyChat
                    ? "text-slate-300 cursor-not-allowed dark:text-slate-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-skybrand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-skybrand-400"
                }`}
                title={
                  !canActuallyChat
                    ? "Không thể sử dụng"
                    : showQuickReactions
                    ? "Ẩn emoji nhanh"
                    : "Hiện emoji nhanh"
                }
              >
                <span className="text-sm">⚡</span>
              </button>

              {/* Text Input */}
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
                disabled={!canActuallyChat}
              />

              {/* Voice Recording Button */}
              <VoiceRecording
                onVoiceUploaded={handleFileUploaded}
                disabled={!canActuallyChat}
              />

              <button
                className={`rounded px-3 py-1 text-sm font-medium text-white ${
                  canActuallyChat
                    ? "bg-skybrand-600 hover:bg-skybrand-700"
                    : "bg-slate-400"
                }`}
                onClick={handleOnSubmit}
                disabled={!canActuallyChat}
              >
                Gửi
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="m-2 rounded border border-skybrand-300 bg-skybrand-50 p-2 text-sm text-skybrand-700 dark:border-skybrand-700 dark:bg-skybrand-900/20 dark:text-skybrand-300">
          Hãy chọn cuộc trò chuyện
        </div>
      )}
    </div>
  );
}
