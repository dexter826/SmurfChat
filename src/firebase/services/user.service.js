import { serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';

// User management services

// Update user settings (e.g., privacy options)
export const updateUserSettings = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

// Update last seen timestamp for user in room/conversation
export const updateLastSeen = async (roomId, userId, isConversation = false) => {
  try {
    const collectionName = isConversation ? 'conversations' : 'rooms';
    const docRef = doc(db, collectionName, roomId);
    const docSnapshot = await getDoc(docRef);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      const lastSeen = data.lastSeen || {};

      await updateDoc(docRef, {
        lastSeen: {
          ...lastSeen,
          [userId]: serverTimestamp()
        }
      });
    }
  } catch (error) {
    console.error('Error updating last seen:', error);
    throw error;
  }
};

// Typing status helpers
export const setTypingStatus = async (chatId, userId, isTyping, isConversation = false) => {
  try {
    const collectionName = isConversation ? 'conversations' : 'rooms';
    const docRef = doc(db, collectionName, chatId);
    const docSnapshot = await getDoc(docRef);
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      const typingStatus = data.typingStatus || {};
      await updateDoc(docRef, {
        typingStatus: {
          ...typingStatus,
          [userId]: isTyping
        },
        typingUpdatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating typing status:', error);
    throw error;
  }
};
