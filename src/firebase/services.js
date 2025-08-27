import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './config';

export const addDocument = (collectionName, data) => {
  const docRef = collection(db, collectionName);

  addDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};

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

// Room management services
export const leaveRoom = async (roomId, userId) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (roomDoc.exists()) {
      const roomData = roomDoc.data();
      const updatedMembers = roomData.members.filter(memberId => memberId !== userId);
      
      await updateDoc(roomRef, {
        members: updatedMembers,
      });
    }
  } catch (error) {
    console.error('Error leaving room:', error);
    throw error;
  }
};

export const transferRoomAdmin = async (roomId, newAdminId) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      admin: newAdminId,
    });
  } catch (error) {
    console.error('Error transferring room admin:', error);
    throw error;
  }
};

// Event management services
export const createEvent = async (eventData) => {
  try {
    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

export const updateEvent = async (eventId, eventData) => {
  const eventRef = doc(db, 'events', eventId);
  
  try {
    await updateDoc(eventRef, {
      ...eventData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEvent = async (eventId) => {
  const eventRef = doc(db, 'events', eventId);
  
  try {
    await updateDoc(eventRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

// Dissolve room (admin only)
export const dissolveRoom = async (roomId) => {
  const roomRef = doc(db, 'rooms', roomId);
  
  try {
    await updateDoc(roomRef, {
      dissolved: true,
      dissolvedAt: serverTimestamp(),
      members: [],
    });
    
    // Also mark all messages in the room as archived
    // Note: In a real app, you might want to use Cloud Functions for this
    return true;
  } catch (error) {
    console.error('Error dissolving room:', error);
    throw error;
  }
};

// Vote management services
export const createVote = async (voteData) => {
  try {
    const docRef = await addDoc(collection(db, 'votes'), {
      ...voteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      votes: {}, // Object to store user votes: { userId: optionIndex }
      voteCounts: voteData.options.map(() => 0), // Array of vote counts for each option
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating vote:', error);
    throw error;
  }
};

export const castVote = async (voteId, userId, optionIndex) => {
  const voteRef = doc(db, 'votes', voteId);
  
  try {
    // Get current vote data
    const voteDoc = await getDoc(voteRef);
    if (!voteDoc.exists()) {
      throw new Error('Vote not found');
    }
    
    const voteData = voteDoc.data();
    const currentVotes = voteData.votes || {};
    const currentCounts = [...(voteData.voteCounts || [])];
    
    // Remove previous vote if exists
    if (currentVotes[userId] !== undefined) {
      const previousOption = currentVotes[userId];
      currentCounts[previousOption] = Math.max(0, currentCounts[previousOption] - 1);
    }
    
    // Add new vote
    currentVotes[userId] = optionIndex;
    currentCounts[optionIndex] = (currentCounts[optionIndex] || 0) + 1;
    
    await updateDoc(voteRef, {
      votes: currentVotes,
      voteCounts: currentCounts,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Error casting vote:', error);
    throw error;
  }
};

export const deleteVote = async (voteId) => {
  const voteRef = doc(db, 'votes', voteId);
  
  try {
    await updateDoc(voteRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting vote:', error);
    throw error;
  }
};

// Parse time expressions from Vietnamese text
export const parseTimeFromMessage = (message) => {
  const timePatterns = [
    // "lúc 3h chiều mai", "3h chiều mai", "15h mai"
    /(lúc\s+)?(\d{1,2})h(\d{0,2})?(\s+(sáng|chiều|tối))?\s+(mai|ngày mai)/gi,
    // "lúc 9h30 sáng thứ 2", "9h sáng thứ hai"
    /(lúc\s+)?(\d{1,2})h(\d{0,2})?(\s+(sáng|chiều|tối))?\s+(thứ\s+(hai|ba|tư|năm|sáu|bảy|2|3|4|5|6|7)|chủ nhật)/gi,
    // "15:30 ngày 25/12", "lúc 14:00 ngày 15/10"
    /(lúc\s+)?(\d{1,2}):(\d{2})\s+(ngày\s+)?(\d{1,2})\/(\d{1,2})/gi,
  ];

  const dayMap = {
    'hai': 1, 'ba': 2, 'tư': 3, 'năm': 4, 'sáu': 5, 'bảy': 6, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6
  };

  for (const pattern of timePatterns) {
    const match = pattern.exec(message.toLowerCase());
    if (match) {
      const now = new Date();
      let targetDate = new Date();

      if (match[0].includes('mai')) {
        targetDate.setDate(now.getDate() + 1);
        const hour = parseInt(match[2]);
        const minute = match[3] ? parseInt(match[3]) : 0;
        const period = match[5];
        
        let finalHour = hour;
        if (period === 'chiều' && hour < 12) finalHour += 12;
        if (period === 'tối' && hour < 12) finalHour += 12;
        
        targetDate.setHours(finalHour, minute, 0, 0);
        return targetDate;
      }
      
      if (match[0].includes('thứ')) {
        const dayName = match[7];
        const targetDay = dayMap[dayName] || 0;
        const currentDay = now.getDay();
        const daysToAdd = (targetDay - currentDay + 7) % 7 || 7;
        
        targetDate.setDate(now.getDate() + daysToAdd);
        const hour = parseInt(match[2]);
        const minute = match[3] ? parseInt(match[3]) : 0;
        const period = match[5];
        
        let finalHour = hour;
        if (period === 'chiều' && hour < 12) finalHour += 12;
        if (period === 'tối' && hour < 12) finalHour += 12;
        
        targetDate.setHours(finalHour, minute, 0, 0);
        return targetDate;
      }
      
      if (match[5] && match[6]) {
        const hour = parseInt(match[2]);
        const minute = parseInt(match[3]);
        const day = parseInt(match[5]);
        const month = parseInt(match[6]) - 1;
        
        targetDate.setMonth(month, day);
        targetDate.setHours(hour, minute, 0, 0);
        
        if (targetDate < now) {
          targetDate.setFullYear(now.getFullYear() + 1);
        }
        
        return targetDate;
      }
    }
  }
  
  return null;
};

// Extract event title from message
export const extractEventTitle = (message) => {
  const eventPatterns = [
    /^(.+?)\s+(lúc|vào|tại)\s+/i,
    /^(.+?)\s+(\d{1,2}h)/i,
  ];
  
  for (const pattern of eventPatterns) {
    const match = pattern.exec(message);
    if (match) {
      return match[1].trim();
    }
  }
  
  return message.length > 50 ? message.substring(0, 50) + '...' : message;
};

// tao keywords cho displayName, su dung cho search
export const generateKeywords = (displayName) => {
  // liet ke tat cac hoan vi. vd: name = ["David", "Van", "Teo"]
  // => ["David", "Van", "Teo"], ["David", "Teo", "Van"], ["Teo", "David", "Van"],...
  const name = displayName.split(' ').filter((word) => word);

  const length = name.length;
  let flagArray = [];
  let result = [];
  let stringArray = [];

  /**
   * khoi tao mang flag false
   * dung de danh dau xem gia tri
   * tai vi tri nay da duoc su dung
   * hay chua
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

// Cập nhật avatar phòng chat
export const updateRoomAvatar = async (roomId, avatarUrl) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      avatar: avatarUrl,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật avatar phòng:', error);
    throw error;
  }
};
