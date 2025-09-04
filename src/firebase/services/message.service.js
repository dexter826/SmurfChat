/**
 * Message Service - Firebase Firestore Operations
 * 
 * Handles all message-related operations including CRUD operations,
 * read status management, and message validation
 * 
 * @fileoverview Message service with comprehensive type safety and error handling
 * @version 2.0.0
 * @since 2025-09-04
 * 
 * @typedef {import('../types/database.types').Message} Message
 * @typedef {import('../types/database.types').MessageId} MessageId  
 * @typedef {import('../types/database.types').UserId} UserId
 * @typedef {import('../types/database.types').RoomId} RoomId
 * @typedef {import('../types/database.types').ConversationId} ConversationId
 * @typedef {import('../types/database.types').CreateMessageData} CreateMessageData
 * @typedef {import('../types/database.types').ApiResponse} ApiResponse
 */

import { doc, updateDoc, getDoc, deleteDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../config';
import { getMutualBlockStatus } from '../utils/block.utils';
import { updateRoomLastMessage, updateConversationLastMessage } from '../utils/conversation.utils';
import { handleServiceError, logSuccess, validateRequired, ErrorTypes, SmurfChatError } from '../utils/error.utils';

/**
 * Utility function to derive readBy array from readByDetails
 * 
 * @param {Object} [readByDetails={}] - Object with userId: timestamp pairs
 * @returns {string[]} Array of user IDs who have read the message
 * @example
 * const readBy = getReadByFromDetails({ 'user1': timestamp, 'user2': timestamp });
 * // Returns: ['user1', 'user2']
 */
export const getReadByFromDetails = (readByDetails = {}) => {
  return Object.keys(readByDetails);
};

/**
 * Delete message from Firestore (hard delete)
 * 
 * @param {MessageId} messageId - The ID of the message to delete
 * @param {string} [collectionName='messages'] - The collection name (default: 'messages')
 * @param {string} [type] - Type for logging purposes
 * @returns {Promise<ApiResponse<void>>} Success response or error
 * @throws {SmurfChatError} When messageId is invalid or deletion fails
 * 
 * @example
 * await deleteMessage('msg123', 'messages', 'room');
 */
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

// Recall message (withdraw message within time limit)
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
    
    // Check if user is the sender
    if (messageData.uid !== userId) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_PERMISSION_DENIED, 'Chỉ người gửi mới có thể thu hồi tin nhắn');
    }

    // Check if message is already recalled
    if (messageData.recalled) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_ALREADY_EXISTS, 'Tin nhắn đã được thu hồi');
    }

    // Check time limit (10 minutes = 600 seconds)
    const now = new Date();
    const messageTime = messageData.createdAt?.toDate ? messageData.createdAt.toDate() : new Date(messageData.createdAt?.seconds * 1000);
    const timeDiff = (now - messageTime) / 1000; // difference in seconds

    if (timeDiff > 600) { // 10 minutes
      throw new SmurfChatError(ErrorTypes.BUSINESS_PERMISSION_DENIED, 'Không thể thu hồi tin nhắn sau 10 phút');
    }

    // Prepare recall data based on message type
    const recallData = {
      recalled: true,
      recalledAt: serverTimestamp(),
    };

    // Handle different message types
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
      // For any other message types
      recallData.text = 'Tin nhắn đã được thu hồi';
    }

    // Update the message
    await updateDoc(messageRef, recallData);

    // Update room/conversation lastMessage if this was the latest message
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

// Check if message can be recalled (helper function)
export const canRecallMessage = (message, userId) => {
  if (!message || message.uid !== userId) return false;
  if (message.recalled) return false;
  
  const now = new Date();
  const messageTime = message.createdAt?.toDate ? message.createdAt.toDate() : new Date(message.createdAt?.seconds * 1000);
  const timeDiff = (now - messageTime) / 1000; // difference in seconds
  
  return timeDiff <= 600; // 10 minutes
};

// Mark message as read
export const markMessageAsRead = async (messageId, userId, collectionName = 'messages', type) => {
  try {
    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);

    if (messageDoc.exists()) {
      const messageData = messageDoc.data();
      const readByDetails = messageData.readByDetails || {};

      // Only update if user hasn't read this message yet
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
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Send message with block check
export const sendMessage = async (collectionName = 'messages', messageData) => {
  try {
    // Check for blocks in direct messages
    if (messageData.chatType === 'direct' && messageData.chatId) {
      // Extract participant IDs from chatId (format: uid1_uid2)
      const participantIds = messageData.chatId.split('_');
      
      if (participantIds.length === 2) {
        const [userA, userB] = participantIds;
        const senderId = messageData.uid;
        const recipientId = participantIds.find(id => id !== senderId);
        
        if (recipientId) {
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
        }
      }
    }

    // Send the message
    const docRef = collection(db, collectionName);
    const result = await addDoc(docRef, {
      ...messageData,
      createdAt: serverTimestamp(),
    });
    
  return result.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Add reaction to message
 * 
 * @param {MessageId} messageId - The ID of the message to react to
 * @param {UserId} userId - The ID of the user adding the reaction
 * @param {string} emoji - The emoji to add as reaction
 * @param {string} [collectionName='messages'] - The collection name
 * @returns {Promise<void>}
 */
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
    
    // Get current users for this emoji
    const currentUsers = reactions[emoji] || [];
    
    // Check if user already reacted with this emoji
    if (currentUsers.includes(userId)) {
      return; // User already reacted with this emoji
    }
    
    // Add user to emoji reactions
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

/**
 * Remove reaction from message
 * 
 * @param {MessageId} messageId - The ID of the message to remove reaction from
 * @param {UserId} userId - The ID of the user removing the reaction
 * @param {string} emoji - The emoji to remove
 * @param {string} [collectionName='messages'] - The collection name
 * @returns {Promise<void>}
 */
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
      return; // No reactions with this emoji
    }
    
    // Remove user from emoji reactions
    reactions[emoji] = reactions[emoji].filter(id => id !== userId);
    
    // If no users left with this emoji, remove the emoji entirely
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

/**
 * Toggle reaction on message (add if not present, remove if present)
 * 
 * @param {MessageId} messageId - The ID of the message to toggle reaction on
 * @param {UserId} userId - The ID of the user toggling the reaction
 * @param {string} emoji - The emoji to toggle
 * @param {string} [collectionName='messages'] - The collection name
 * @returns {Promise<boolean>} - Returns true if reaction was added, false if removed
 */
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
    
    // Check if user already reacted
    const hasReacted = currentUsers.includes(userId);
    
    if (hasReacted) {
      await removeReaction(messageId, userId, emoji, collectionName);
      return false; // Reaction removed
    } else {
      await addReaction(messageId, userId, emoji, collectionName);
      return true; // Reaction added
    }
  } catch (error) {
    const handledError = handleServiceError(error, 'toggleReaction');
    throw handledError;
  }
};
