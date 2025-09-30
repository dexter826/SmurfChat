import { serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';

// Cập nhật cài đặt người dùng (ví dụ: tùy chọn quyền riêng tư)
export const updateUserSettings = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Lỗi cập nhật cài đặt người dùng:', error);
    throw error;
  }
};

// Cập nhật thời gian cuối cùng thấy người dùng trong phòng/cuộc trò chuyện
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
    console.error('Lỗi cập nhật thời gian cuối cùng thấy:', error);
    throw error;
  }
};

// Trợ giúp trạng thái đang nhập
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
      });
    }
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái đang nhập:', error);
    throw error;
  }
};
