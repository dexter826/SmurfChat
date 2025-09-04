import { collection, serverTimestamp, doc, updateDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import { handleServiceError } from '../utils/error.utils';

// Room management services

// Leave a room
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
    const handledError = handleServiceError(error, 'leaveRoom');
    throw handledError;
  }
};

// Transfer room admin rights to another user
export const transferRoomAdmin = async (roomId, newAdminId) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      admin: newAdminId,
    });
  } catch (error) {
    const handledError = handleServiceError(error, 'transferRoomAdmin');
    throw handledError;
  }
};

// Update room avatar
export const updateRoomAvatar = async (roomId, avatarUrl) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      avatar: avatarUrl,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    const handledError = handleServiceError(error, 'updateRoomAvatar');
    throw handledError;
  }
};

// Dissolve room (hard delete with cleanup)
export const dissolveRoom = async (roomId) => {
  try {
    // Delete all messages in the room first
    const messagesQuery = query(
      collection(db, 'messages'), 
      where('chatType', '==', 'room'),
      where('chatId', '==', roomId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    const messageDeletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(messageDeletePromises);

    // Delete all events in the room
    const eventsQuery = query(collection(db, 'events'), where('roomId', '==', roomId));
    const eventsSnapshot = await getDocs(eventsQuery);
    const eventDeletePromises = eventsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(eventDeletePromises);

    // Delete all votes in the room
    const votesQuery = query(collection(db, 'votes'), where('roomId', '==', roomId));
    const votesSnapshot = await getDocs(votesQuery);
    const voteDeletePromises = votesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(voteDeletePromises);

    // Finally delete the room itself
    const roomRef = doc(db, 'rooms', roomId);
    await deleteDoc(roomRef);

    return true;
  } catch (error) {
    const handledError = handleServiceError(error, 'dissolveRoom');
    throw handledError;
  }
};
