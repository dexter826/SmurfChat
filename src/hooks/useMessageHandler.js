import { useState, useRef, useContext } from 'react';
import { AuthContext } from '../Context/AuthProvider';
import { sendMessage, updateRoomLastMessage, updateConversationLastMessage } from '../firebase/services';
import { useEmoji } from './useEmoji';


export const useMessageHandler = (chatType, chatData, enableEncryption = false, userCredentials = null) => {
  const [inputValue, setInputValue] = useState('');
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const inputRef = useRef();

  const {
    user: { uid, photoURL, displayName },
  } = useContext(AuthContext);

  const { addToRecent } = useEmoji();

  // Cấu trúc dữ liệu tin nhắn chung
  const createBaseMessageData = (additionalData = {}) => ({
    uid,
    photoURL,
    displayName,
    ...additionalData
  });


  // Xử lý gửi tin nhắn văn bản
  const handleTextMessage = async (members = [], replyContext = null) => {
    if (!inputValue.trim() || !chatData?.id) return;

    try {
      const messageData = createBaseMessageData({
        text: inputValue,
        messageType: "text",
        // Add reply data if replying to a message
        ...(replyContext && replyContext.id ? {
          replyTo: {
            messageId: replyContext.id,
            senderName: replyContext.displayName || '',
            messageType: replyContext.messageType || 'text',
            text: replyContext.text || '',
            fileData: replyContext.fileData || null,
            locationData: replyContext.locationData || null,
          }
        } : {}),
      });

      const unifiedMessageData = {
        ...messageData,
        chatType: chatType, // 'room' or 'direct'
        chatId: chatData.id, // roomId or conversationId
      };

      if (chatType === 'room') {
        await sendMessage('messages', unifiedMessageData, enableEncryption, userCredentials);
        await updateRoomLastMessage(chatData.id, inputValue, uid);
      } else if (chatType === 'direct') {
        await sendMessage('messages', unifiedMessageData, enableEncryption, userCredentials);
        await updateConversationLastMessage(chatData.id, inputValue, uid);
      }

      // Đặt lại input và focus
      setInputValue("");

      if (inputRef?.current) {
        setTimeout(() => {
          inputRef.current.focus();
        });
      }
    } catch (error) {
      if (error.message.includes('blocked')) {
        alert('Không thể gửi tin nhắn. Bạn đã bị chặn hoặc đã chặn người này.');
      } else {
        alert('Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.');
      }
    }
  };

  // Xử lý upload file
  const handleFileMessage = async (fileData) => {
    if (!chatData?.id) return;

    const messageData = createBaseMessageData({
      messageType: fileData.messageType,
      fileData: fileData,
      text: '', // Empty text for file messages
    });

    const lastMessageText = getFileMessageText(fileData);

    const unifiedMessageData = {
      ...messageData,
      chatType: chatType,
      chatId: chatData.id,
    };

    try {
      if (chatType === 'room') {
        await sendMessage('messages', unifiedMessageData, enableEncryption, userCredentials);
        await updateRoomLastMessage(chatData.id, lastMessageText, uid);
      } else if (chatType === 'direct') {
        await sendMessage('messages', unifiedMessageData, enableEncryption, userCredentials);
        await updateConversationLastMessage(chatData.id, lastMessageText, uid);
      }
    } catch (error) {
      if (error.message.includes('blocked')) {
        alert('Không thể gửi tin nhắn. Bạn đã bị chặn hoặc đã chặn người này.');
      } else {
        alert('Có lỗi xảy ra khi gửi file. Vui lòng thử lại.');
      }
    }
  };

  // Xử lý chia sẻ vị trí
  const handleLocationMessage = async (locationData) => {
    if (!chatData?.id) return;

    const messageData = createBaseMessageData({
      messageType: 'location',
      locationData: locationData,
      text: '', // Empty text for location messages
    });

    const lastMessageText = '📍 Vị trí được chia sẻ';

    const unifiedMessageData = {
      ...messageData,
      chatType: chatType,
      chatId: chatData.id,
    };

    try {
      if (chatType === 'room') {
        await sendMessage('messages', unifiedMessageData, enableEncryption, userCredentials);
        await updateRoomLastMessage(chatData.id, lastMessageText, uid);
      } else if (chatType === 'direct') {
        await sendMessage('messages', unifiedMessageData, enableEncryption, userCredentials);
        await updateConversationLastMessage(chatData.id, lastMessageText, uid);
      }
    } catch (error) {
      alert('Có lỗi xảy ra khi chia sẻ vị trí. Vui lòng thử lại.');
    }
  };

  // Xử lý click emoji
  const handleEmojiClick = (emoji) => {
    setInputValue(prev => prev + emoji);
    addToRecent(emoji);

    // Focus back to input
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  };

  // Bật/tắt quick reactions
  const toggleQuickReactions = () => {
    setShowQuickReactions(!showQuickReactions);
  };

  // Hàm helper để lấy text cho tin nhắn file
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
