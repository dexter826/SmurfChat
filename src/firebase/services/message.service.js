import { doc, updateDoc, getDoc, deleteDoc, serverTimestamp, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { getMutualBlockStatus } from '../utils/block.utils';
import { updateRoomLastMessage, updateConversationLastMessage } from '../utils/conversation.utils';
import { handleServiceError, logSuccess, validateRequired, ErrorTypes, SmurfChatError } from '../utils/error.utils';
import { areUsersFriends } from './friend.service';

// Lấy danh sách người dùng đã đọc tin nhắn từ chi tiết readByDetails
export const getReadByFromDetails = (readByDetails = {}) => {
  return Object.keys(readByDetails);
};

// Xóa tin nhắn khỏi cơ sở dữ liệu
export const deleteMessage = async (messageId, collectionName = 'messages', type) => {
  try {
    validateRequired(messageId, 'Message ID');
    const messageRef = doc(db, collectionName, messageId);
    await deleteDoc(messageRef);
    logSuccess('deleteMessage', { messageId, collectionName, type });
  } catch (error) {
    const handledError = handleServiceError(error, 'deleteMessage');
    throw handledError;
  }
};

// Thu hồi tin nhắn nếu người dùng là người gửi và trong vòng 10 phút
export const recallMessage = async (messageId, collectionName = 'messages', userId, type) => {
  try {
    validateRequired(messageId, 'Message ID');
    validateRequired(userId, 'User ID');
    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);
    if (!messageDoc.exists()) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_NOT_FOUND, 'Tin nhắn không tồn tại');
    }
    const messageData = messageDoc.data();
    if (messageData.uid !== userId) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_PERMISSION_DENIED, 'Chỉ người gửi mới có thể thu hồi tin nhắn');
    }
    if (messageData.recalled) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_ALREADY_EXISTS, 'Tin nhắn đã được thu hồi');
    }
    const now = new Date();
    const messageTime = messageData.createdAt?.toDate ? messageData.createdAt.toDate() : new Date(messageData.createdAt?.seconds * 1000);
    const timeDiff = (now - messageTime) / 1000;
    if (timeDiff > 600) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_PERMISSION_DENIED, 'Không thể thu hồi tin nhắn sau 10 phút');
    }
    const recallData = {
      recalled: true,
      recalledAt: serverTimestamp(),
    };
    if (messageData.messageType === 'text' || !messageData.messageType) {
      recallData.originalText = messageData.text;
      recallData.text = 'Tin nhắn đã được thu hồi';
    } else if (messageData.messageType === 'file' || messageData.messageType === 'voice') {
      recallData.originalFileData = messageData.fileData;
      recallData.fileData = null;
      recallData.text = `${messageData.messageType === 'voice' ? 'Tin nhắn thoại' : 'File'} đã được thu hồi`;
    } else if (messageData.messageType === 'location') {
      recallData.originalLocationData = messageData.locationData;
      recallData.locationData = null;
      recallData.text = 'Vị trí đã được thu hồi';
    } else {
      recallData.text = 'Tin nhắn đã được thu hồi';
    }
    await updateDoc(messageRef, recallData);

    const fallbackLastMessage = recallData.text || 'Tin nhắn đã được thu hồi';
    const chatIdentifier =
      messageData.chatId || messageData.roomId || messageData.conversationId || null;
    const messageChatType = messageData.chatType || type;

    if ((messageChatType === 'room' || type === 'room') && chatIdentifier) {
      await updateRoomLastMessage(chatIdentifier, fallbackLastMessage, userId);
    } else if (
      (messageChatType === 'direct' || messageChatType === 'conversation' || type === 'direct') &&
      chatIdentifier
    ) {
      await updateConversationLastMessage(chatIdentifier, fallbackLastMessage, userId);
    }
    logSuccess('recallMessage', { messageId, userId, type });
    return true;
  } catch (error) {
    const handledError = handleServiceError(error, 'recallMessage');
    throw handledError;
  }
};

// Kiểm tra xem người dùng có thể thu hồi tin nhắn hay không
export const canRecallMessage = (message, userId) => {
  if (!message || message.uid !== userId) return false;
  if (message.recalled) return false;
  const now = new Date();
  const messageTime = message.createdAt?.toDate ? message.createdAt.toDate() : new Date(message.createdAt?.seconds * 1000);
  const timeDiff = (now - messageTime) / 1000;
  return timeDiff <= 600;
};

