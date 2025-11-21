import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { getMutualBlockStatus } from '../utils/block.utils';
import { updateConversationLastMessage, updateRoomLastMessage } from '../utils/conversation.utils';
import { handleServiceError, logSuccess, SmurfChatError, ErrorTypes } from '../utils/error.utils';

// Xuất lại các hàm tiện ích để tương thích ngược
export { updateConversationLastMessage, updateRoomLastMessage };

// Tạo hoặc cập nhật cuộc trò chuyện
export const createOrUpdateConversation = async (conversationData) => {
  const { id, participants, ...data } = conversationData;

  // Kiểm tra nếu là cuộc trò chuyện trực tiếp (2 người tham gia)
  if (participants && participants.length === 2) {
    const [userA, userB] = participants;
    const blockStatus = await getMutualBlockStatus(userA, userB);

    if (blockStatus.isBlocked) {
      if (blockStatus.aBlockedB && blockStatus.bBlockedA) {
        throw new SmurfChatError(ErrorTypes.BUSINESS_PERMISSION_DENIED, 'Không thể tạo cuộc trò chuyện - cả hai người dùng đã chặn lẫn nhau');
      } else if (blockStatus.aBlockedB) {
        throw new SmurfChatError(ErrorTypes.BUSINESS_PERMISSION_DENIED, 'Không thể tạo cuộc trò chuyện - bạn đã chặn người dùng này');
      } else {
        throw new SmurfChatError(ErrorTypes.BUSINESS_PERMISSION_DENIED, 'Không thể tạo cuộc trò chuyện - người dùng này đã chặn bạn');
      }
    }
  }

  const conversationRef = doc(db, 'conversations', id);

  try {
    await setDoc(conversationRef, {
      ...data,
      participants,
      id,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  } catch (error) {
    const handledError = handleServiceError(error, 'createOrUpdateConversation');
    throw handledError;
  }
};

// Xóa cuộc trò chuyện
export const deleteConversation = async (conversationId) => {
  try {
    // Xóa tất cả tin nhắn trong cuộc trò chuyện này trước
    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatType', '==', 'direct'),
      where('chatId', '==', conversationId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);

    // Xóa tất cả tin nhắn theo lô
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Sau đó xóa chính cuộc trò chuyện
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
  } catch (error) {
    const handledError = handleServiceError(error, 'deleteConversation');
    throw handledError;
  }
};

// Xóa cuộc trò chuyện/phòng chat (chỉ ẩn tin nhắn cũ cho user hiện tại)
export const deleteChatForUser = async (chatId, userId, isConversation = true) => {
  try {
    const collectionName = isConversation ? 'conversations' : 'rooms';
    const docRef = doc(db, collectionName, chatId);

    await updateDoc(docRef, {
      [`deletedBy.${userId}`]: serverTimestamp(),
    });

    logSuccess('deleteChatForUser', { chatId, userId, isConversation });
  } catch (error) {
    const handledError = handleServiceError(error, 'deleteChatForUser');
    throw handledError;
  }
};

// Ghim/Bỏ ghim cuộc trò chuyện hoặc phòng
export const togglePinChat = async (chatId, isPinned, isConversation = false) => {
  try {
    const collectionName = isConversation ? 'conversations' : 'rooms';
    const docRef = doc(db, collectionName, chatId);
    await updateDoc(docRef, {
      pinned: !isPinned,
      pinnedAt: !isPinned ? serverTimestamp() : null,
    });

    logSuccess('togglePinChat', { chatId, isPinned, isConversation });
  } catch (error) {
    const handledError = handleServiceError(error, 'togglePinChat');
    throw handledError;
  }
};
