import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { db, auth } from './config';

export const addDocument = (collectionName, data) => {
  const docRef = collection(db, collectionName);

  addDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// Authentication services
export const registerWithEmailAndPassword = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: displayName
    });

    // Create user document in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      displayName: displayName,
      email: user.email,
      photoURL: user.photoURL || null,
      uid: user.uid,
      providerId: 'password',
      searchVisibility: 'public',
      keywords: [
        ...generateKeywords(displayName?.toLowerCase()),
        ...generateKeywords(user.email?.toLowerCase()),
      ],
      createdAt: serverTimestamp(),
    });

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const loginWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
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

// Delete message
export const deleteMessage = async (messageId, collectionName = 'messages') => {
  try {
    const messageRef = doc(db, collectionName, messageId);
    await updateDoc(messageRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId, userId, collectionName = 'messages') => {
  try {
    const messageRef = doc(db, collectionName, messageId);
    const messageDoc = await getDoc(messageRef);

    if (messageDoc.exists()) {
      const messageData = messageDoc.data();
      const readBy = messageData.readBy || [];

      if (!readBy.includes(userId)) {
        await updateDoc(messageRef, {
          readBy: [...readBy, userId],
          lastReadAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Delete conversation
export const deleteConversation = async (conversationId) => {
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
    });
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

// ==============================
// Friends system services
// ==============================

// Send a friend request (if not existing)
export const sendFriendRequest = async (fromUserId, toUserId) => {
  if (fromUserId === toUserId) throw new Error('Không thể kết bạn với chính mình');
  const requestsRef = collection(db, 'friend_requests');

  // Check existing pending or accepted
  const q = query(
    requestsRef,
    where('participants', 'in', [
      [fromUserId, toUserId].sort().join('_'),
    ])
  );
  const snapshot = await getDocs(q);
  const exists = snapshot.docs.find(d => !d.data().deleted && d.data().status !== 'declined');
  if (exists) return exists.id;

  const docRef = await addDoc(requestsRef, {
    from: fromUserId,
    to: toUserId,
    participants: [fromUserId, toUserId].sort().join('_'),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const cancelFriendRequest = async (requestId, byUserId) => {
  const reqRef = doc(db, 'friend_requests', requestId);
  const req = await getDoc(reqRef);
  if (!req.exists()) throw new Error('Friend request not found');
  const data = req.data();
  if (data.from !== byUserId) throw new Error('Chỉ người gửi mới có thể hủy lời mời');
  await updateDoc(reqRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
};

export const acceptFriendRequest = async (requestId, byUserId) => {
  const reqRef = doc(db, 'friend_requests', requestId);
  const req = await getDoc(reqRef);
  if (!req.exists()) throw new Error('Friend request not found');
  const data = req.data();
  if (data.to !== byUserId) throw new Error('Chỉ người nhận mới có thể chấp nhận');

  await updateDoc(reqRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  // Add to friends collection (bidirectional via two docs or single edge)
  const friendsRef = collection(db, 'friends');
  const edgeId = [data.from, data.to].sort().join('_');
  await setDoc(doc(db, 'friends', edgeId), {
    id: edgeId,
    participants: [data.from, data.to],
    createdAt: serverTimestamp(),
  }, { merge: true });
};

export const declineFriendRequest = async (requestId, byUserId) => {
  const reqRef = doc(db, 'friend_requests', requestId);
  const req = await getDoc(reqRef);
  if (!req.exists()) throw new Error('Friend request not found');
  const data = req.data();
  if (data.to !== byUserId) throw new Error('Chỉ người nhận mới có thể từ chối');
  await updateDoc(reqRef, {
    status: 'declined',
    updatedAt: serverTimestamp(),
  });
};

export const removeFriendship = async (userA, userB) => {
  const edgeId = [userA, userB].sort().join('_');
  await deleteDoc(doc(db, 'friends', edgeId));
};

export const areUsersFriends = async (userA, userB) => {
  const edgeId = [userA, userB].sort().join('_');
  const ref = doc(db, 'friends', edgeId);
  const snap = await getDoc(ref);
  return snap.exists();
};

export const getPendingFriendRequest = async (userA, userB) => {
  const requestsRef = collection(db, 'friend_requests');
  const q = query(
    requestsRef,
    where('participants', '==', [userA, userB].sort().join('_')),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
};
