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

import { doc, updateDoc, getDoc, deleteDoc, serverTimestamp, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { getMutualBlockStatus } from '../utils/block.utils';
import { updateRoomLastMessage, updateConversationLastMessage } from '../utils/conversation.utils';
import { handleServiceError, logSuccess, validateRequired, ErrorTypes, SmurfChatError } from '../utils/error.utils';
import {
  encryptContent,
  decryptContent,
  encryptFileData,
  decryptFileData,
  encryptLocationData,
  decryptLocationData,
  hashContent,
  generateMasterKey
} from '../utils/encryption.utils';

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
export const recallMessage = async (messageId, collectionName = 'messages', userId, type, userCredentials = null) => {
  try {
    validateRequired(messageId, 'Message ID');
    validateRequired(userId, 'User ID');

    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_NOT_FOUND, 'Tin nhắn không tồn tại');
    }

    const messageData = messageDoc.data();

    // Generate master key if user credentials provided and message is encrypted
    let masterKey = null;
    if (userCredentials && messageData.isEncrypted) {
      masterKey = generateMasterKey(userCredentials.email, userCredentials.password);
    }

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

    // Handle different message types (considering encryption)
    if (messageData.messageType === 'text' || !messageData.messageType) {
      if (messageData.isEncrypted) {
        recallData.originalText = messageData.encryptedText;
        recallData.encryptedText = encryptContent('Tin nhắn đã được thu hồi', masterKey);
      } else {
        recallData.originalText = messageData.text;
        recallData.text = 'Tin nhắn đã được thu hồi';
      }
    } else if (messageData.messageType === 'file' || messageData.messageType === 'voice') {
      if (messageData.isEncrypted) {
        recallData.originalFileData = messageData.encryptedFileData;
        recallData.encryptedFileData = null;
        recallData.encryptedText = encryptContent(`${messageData.messageType === 'voice' ? 'Tin nhắn thoại' : 'File'} đã được thu hồi`, masterKey);
      } else {
        recallData.originalFileData = messageData.fileData;
        recallData.fileData = null;
        recallData.text = `${messageData.messageType === 'voice' ? 'Tin nhắn thoại' : 'File'} đã được thu hồi`;
      }
    } else if (messageData.messageType === 'location') {
      if (messageData.isEncrypted) {
        recallData.originalLocationData = messageData.encryptedLocationData;
        recallData.encryptedLocationData = null;
        recallData.encryptedText = encryptContent('Vị trí đã được thu hồi', masterKey);
      } else {
        recallData.originalLocationData = messageData.locationData;
        recallData.locationData = null;
        recallData.text = 'Vị trí đã được thu hồi';
      }
    } else {
      // For any other message types
      if (messageData.isEncrypted) {
        recallData.encryptedText = encryptContent('Tin nhắn đã được thu hồi', masterKey);
      } else {
        recallData.text = 'Tin nhắn đã được thu hồi';
      }
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
    throw error;
  }
};

