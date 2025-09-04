import React, { useState } from "react";
import { formatRelative } from "date-fns/esm";
import { AuthContext } from "../../Context/AuthProvider.jsx";
import { AppContext } from "../../Context/AppProvider.jsx";
import { useAlert } from "../../Context/AlertProvider";
import { recallMessage, canRecallMessage } from "../../firebase/services";
import FilePreview from "../FileUpload/FilePreview";
import LocationPreview from "../FileUpload/LocationPreview";
import EmojiText, { EmojiOnlyMessage } from "./EmojiText";
import { useEmoji } from "../../hooks/useEmoji";
import SeenByModal from "./SeenByModal";
import MessageReactions from "./MessageReactions";

function formatDate(seconds) {
  let formattedDate = "";

  if (seconds) {
    formattedDate = formatRelative(new Date(seconds * 1000), new Date());

    formattedDate =
      formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  return formattedDate;
}

export default function Message({
  id,
  text,
  displayName,
  createdAt,
  photoURL,
  uid,
  messageType = 'text',
  fileData,
  locationData,
  messageStatus = 'sent',
  recalled = false,
  chatType, // 'room' or 'direct'
  isLatestFromSender = false, // New prop to identify if this is the latest message from sender
  members = [], // For room chat to get user info
  otherParticipant = null, // For direct chat to get other user info
  readByDetails = {}, // Details about when each user read the message
  reactions = {}, // Message reactions
}) {
  const { user } = React.useContext(AuthContext);
  const { setSelectedUser, setIsUserProfileVisible } = React.useContext(AppContext);
  const { success, error } = useAlert();
  const { hasEmoji, parseEmojiText } = useEmoji();
  const [isRecalling, setIsRecalling] = useState(false);
  const [showSeenByModal, setShowSeenByModal] = useState(false);
  const [seenByUsers, setSeenByUsers] = useState([]);
  const isOwn = uid === user?.uid;

  // Handler to open user profile
  const handleAvatarClick = () => {
    if (!isOwn && uid && displayName) { // Don't open profile for own messages
      setSelectedUser({ uid, displayName, photoURL });
      setIsUserProfileVisible(true);
    }
  };

  // Handle recall message
  const handleRecallMessage = async () => {
    if (isRecalling) return;

    setIsRecalling(true);
    try {
      // Use unified messages collection
      await recallMessage(id, 'messages', user?.uid);
      success('Tin nhắn đã được thu hồi');
    } catch (err) {
      console.error('Error recalling message:', err);
      error(err.message || 'Không thể thu hồi tin nhắn');
    } finally {
      setIsRecalling(false);
    }
  };

  // Check if message can be recalled
  const canRecall = isOwn && !recalled && canRecallMessage({ 
    uid, 
    createdAt, 
    recalled 
  }, user?.uid);

  // Render message status for own messages
  const renderMessageStatus = () => {
    // Only show status for own messages that are the latest in the entire conversation
    if (!isOwn || !isLatestFromSender) return null;

    // Derive readBy from readByDetails and get users who have read this specific message
    const readBy = Object.keys(readByDetails || {});
    const readByOthers = readBy.filter(userId => userId !== user?.uid);

    const getStatusIcon = () => {
      switch (messageStatus) {
        case 'sending':
          return <span className="text-gray-400 text-xs">⏳</span>;
        case 'sent':
          return <span className="text-gray-400 text-xs">✓</span>;
        case 'delivered':
          return <span className="text-blue-500 text-xs">✓✓</span>;
        case 'failed':
          return <span className="text-red-500 text-xs">❌</span>;
        default:
          return <span className="text-gray-400 text-xs">✓</span>;
      }
    };

    // Handle different display logic for direct vs group chat
    if (chatType === 'direct') {
      // Direct Chat: Show avatar when seen, icons otherwise
      if (readByOthers.length > 0 && otherParticipant) {
        // Get read time from readByDetails for the other participant
        const otherUserId = readByOthers[0]; // In direct chat, there's only one other user
        const readTime = readByDetails[otherUserId];
        const seenAtText = readTime 
          ? `Đã xem lúc ${(readTime.toDate ? readTime.toDate() : new Date(readTime)).toLocaleTimeString('vi-VN', { 
              hour: '2-digit', 
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit'
            })}`
          : 'Đã xem';
          
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
                {(otherParticipant.displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        );
      } else {
        // Show regular status icons
        return (
          <div className="flex items-center justify-end mt-1 space-x-1">
            {getStatusIcon()}
          </div>
        );
      }
    } else if (chatType === 'room') {
      // Group Chat: Show "Đã xem bởi X người" or status icons
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
        // Show regular status icons
        return (
          <div className="flex items-center justify-end mt-1 space-x-1">
            {getStatusIcon()}
          </div>
        );
      }
    }

    return null;
  };

  // Handle showing seen details for group chat
  const handleShowSeenDetails = (userIds) => {
    if (!members || members.length === 0) return;
    
    const seenUsers = userIds.map(userId => {
      const user = members.find(member => member.uid === userId);
      if (!user) return null;
      
      // Get read time from readByDetails
      const readTime = readByDetails[userId];
      const seenAt = readTime 
        ? (readTime.toDate ? readTime.toDate() : new Date(readTime)).toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
          })
        : 'Không xác định';
      
      return {
        ...user,
        seenAt
      };
    }).filter(Boolean);

    setSeenByUsers(seenUsers);
    setShowSeenByModal(true);
  };

  const renderMessageContent = () => {
    // If message is recalled, show recall notice
    if (recalled) {
      const getRecallText = () => {
        if (messageType === 'file') return '📁 File đã được thu hồi';
        if (messageType === 'voice') return '🎤 Tin nhắn thoại đã được thu hồi';
        if (messageType === 'location') return '📍 Vị trí đã được thu hồi';
        return text || '💬 Tin nhắn đã được thu hồi';
      };

      return (
        <div className={`${
          isOwn
            ? "bg-gray-500 text-white border-gray-500 rounded-2xl rounded-tr-sm"
            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-600 rounded-2xl rounded-tl-sm"
        } border px-3 py-2 italic`}>
          <span className="break-words">{getRecallText()}</span>
        </div>
      );
    }

    const renderContentWithRecallButton = (content) => (
      <div className="relative group">
        {content}
        
        {/* Recall button - show for all message types */}
        {canRecall && (
          <button
            onClick={handleRecallMessage}
            disabled={isRecalling}
            className={`absolute ${
              isOwn ? '-left-8' : '-right-8'
            } top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 bg-gray-600 text-white rounded-full hover:bg-gray-700 disabled:opacity-50 z-10`}
            title="Thu hồi tin nhắn"
          >
            {isRecalling ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            )}
          </button>
        )}
      </div>
    );

    switch (messageType) {
      case 'file':
      case 'voice':
        return renderContentWithRecallButton(<FilePreview file={fileData} />);
      
      case 'location':
        return renderContentWithRecallButton(<LocationPreview location={locationData} />);
      
      case 'text':
      default:
        // Check if message is emoji-only for special rendering
        const isEmojiOnly = text && hasEmoji(text) && 
          parseEmojiText(text).every(part => 
            part.type === 'emoji' || (part.type === 'text' && !part.content.trim())
          );

        if (isEmojiOnly) {
          return renderContentWithRecallButton(<EmojiOnlyMessage text={text} />);
        }

        return renderContentWithRecallButton(
          <div
            className={`${
              isOwn
                ? "bg-skybrand-600 text-white border-skybrand-600 rounded-2xl rounded-tr-sm"
                : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm"
            } border px-3 py-2`}
          >
            <EmojiText text={text} className="break-words" />
          </div>
        );
    }
  };

  return (
    <div className={`mb-2 flex items-start message-group ${isOwn ? "flex-row-reverse" : ""}`}>
      <div 
        className={`h-8 w-8 flex-shrink-0 ${!isOwn ? 'cursor-pointer' : ''}`}
        onClick={handleAvatarClick}
        title={!isOwn ? `Xem hồ sơ của ${displayName}` : ''}
      >
        {photoURL ? (
          <img
            className={`h-8 w-8 rounded-full object-cover ${!isOwn ? 'hover:ring-2 hover:ring-skybrand-400 transition-all duration-200' : ''}`}
            src={photoURL}
            alt="avatar"
          />
        ) : (
          <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-skybrand-600 text-xs font-semibold text-white ${!isOwn ? 'hover:ring-2 hover:ring-skybrand-400 transition-all duration-200' : ''}`}>
            {displayName?.charAt(0)?.toUpperCase()}
          </div>
        )}
      </div>
      <div className={`flex max-w-[70%] flex-col ${isOwn ? "mr-2" : "ml-2"}`}>
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
        {renderMessageContent()}
        
        {/* Message Reactions */}
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
      
      {/* Seen By Modal */}
      <SeenByModal
        isVisible={showSeenByModal}
        onClose={() => setShowSeenByModal(false)}
        seenUsers={seenByUsers}
      />
    </div>
  );
}
