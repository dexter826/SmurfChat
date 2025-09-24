import React, { useState, useCallback, useMemo } from "react";
import { formatRelative } from "date-fns/esm";
import { AuthContext } from "../../Context/AuthProvider.jsx";
import { AppContext } from "../../Context/AppProvider.jsx";
import { useAlert } from "../../Context/AlertProvider";
import {
  recallMessage,
  canRecallMessage,
  getDecryptedMessageContent,
} from "../../firebase/services";
import { generateMasterKey } from "../../firebase/utils/encryption.utils";
import FilePreview from "../FileUpload/FilePreview";
import LocationPreview from "../FileUpload/LocationPreview";
import EmojiText, { EmojiOnlyMessage } from "./EmojiText";
import { useEmoji } from "../../hooks/useEmoji";
import SeenByModal from "./SeenByModal";
import MessageReactions from "./MessageReactions";
import ForwardMessageModal from "../Modals/ForwardMessageModal";
import MentionText from "./MentionText";
import LinkPreview from "../Common/LinkPreview";
import useLinkDetector from "../../hooks/useLinkDetector";

function formatDate(seconds) {
  let formattedDate = "";

  if (seconds) {
    formattedDate = formatRelative(new Date(seconds * 1000), new Date());
    formattedDate =
      formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  return formattedDate;
}

const Message = React.memo(function Message({
  id,
  text,
  displayName,
  createdAt,
  photoURL,
  uid,
  messageType = "text",
  fileData,
  locationData,
  messageStatus = "sent",
  recalled = false,
  chatType,
  chatId,
  isLatestFromSender = false,
  members = [],
  otherParticipant = null,
  readByDetails = {},
  reactions = {},
  isEncrypted = false,
  encryptedText,
  encryptedFileData = null,
  encryptedLocationData = null,
  contentHash,
  userCredentials = null,
  forwarded = false,
  originalSender,
  originalChatType,
  onReply,
  replyTo,
}) {
  const { user } = React.useContext(AuthContext);
  const { setSelectedUser, setIsUserProfileVisible } =
    React.useContext(AppContext);
  const { success, error } = useAlert();
  const { hasEmoji, parseEmojiText } = useEmoji();
  const [isRecalling, setIsRecalling] = useState(false);
  const [showSeenByModal, setShowSeenByModal] = useState(false);
  const [seenByUsers, setSeenByUsers] = useState([]);
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isOwn = uid === user?.uid;

  // Memoize decrypted content
  const currentContent = useMemo(() => {
    if (decryptedContent) {
      return {
        text: decryptedContent.text,
        fileData: decryptedContent.fileData,
        locationData: decryptedContent.locationData,
        messageType: decryptedContent.messageType,
      };
    }
    return {
      text: text || "",
      fileData: fileData || null,
      locationData: locationData || null,
      messageType: messageType || "text",
    };
  }, [decryptedContent, text, fileData, locationData, messageType]);

  // Memoize link detection
  const { links, textSegments, hasLinks } = useLinkDetector(
    isEncrypted && decryptedContent ? decryptedContent.text : text
  );

  // Memoize canRecall
  const canRecall = useMemo(
    () =>
      isOwn &&
      !recalled &&
      canRecallMessage(
        {
          uid,
          createdAt,
          recalled,
        },
        user?.uid
      ),
    [isOwn, recalled, uid, createdAt, user?.uid]
  );

  // Callbacks
  const handleAvatarClick = useCallback(() => {
    if (!isOwn && uid && displayName) {
      setSelectedUser({ uid, displayName, photoURL });
      setIsUserProfileVisible(true);
    }
  }, [
    isOwn,
    uid,
    displayName,
    photoURL,
    setSelectedUser,
    setIsUserProfileVisible,
  ]);

  const handleRecallMessage = useCallback(async () => {
    if (isRecalling) return;
    setIsRecalling(true);
    try {
      await recallMessage(
        id,
        "messages",
        user?.uid,
        chatType === "room" ? "room" : "direct",
        userCredentials
      );
      success("Tin nhắn đã được thu hồi");
    } catch (err) {
      error(err.message || "Không thể thu hồi tin nhắn");
    } finally {
      setIsRecalling(false);
    }
  }, [isRecalling, id, user?.uid, chatType, userCredentials, success, error]);

  const handleForwardMessage = useCallback(() => {
    setShowForwardModal(true);
    setShowMenu(false);
  }, []);

  const handleReplyMessage = useCallback(() => {
    if (onReply) {
      onReply({
        id,
        text: currentContent.text,
        displayName,
        messageType: currentContent.messageType,
        fileData: currentContent.fileData,
        locationData: currentContent.locationData,
      });
    }
    setShowMenu(false);
  }, [onReply, id, currentContent, displayName]);

  const handleMenuToggle = useCallback(() => {
    setShowMenu(!showMenu);
  }, [showMenu]);

  const handleShowSeenDetails = useCallback(
    (userIds) => {
      if (!members || members.length === 0) return;
      const seenUsers = userIds
        .map((userId) => {
          const user = members.find((member) => member.uid === userId);
          if (!user) return null;
          const readTime = readByDetails[userId];
          const seenAt = readTime
            ? (readTime.toDate
                ? readTime.toDate()
                : new Date(readTime)
              ).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })
            : "Không xác định";
          return { ...user, seenAt };
        })
        .filter(Boolean);
      setSeenByUsers(seenUsers);
      setShowSeenByModal(true);
    },
    [members, readByDetails]
  );

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest(".message-menu")) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // Decrypt content effect
  React.useEffect(() => {
    const decryptMessageContent = async () => {
      if (isEncrypted && userCredentials) {
        try {
          const masterKey = generateMasterKey(
            userCredentials.email,
            userCredentials.password
          );
          const messageData = {
            id,
            text,
            displayName,
            createdAt,
            photoURL,
            uid,
            messageType,
            fileData,
            locationData,
            messageStatus,
            recalled,
            chatType,
            isLatestFromSender,
            members,
            otherParticipant,
            readByDetails,
            reactions,
            isEncrypted,
            encryptedText,
            encryptedFileData,
            encryptedLocationData,
            contentHash,
          };
          const decrypted = getDecryptedMessageContent(messageData, masterKey);
          setDecryptedContent(decrypted);
        } catch (err) {
          console.error("Failed to decrypt message:", err);
          setDecryptedContent(null);
        }
      } else {
        setDecryptedContent(null);
      }
    };
    decryptMessageContent();
  }, [isEncrypted, userCredentials]);

  const renderMessageStatus = () => {
    if (!isOwn || !isLatestFromSender) return null;
    const readBy = Object.keys(readByDetails || {});
    const readByOthers = readBy.filter((userId) => userId !== user?.uid);

    const getStatusIcon = () => {
      switch (messageStatus) {
        case "sending":
          return <span className="text-gray-400 text-xs">⏳</span>;
        case "sent":
          return <span className="text-gray-400 text-xs">✓</span>;
        case "delivered":
          return <span className="text-blue-500 text-xs">✓✓</span>;
        case "failed":
          return <span className="text-red-500 text-xs">❌</span>;
        default:
          return <span className="text-gray-400 text-xs">✓</span>;
      }
    };

    if (chatType === "direct") {
      if (readByOthers.length > 0 && otherParticipant) {
        const otherUserId = readByOthers[0];
        const readTime = readByDetails[otherUserId];
        const seenAtText = readTime
          ? `Đã xem lúc ${(readTime.toDate
              ? readTime.toDate()
              : new Date(readTime)
            ).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}`
          : "Đã xem";
        return (
          <div className="flex items-center justify-end mt-1">
            {otherParticipant.photoURL ? (
              <img
                className="h-4 w-4 rounded-full object-cover"
                src={otherParticipant.photoURL}
                alt=""
                title={seenAtText}
              />
            ) : (
              <div
                className="flex h-4 w-4 items-center justify-center rounded-full bg-skybrand-600 text-[10px] font-semibold text-white"
                title={seenAtText}
              >
                {(otherParticipant.displayName || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div className="flex items-center justify-end mt-1 space-x-1">
            {getStatusIcon()}
          </div>
        );
      }
    } else if (chatType === "room") {
      if (readByOthers.length > 0) {
        return (
          <div className="flex items-center justify-end mt-1">
            <button
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              onClick={() => handleShowSeenDetails(readByOthers)}
              title="Nhấn để xem chi tiết"
            >
              Đã xem bởi {readByOthers.length} người
            </button>
          </div>
        );
      } else {
        return (
          <div className="flex items-center justify-end mt-1 space-x-1">
            {getStatusIcon()}
          </div>
        );
      }
    }
    return null;
  };

  const renderMessageContent = () => {
    if (recalled) {
      const getRecallText = () => {
        if (currentContent.messageType === "file")
          return "📁 File đã được thu hồi";
        if (currentContent.messageType === "voice")
          return "🎤 Tin nhắn thoại đã được thu hồi";
        if (currentContent.messageType === "location")
          return "📍 Vị trí đã được thu hồi";
        return currentContent.text || "💬 Tin nhắn đã được thu hồi";
      };
      return (
        <div
          className={`${
            isOwn
              ? "bg-gray-500 text-white border-gray-500 rounded-2xl rounded-tr-sm"
              : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-600 rounded-2xl rounded-tl-sm"
          } border px-3 py-2 italic`}
        >
          <span className="break-words">{getRecallText()}</span>
        </div>
      );
    }

    const renderContentWithRecallButton = (content) => (
      <div className="relative group">
        {content}
        <div
          className={`absolute ${
            isOwn ? "-left-8" : "-right-8"
          } top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 message-menu`}
        >
          <button
            onClick={handleMenuToggle}
            className="p-1 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
            title="Tùy chọn tin nhắn"
          >
            <svg
              className="w-3 h-3"
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
          </button>
          {showMenu && (
            <div
              className={`absolute ${
                isOwn ? "left-full ml-1" : "right-full mr-1"
              } bottom-0 mb-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px] z-30`}
            >
              <button
                onClick={handleReplyMessage}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
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
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                Trả lời
              </button>
              <button
                onClick={handleForwardMessage}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
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
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
                Chuyển tiếp
              </button>
              {canRecall && (
                <button
                  onClick={() => {
                    handleRecallMessage();
                    setShowMenu(false);
                  }}
                  disabled={isRecalling}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRecalling ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  ) : (
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
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                  )}
                  {isRecalling ? "Đang thu hồi..." : "Thu hồi"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );

    switch (currentContent.messageType) {
      case "file":
      case "voice":
        return renderContentWithRecallButton(
          <FilePreview file={currentContent.fileData} />
        );
      case "location":
        return renderContentWithRecallButton(
          <LocationPreview location={currentContent.locationData} />
        );
      case "text":
      default:
        const isEmojiOnly =
          currentContent.text &&
          hasEmoji(currentContent.text) &&
          parseEmojiText(currentContent.text).every(
            (part) =>
              part.type === "emoji" ||
              (part.type === "text" && !part.content.trim())
          );
        if (isEmojiOnly) {
          return renderContentWithRecallButton(
            <EmojiOnlyMessage text={currentContent.text} />
          );
        }

        const renderTextWithLinks = () => {
          if (hasLinks && textSegments.length > 0) {
            return (
              <>
                <div
                  className={`${
                    isOwn
                      ? "bg-skybrand-600 text-white border-skybrand-600 rounded-2xl rounded-tr-sm"
                      : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm"
                  } border px-3 py-2 max-w-full overflow-hidden`}
                >
                  {textSegments.map((segment, index) => {
                    if (segment.type === "link") {
                      return (
                        <a
                          key={index}
                          href={segment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`underline break-all ${
                            isOwn
                              ? "text-blue-200 hover:text-blue-100"
                              : "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          }`}
                        >
                          {segment.content}
                        </a>
                      );
                    } else {
                      return chatType === "room" ? (
                        <MentionText
                          key={index}
                          text={segment.content}
                          className="break-words"
                          members={members}
                        />
                      ) : (
                        <EmojiText
                          key={index}
                          text={segment.content}
                          className="break-words"
                        />
                      );
                    }
                  })}
                </div>
                {links.length > 0 && (
                  <div className="mt-2">
                    <LinkPreview url={links[0].normalized} />
                  </div>
                )}
              </>
            );
          }
          return (
            <div
              className={`${
                isOwn
                  ? "bg-skybrand-600 text-white border-skybrand-600 rounded-2xl rounded-tr-sm"
                  : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm"
              } border px-3 py-2 max-w-full overflow-hidden`}
            >
              {chatType === "room" ? (
                <MentionText
                  text={currentContent.text}
                  className="break-words"
                  members={members}
                />
              ) : (
                <EmojiText text={currentContent.text} className="break-words" />
              )}
            </div>
          );
        };
        return renderContentWithRecallButton(renderTextWithLinks());
    }
  };

  return (
    <div
      className={`mb-2 flex items-start message-group ${
        isOwn ? "flex-row-reverse" : ""
      }`}
      data-message-id={id}
    >
      <div
        className={`h-8 w-8 flex-shrink-0 ${!isOwn ? "cursor-pointer" : ""}`}
        onClick={handleAvatarClick}
        title={!isOwn ? `Xem hồ sơ của ${displayName}` : ""}
      >
        {photoURL ? (
          <img
            className={`h-8 w-8 rounded-full object-cover ${
              !isOwn
                ? "hover:ring-2 hover:ring-skybrand-400 transition-all duration-200"
                : ""
            }`}
            src={photoURL}
            alt="avatar"
          />
        ) : (
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-skybrand-600 text-xs font-semibold text-white ${
              !isOwn
                ? "hover:ring-2 hover:ring-skybrand-400 transition-all duration-200"
                : ""
            }`}
          >
            {displayName?.charAt(0)?.toUpperCase()}
          </div>
        )}
      </div>
      <div
        className={`flex max-w-[70%] flex-col overflow-hidden ${
          isOwn ? "mr-2" : "ml-2"
        }`}
      >
        {forwarded && originalSender && (
          <div className="mb-1 flex items-center">
            <svg
              className="w-3 h-3 text-gray-400 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              Chuyển tiếp từ {originalSender}
            </span>
          </div>
        )}
        <div
          className={`mb-1 flex items-center ${
            isOwn ? "flex-row-reverse" : ""
          }`}
        >
          <span
            className={`text-[12px] font-semibold ${isOwn ? "ml-1" : "mr-1"} ${
              recalled ? "text-gray-500" : ""
            }`}
          >
            {recalled ? `${displayName} (đã thu hồi)` : displayName}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {formatDate(createdAt?.seconds)}
          </span>
        </div>
        {replyTo && (
          <div className="mb-2 ml-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Trả lời{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {replyTo.senderName}
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
              {replyTo.messageType === "file"
                ? "📁 File"
                : replyTo.messageType === "voice"
                ? "🎤 Tin nhắn thoại"
                : replyTo.messageType === "location"
                ? "📍 Vị trí"
                : replyTo.text || "Tin nhắn"}
            </div>
          </div>
        )}
        {renderMessageContent()}
        {!recalled && (
          <MessageReactions
            messageId={id}
            reactions={reactions}
            chatType={chatType}
            disabled={false}
          />
        )}
        {renderMessageStatus()}
      </div>
      <SeenByModal
        isVisible={showSeenByModal}
        onClose={() => setShowSeenByModal(false)}
        seenUsers={seenByUsers}
      />
      <ForwardMessageModal
        isVisible={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        messageData={{
          text: currentContent.text,
          messageType: currentContent.messageType,
          fileData: currentContent.fileData,
          locationData: currentContent.locationData,
          displayName,
          chatType,
          chatId,
        }}
        userCredentials={userCredentials}
      />
    </div>
  );
});

export default Message;