// Send message with block check and optional encryption
export const sendMessage = async (collectionName = 'messages', messageData, encryptMessage = false, userCredentials = null) => {
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

    let processedMessageData = { ...messageData };

    // Handle encryption if requested
    if (encryptMessage && userCredentials) {
      try {
        const masterKey = generateMasterKey(userCredentials.email, userCredentials.password);

        const finalMessageData = {
          ...processedMessageData,
          isEncrypted: true
        };

        // Encrypt text content
        if (messageData.text) {
          const contentHash = hashContent(messageData.text);
          const encryptedText = encryptContent(messageData.text, masterKey);

          finalMessageData.encryptedText = encryptedText;
          finalMessageData.contentHash = contentHash;
          // Don't create text field for encrypted messages
        }

        // Encrypt file data if present
        if (messageData.fileData) {
          const encryptedFileData = encryptFileData(messageData.fileData, masterKey);
          finalMessageData.encryptedFileData = encryptedFileData;
          // Don't create fileData field for encrypted messages
        }

        // Encrypt location data if present
        if (messageData.locationData) {
          const encryptedLocationData = encryptLocationData(messageData.locationData, masterKey);
          finalMessageData.encryptedLocationData = encryptedLocationData;
          // Don't create locationData field for encrypted messages
        }

        processedMessageData = finalMessageData;

        if (messageData.recalled) {
          processedMessageData = {
            ...processedMessageData,
            originalText: messageData.originalText ? encryptContent(messageData.originalText, masterKey) : null,
            originalFileData: messageData.originalFileData ? encryptFileData(messageData.originalFileData, masterKey) : null,
            originalLocationData: messageData.originalLocationData ? encryptLocationData(messageData.originalLocationData, masterKey) : null
          };
        }

      } catch (encryptionError) {
        throw new Error('Không thể mã hóa tin nhắn: ' + encryptionError.message);
      }
    } else {
      processedMessageData.isEncrypted = false;
    }

    // Send the message
    const docRef = collection(db, collectionName);
    const result = await addDoc(docRef, {
      ...processedMessageData,
      createdAt: serverTimestamp(),
    });

    logSuccess('sendMessage', {
      messageId: result.id,
      encrypted: encryptMessage,
      messageType: messageData.messageType
    });

    return result.id;
  } catch (error) {
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

/**
 * Decrypt message content if encrypted
 *
 * @param {object} messageData - Raw message data from Firestore
 * @param {string} masterKey - Master key for decryption
 * @returns {object} Decrypted message data
 */
export const decryptMessage = (messageData, masterKey) => {
  if (!messageData || !masterKey) {
    return messageData;
  }

  try {
    let decryptedData = { ...messageData };

    // Decrypt text content if encrypted
    if (messageData.isEncrypted && messageData.encryptedText) {
      decryptedData.text = decryptContent(messageData.encryptedText, masterKey);
      decryptedData.encryptedText = null; // Remove encrypted version
    }

    // Decrypt file data if encrypted
    if (messageData.isEncrypted && messageData.encryptedFileData) {
      decryptedData.fileData = decryptFileData(messageData.encryptedFileData, masterKey);
      decryptedData.encryptedFileData = null; // Remove encrypted version
    }

    // Decrypt location data if encrypted
    if (messageData.isEncrypted && messageData.encryptedLocationData) {
      decryptedData.locationData = decryptLocationData(messageData.encryptedLocationData, masterKey);
      decryptedData.encryptedLocationData = null; // Remove encrypted version
    }

    // Decrypt recall data if present
    if (messageData.isEncrypted && messageData.recalled) {
      if (messageData.originalText) {
        decryptedData.originalText = decryptContent(messageData.originalText, masterKey);
      }
      if (messageData.originalFileData) {
        decryptedData.originalFileData = decryptFileData(messageData.originalFileData, masterKey);
      }
      if (messageData.originalLocationData) {
        decryptedData.originalLocationData = decryptLocationData(messageData.originalLocationData, masterKey);
      }
    }

    // Mark as decrypted
    decryptedData.isEncrypted = false;

    return decryptedData;
  } catch (error) {
    // Return original data if decryption fails
    return messageData;
  }
};

/**
 * Get decrypted message content for display
 *
 * @param {object} messageData - Raw message data from Firestore
 * @param {string} masterKey - Master key for decryption
 * @returns {object} Message data with decrypted content
 */
export const getDecryptedMessageContent = (messageData, masterKey) => {
  if (!messageData.isEncrypted) {
    return messageData;
  }

  return decryptMessage(messageData, masterKey);
};

/**
 * Search messages in a chat with optional text matching
 *
 * @param {string} chatId - The chat ID to search in
 * @param {string} searchTerm - The search term to match against message text
 * @param {number} limitCount - Maximum number of results to return (default: 50)
 * @returns {Promise<Array>} Array of matching messages
 *
 * @example
 * const results = await searchMessagesInChat('room123', 'hello', 20);
 */
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

      // Search in message text (case insensitive)
      const messageText = (messageData.text || '').toLowerCase();
      const displayName = (messageData.displayName || '').toLowerCase();
      const searchText = searchTerm.toLowerCase();

      // Also search in file names if present
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