// Đánh dấu tin nhắn là đã đọc bởi người dùng
export const markMessageAsRead = async (messageId, userId, collectionName = 'messages', type) => {
  try {
    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);
    if (messageDoc.exists()) {
      const messageData = messageDoc.data();
      const readByDetails = messageData.readByDetails || {};
      if (!readByDetails[userId]) {
        await updateDoc(messageRef, {
          readByDetails: {
            ...readByDetails,
            [userId]: serverTimestamp()
          },
          lastReadAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    throw error;
  }
};

// Gửi tin nhắn mới, kiểm tra trạng thái chặn và tình trạng bạn bè cho tin nhắn trực tiếp
export const sendMessage = async (collectionName = 'messages', messageData) => {
  try {
    if (messageData.chatType === 'direct' && messageData.chatId) {
      const participantIds = messageData.chatId.split('_');
      if (participantIds.length === 2) {
        const [userA, userB] = participantIds;
        const senderId = messageData.uid;
        const recipientId = participantIds.find(id => id !== senderId);
        if (recipientId) {
          // Kiểm tra trạng thái chặn
          const blockStatus = await getMutualBlockStatus(senderId, recipientId);
          if (blockStatus.isBlocked) {
            if (blockStatus.aBlockedB && senderId === userA) {
              throw new Error('Không thể gửi tin nhắn - bạn đã chặn người dùng này');
            } else if (blockStatus.bBlockedA && senderId === userB) {
              throw new Error('Không thể gửi tin nhắn - bạn đã chặn người dùng này');
            } else if (blockStatus.aBlockedB && senderId === userB) {
              throw new Error('Không thể gửi tin nhắn - người dùng này đã chặn bạn');
            } else if (blockStatus.bBlockedA && senderId === userA) {
              throw new Error('Không thể gửi tin nhắn - người dùng này đã chặn bạn');
            }
          }

          // Kiểm tra tình trạng bạn bè cho tin nhắn trực tiếp
          const isFriends = await areUsersFriends(senderId, recipientId);
          if (!isFriends) {
            throw new Error('Không thể gửi tin nhắn - chỉ có thể nhắn tin với bạn bè');
          }
        }
      }
    }

    // Lưu trữ tin nhắn
    const processedMessageData = { ...messageData };

    const docRef = collection(db, collectionName);
    const result = await addDoc(docRef, {
      ...processedMessageData,
      createdAt: serverTimestamp(),
    });

    logSuccess('sendMessage', {
      messageId: result.id,
      messageType: messageData.messageType
    });

    return result.id;
  } catch (error) {
    throw error;
  }
};

// Thêm phản ứng emoji vào tin nhắn
export const addReaction = async (messageId, userId, emoji, collectionName = 'messages') => {
  try {
    validateRequired(messageId, 'Message ID');
    validateRequired(userId, 'User ID');
    validateRequired(emoji, 'Emoji');
    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);
    if (!messageDoc.exists()) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_NOT_FOUND, 'Tin nhắn không tồn tại');
    }
    const messageData = messageDoc.data();
    const reactions = messageData.reactions || {};
    const currentUsers = reactions[emoji] || [];
    if (currentUsers.includes(userId)) {
      return;
    }
    reactions[emoji] = [...currentUsers, userId];
    await updateDoc(messageRef, {
      reactions,
      updatedAt: serverTimestamp(),
    });
    logSuccess('addReaction', { messageId, userId, emoji });
  } catch (error) {
    const handledError = handleServiceError(error, 'addReaction');
    throw handledError;
  }
};

// Xóa phản ứng emoji khỏi tin nhắn
export const removeReaction = async (messageId, userId, emoji, collectionName = 'messages') => {
  try {
    validateRequired(messageId, 'Message ID');
    validateRequired(userId, 'User ID');
    validateRequired(emoji, 'Emoji');
    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);
    if (!messageDoc.exists()) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_NOT_FOUND, 'Tin nhắn không tồn tại');
    }
    const messageData = messageDoc.data();
    const reactions = messageData.reactions || {};
    if (!reactions[emoji]) {
      return;
    }
    reactions[emoji] = reactions[emoji].filter(id => id !== userId);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
    await updateDoc(messageRef, {
      reactions,
      updatedAt: serverTimestamp(),
    });
    logSuccess('removeReaction', { messageId, userId, emoji });
  } catch (error) {
    const handledError = handleServiceError(error, 'removeReaction');
    throw handledError;
  }
};

// Chuyển đổi phản ứng emoji (thêm hoặc xóa)
export const toggleReaction = async (messageId, userId, emoji, collectionName = 'messages') => {
  try {
    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);
    if (!messageDoc.exists()) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_NOT_FOUND, 'Tin nhắn không tồn tại');
    }
    const messageData = messageDoc.data();
    const reactions = messageData.reactions || {};
    const currentUsers = reactions[emoji] || [];
    const hasReacted = currentUsers.includes(userId);
    if (hasReacted) {
      await removeReaction(messageId, userId, emoji, collectionName);
      return false;
    } else {
      await addReaction(messageId, userId, emoji, collectionName);
      return true;
    }
  } catch (error) {
    const handledError = handleServiceError(error, 'toggleReaction');
    throw handledError;
  }
};

// Tìm kiếm tin nhắn trong cuộc trò chuyện dựa trên từ khóa
export const searchMessagesInChat = async (chatId, searchTerm, limitCount = 50) => {
  try {
    validateRequired(chatId, 'Chat ID');
    validateRequired(searchTerm, 'Search term');
    const messagesRef = collection(db, 'messages');
    const searchQuery = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(searchQuery);
    const matchingMessages = [];
    querySnapshot.forEach((doc) => {
      const messageData = { id: doc.id, ...doc.data() };
      const messageText = (messageData.text || '').toLowerCase();
      const displayName = (messageData.displayName || '').toLowerCase();
      const searchText = searchTerm.toLowerCase();
      const fileName = messageData.fileData?.name?.toLowerCase() || '';
      if (messageText.includes(searchText) ||
        displayName.includes(searchText) ||
        fileName.includes(searchText)) {
        matchingMessages.push(messageData);
      }
    });
    logSuccess('searchMessagesInChat', {
      chatId,
      searchTerm,
      resultCount: matchingMessages.length
    });
    return matchingMessages;
  } catch (error) {
    const handledError = handleServiceError(error, 'searchMessagesInChat');
    throw handledError;
  }
};

// Chuyển tiếp tin nhắn bằng cách gửi tin nhắn mới với cờ forwarded
export const forwardMessage = async (collectionName = 'messages', messageData) => {
  try {
    // Chuyển tiếp tin nhắn là gửi tin nhắn mới với cờ forwarded
    const forwardedMessageData = {
      ...messageData,
      forwarded: true,
    };

    return await sendMessage(collectionName, forwardedMessageData);
  } catch (error) {
    throw error;
  }
};
