import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config';

/**
 * Conversation Utilities - Shared Functions
 * 
 * This file contains shared utility functions for updating conversations and rooms
 * to avoid circular dependencies between service files.
 * 
 * Created to resolve circular dependency issues between:
 * - message.service.js
 * - conversation.service.js
 */

// Update conversation last message
export const updateConversationLastMessage = async (conversationId, message, userId) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: message,
      lastMessageAt: serverTimestamp(),
      updatedBy: userId,
    });
  } catch (error) {
    console.error('Error updating conversation last message:', error);
    throw error;
  }
};

// Update room last message
export const updateRoomLastMessage = async (roomId, message, userId) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      lastMessage: message,
      lastMessageAt: serverTimestamp(),
      updatedBy: userId,
    });
  } catch (error) {
    console.error('Error updating room last message:', error);
    throw error;
  }
};

// Generic function to update last message for any chat type
export const updateLastMessage = async (type, chatId, message, userId) => {
  if (type === 'room') {
    await updateRoomLastMessage(chatId, message, userId);
  } else if (type === 'conversation' || type === 'direct') {
    await updateConversationLastMessage(chatId, message, userId);
  }
};
