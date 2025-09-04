import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { areMutuallyBlocked } from './block.service';
import { updateConversationLastMessage, updateRoomLastMessage } from '../utils/conversation.utils';

// Re-export utility functions for backward compatibility
export { updateConversationLastMessage, updateRoomLastMessage };

// Create or update conversation
export const createOrUpdateConversation = async (conversationData) => {
  const { id, participants, ...data } = conversationData;
  
  // Check if it's a direct conversation (2 participants)
  if (participants && participants.length === 2) {
    const [userA, userB] = participants;
    const blockStatus = await areMutuallyBlocked(userA, userB);
    
    if (blockStatus.isBlocked) {
      if (blockStatus.aBlockedB && blockStatus.bBlockedA) {
        throw new Error('Không thể tạo cuộc trò chuyện - cả hai người dùng đã chặn lẫn nhau');
      } else if (blockStatus.aBlockedB) {
        throw new Error('Không thể tạo cuộc trò chuyện - bạn đã chặn người dùng này');
      } else {
        throw new Error('Không thể tạo cuộc trò chuyện - người dùng này đã chặn bạn');
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
    console.error('Error creating/updating conversation:', error);
    throw error;
  }
};

// Delete conversation
export const deleteConversation = async (conversationId) => {
  try {
    // Delete all messages in this conversation first
    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatType', '==', 'direct'),
      where('chatId', '==', conversationId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    
    // Delete all messages in batches
    const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Then delete the conversation itself
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

// Pin/Unpin conversation or room
export const togglePinChat = async (chatId, isPinned, isConversation = false) => {
  try {
    const collectionName = isConversation ? 'conversations' : 'rooms';
    const docRef = doc(db, collectionName, chatId);
    await updateDoc(docRef, {
      pinned: !isPinned,
      pinnedAt: !isPinned ? serverTimestamp() : null,
    });
  } catch (error) {
    console.error('Error toggling pin status:', error);
    throw error;
  }
};
