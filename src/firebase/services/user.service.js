import { serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';

// User management services

// Generate keywords for displayName, used for search
export const generateKeywords = (displayName) => {
  // List all permutations. Example: name = ["David", "Van", "Teo"]
  // => ["David", "Van", "Teo"], ["David", "Teo", "Van"], ["Teo", "David", "Van"],...
  const name = displayName.split(' ').filter((word) => word);

  const length = name.length;
  let flagArray = [];
  let result = [];
  let stringArray = [];

  /**
   * Initialize flag array with false values
   * Used to mark if value at this position
   * has been used or not
   **/
  for (let i = 0; i < length; i++) {
    flagArray[i] = false;
  }

  const createKeywords = (name) => {
    const arrName = [];
    let curName = '';
    name.split('').forEach((letter) => {
      curName += letter;
      arrName.push(curName);
    });
    return arrName;
  };

  function findPermutation(k) {
    for (let i = 0; i < length; i++) {
      if (!flagArray[i]) {
        flagArray[i] = true;
        result[k] = name[i];

        if (k === length - 1) {
          stringArray.push(result.join(' '));
        }

        findPermutation(k + 1);
        flagArray[i] = false;
      }
    }
  }

  findPermutation(0);

  const keywords = stringArray.reduce((acc, cur) => {
    const words = createKeywords(cur);
    return [...acc, ...words];
  }, []);

  return keywords;
};

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
