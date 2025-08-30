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
  readBy = [],
  recalled = false,
  chatType, // 'room' or 'direct'
  isLatestFromSender = false, // New prop to identify if this is the latest message from sender
  members = [], // For room chat to get user info
  otherParticipant = null, // For direct chat to get other user info
}) {
  const { user } = React.useContext(AuthContext);
  const { setSelectedUser, setIsUserProfileVisible } = React.useContext(AppContext);
  const { success, error } = useAlert();
  const { hasEmoji, parseEmojiText } = useEmoji();
  const [isRecalling, setIsRecalling] = useState(false);
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
      // Determine collection based on chat type
      const collectionName = chatType === 'direct' ? 'directMessages' : 'messages';
      await recallMessage(id, collectionName, user?.uid);
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
    if (!isOwn || !isLatestFromSender) return null; // Only show for own latest messages

    // Determine status based on readBy array
    let currentStatus = messageStatus;
    const readByOthers = readBy ? readBy.filter(userId => userId !== user?.uid) : [];
    
    if (readByOthers.length > 0) {
      currentStatus = 'read';
    }

    const getStatusIcon = () => {
      switch (currentStatus) {
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

    const getStatusText = () => {
      switch (currentStatus) {
        case 'sending':
          return 'Đang gửi...';
        case 'sent':
          return 'Đã gửi';
        case 'delivered':
          return 'Đã nhận';
        case 'failed':
          return 'Gửi thất bại';
        default:
          return 'Đã gửi';
      }
    };

    // If message is read, show reader avatars
    if (currentStatus === 'read' && readByOthers.length > 0) {
      return (
        <div className="flex items-center justify-end mt-1 space-x-1">
          <div className="flex -space-x-1">
            {readByOthers.slice(0, 3).map((userId) => {
              // Find user info from members (for room) or from conversation participants
              let userInfo = null;
              
              if (chatType === 'room' && members) {
                userInfo = members.find(member => member.uid === userId);
              } else if (chatType === 'direct' && otherParticipant) {
                // For direct messages, use otherParticipant info
                userInfo = otherParticipant;
              }
              
              if (!userInfo) return null;
              
              return (
                <div key={userId} className="relative">
                  {userInfo.photoURL ? (
                    <img
                      className="h-3 w-3 rounded-full object-cover border border-white"
                      src={userInfo.photoURL}
                      alt=""
                      title={`Đã xem bởi ${userInfo.displayName || 'Unknown'}`}
                    />
                  ) : (
                    <div 
                      className="flex h-3 w-3 items-center justify-center rounded-full bg-skybrand-600 text-[8px] font-semibold text-white border border-white"
                      title={`Đã xem bởi ${userInfo.displayName || 'Unknown'}`}
                    >
                      {(userInfo.displayName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}
            {readByOthers.length > 3 && (
              <div className="flex h-3 w-3 items-center justify-center rounded-full bg-gray-500 text-[6px] font-semibold text-white border border-white">
                +{readByOthers.length - 3}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show status icon and text for non-read messages
    return (
      <div className="flex items-center justify-end mt-1 space-x-1">
        {getStatusIcon()}
        <span className="text-[9px] text-gray-500 dark:text-gray-400">
          {getStatusText()}
        </span>
      </div>
    );
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
        {renderMessageStatus()}
      </div>
    </div>
  );
}
