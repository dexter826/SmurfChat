import { doc, updateDoc, getDoc, deleteDoc, serverTimestamp, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { getMutualBlockStatus } from '../utils/block.utils';
import { updateRoomLastMessage, updateConversationLastMessage } from '../utils/conversation.utils';
import { handleServiceError, logSuccess, validateRequired, ErrorTypes, SmurfChatError } from '../utils/error.utils';
import { areUsersFriends } from './friend.service';

export const getReadByFromDetails = (readByDetails = {}) => {
  return Object.keys(readByDetails);
};

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
    if (type === 'room' && messageData.roomId) {
      await updateRoomLastMessage(messageData.roomId, 'Tin nhắn đã được thu hồi', userId);
    } else if (type === 'direct' && messageData.conversationId) {
      await updateConversationLastMessage(messageData.conversationId, 'Tin nhắn đã được thu hồi', userId);
    }
    logSuccess('recallMessage', { messageId, userId, type });
    return true;
  } catch (error) {
    const handledError = handleServiceError(error, 'recallMessage');
    throw handledError;
  }
};

export const canRecallMessage = (message, userId) => {
  if (!message || message.uid !== userId) return false;
  if (message.recalled) return false;
  const now = new Date();
  const messageTime = message.createdAt?.toDate ? message.createdAt.toDate() : new Date(message.createdAt?.seconds * 1000);
  const timeDiff = (now - messageTime) / 1000;
  return timeDiff <= 600;
};

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

export const sendMessage = async (collectionName = 'messages', messageData) => {
  try {
    if (messageData.chatType === 'direct' && messageData.chatId) {
      const participantIds = messageData.chatId.split('_');
      if (participantIds.length === 2) {
        const [userA, userB] = participantIds;
        const senderId = messageData.uid;
        const recipientId = participantIds.find(id => id !== senderId);
        if (recipientId) {
          // Check block status
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

          // Check friendship status for direct messages
          const isFriends = await areUsersFriends(senderId, recipientId);
          if (!isFriends) {
            throw new Error('Không thể gửi tin nhắn - chỉ có thể nhắn tin với bạn bè');
          }
        }
      }
    }

    // Store messages without encryption
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

export const forwardMessage = async (collectionName = 'messages', messageData) => {
  try {
    // Forward message is essentially sending a new message with forwarded flag
    const forwardedMessageData = {
      ...messageData,
      forwarded: true,
    };

    return await sendMessage(collectionName, forwardedMessageData);
  } catch (error) {
    throw error;
  }
};

