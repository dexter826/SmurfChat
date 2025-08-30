import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config';

// Create or update conversation
export const createOrUpdateConversation = async (conversationData) => {
  const { id, ...data } = conversationData;
  const conversationRef = doc(db, 'conversations', id);

  try {
    await setDoc(conversationRef, {
      ...data,
      id,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  } catch (error) {
    console.error('Error creating/updating conversation:', error);
    throw error;
  }
};

// Update conversation last message
export const updateConversationLastMessage = async (conversationId, message, userId) => {
  const conversationRef = doc(db, 'conversations', conversationId);

  try {
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
  const roomRef = doc(db, 'rooms', roomId);

  try {
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

// Delete conversation
export const deleteConversation = async (conversationId) => {
  try {
    // Delete all messages in this conversation first
    const messagesQuery = query(
      collection(db, 'directMessages'),
      where('conversationId', '==', conversationId)
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
