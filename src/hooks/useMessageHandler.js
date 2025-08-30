/**
 * useMessageHandler - Custom Hook for Message Operations
 * 
 * Consolidates duplicate message handling logic between ChatWindow and ConversationWindow.
 * Provides unified interface for sending messages, files, location, and managing input state.
 * 
 * Created: August 30, 2025
 * Purpose: Eliminate code duplication (Issue 2.1)
 */

import { useState, useRef, useContext } from 'react';
import { AuthContext } from '../Context/AuthProvider';
import { sendMessage, updateRoomLastMessage, updateConversationLastMessage } from '../firebase/services';
import { useEmoji } from './useEmoji';

export const useMessageHandler = (chatType, chatData) => {
  const [inputValue, setInputValue] = useState('');
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const inputRef = useRef();
  
  const {
    user: { uid, photoURL, displayName },
  } = useContext(AuthContext);
  
  const { addToRecent } = useEmoji();

  // Common message data structure
  const createBaseMessageData = (additionalData = {}) => ({
    uid,
    photoURL,
    displayName,
    ...additionalData
  });

  // Handle text message submission
  const handleTextMessage = async () => {
    if (!inputValue.trim() || !chatData?.id) return;

    try {
      const messageData = createBaseMessageData({
        text: inputValue,
        messageType: "text",
      });

      if (chatType === 'room') {
        // Room message
        await sendMessage('unified', {
          ...messageData,
          roomId: chatData.id,
          type: 'room',
        });
        await updateRoomLastMessage(chatData.id, inputValue, uid);
      } else if (chatType === 'direct') {
        await sendMessage('unified', {
          ...messageData,
          conversationId: chatData.id,
          type: 'direct',
        });
        await updateConversationLastMessage(chatData.id, inputValue, uid);
      }

      // Reset input and focus
      setInputValue("");
      
      if (inputRef?.current) {
        setTimeout(() => {
          inputRef.current.focus();
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      if (error.message.includes('blocked')) {
        alert('Không thể gửi tin nhắn. Bạn đã bị chặn hoặc đã chặn người này.');
      } else {
        alert('Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.');
      }
    }
  };

  // Handle file upload
  const handleFileMessage = async (fileData) => {
    if (!chatData?.id) return;

    const messageData = createBaseMessageData({
      messageType: fileData.messageType,
      fileData: fileData,
      text: '', // Empty text for file messages
    });

    const lastMessageText = getFileMessageText(fileData);

    try {
      if (chatType === 'room') {
        await sendMessage('unified', {
          ...messageData,
          roomId: chatData.id,
          type: 'room',
        });
        await updateRoomLastMessage(chatData.id, lastMessageText, uid);
      } else if (chatType === 'direct') {
        await sendMessage('unified', {
          ...messageData,
          conversationId: chatData.id,
          type: 'direct',
        });
        await updateConversationLastMessage(chatData.id, lastMessageText, uid);
      }
    } catch (error) {
      console.error('Error sending file message:', error);
      
      if (error.message.includes('blocked')) {
        alert('Không thể gửi tin nhắn. Bạn đã bị chặn hoặc đã chặn người này.');
      } else {
        alert('Có lỗi xảy ra khi gửi file. Vui lòng thử lại.');
      }
    }
  };

  // Handle location sharing
  const handleLocationMessage = async (locationData) => {
    if (!chatData?.id) return;

    const messageData = createBaseMessageData({
      messageType: 'location',
      locationData: locationData,
      text: '', // Empty text for location messages
    });

    const lastMessageText = '📍 Vị trí được chia sẻ';

    try {
      if (chatType === 'room') {
        await sendMessage('unified', {
          ...messageData,
          roomId: chatData.id,
          type: 'room',
        });
        await updateRoomLastMessage(chatData.id, lastMessageText, uid);
      } else if (chatType === 'direct') {
        await sendMessage('unified', {
          ...messageData,
          conversationId: chatData.id,
          type: 'direct',
        });
        await updateConversationLastMessage(chatData.id, lastMessageText, uid);
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      alert('Có lỗi xảy ra khi chia sẻ vị trí. Vui lòng thử lại.');
    }
  };

  // Handle emoji click
  const handleEmojiClick = (emoji) => {
    setInputValue(prev => prev + emoji);
    addToRecent(emoji);
    
    // Focus back to input
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  };

  // Toggle quick reactions
  const toggleQuickReactions = () => {
    setShowQuickReactions(!showQuickReactions);
  };

  // Helper function to get file message text
  const getFileMessageText = (fileData) => {
    if (fileData.messageType === 'voice') return '🎤 Tin nhắn thoại';
    if (fileData.category === 'image') return '🖼️ Hình ảnh';
    return `📎 ${fileData.name}`;
  };

  return {
    // State
    inputValue,
    setInputValue,
    showQuickReactions,
    inputRef,
    
    // Handlers
    handleTextMessage,
    handleFileMessage,
    handleLocationMessage,
    handleEmojiClick,
    toggleQuickReactions,
  };
};
