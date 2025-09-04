import { doc, updateDoc, getDoc, deleteDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../config';
import { areMutuallyBlocked } from './block.service';
import { updateRoomLastMessage, updateConversationLastMessage } from '../utils/conversation.utils';

// Delete message (hard delete)
export const deleteMessage = async (messageId, collectionName = 'messages', type) => {
  try {
    const messageRef = doc(db, collectionName, messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Recall message (withdraw message within time limit)
export const recallMessage = async (messageId, collectionName = 'messages', userId, type) => {
  try {
    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error('Tin nhắn không tồn tại');
    }

    const messageData = messageDoc.data();
    
    // Check if user is the sender
    if (messageData.uid !== userId) {
      throw new Error('Chỉ người gửi mới có thể thu hồi tin nhắn');
    }

    // Check if message is already recalled
    if (messageData.recalled) {
      throw new Error('Tin nhắn đã được thu hồi trước đó');
    }

    // Check time limit (10 minutes = 600 seconds)
    const now = new Date();
    const messageTime = messageData.createdAt?.toDate ? messageData.createdAt.toDate() : new Date(messageData.createdAt?.seconds * 1000);
    const timeDiff = (now - messageTime) / 1000; // difference in seconds

    if (timeDiff > 600) { // 10 minutes
      throw new Error('Không thể thu hồi tin nhắn sau 10 phút');
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

    return true;
  } catch (error) {
    console.error('Error recalling message:', error);
    throw error;
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
      const readBy = messageData.readBy || [];
      const readByDetails = messageData.readByDetails || {};

      if (!readBy.includes(userId)) {
        await updateDoc(messageRef, {
          readBy: [...readBy, userId],
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
          const blockStatus = await areMutuallyBlocked(senderId, recipientId);
          
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
