import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import { getMutualBlockStatus } from '../utils/block.utils';
import { handleServiceError, SmurfChatError, ErrorTypes } from '../utils/error.utils';

// Friends system services

// Send a friend request (if not existing)
export const sendFriendRequest = async (fromUserId, toUserId) => {
  try {
    if (fromUserId === toUserId) {
      throw new SmurfChatError('Không thể kết bạn với chính mình', ErrorTypes.VALIDATION_ERROR);
    }
    
    // Check if either user has blocked the other (optimized)
    const blockStatus = await getMutualBlockStatus(fromUserId, toUserId);
    
    if (blockStatus.aBlockedB) {
      throw new SmurfChatError('Bạn đã chặn người dùng này', ErrorTypes.PERMISSION_ERROR);
    }
    
    if (blockStatus.bBlockedA) {
      throw new SmurfChatError('Không thể gửi lời mời kết bạn đến người dùng này', ErrorTypes.PERMISSION_ERROR);
    }
  
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
  } catch (error) {
    throw handleServiceError(error, 'sendFriendRequest');
  }
};

// Cancel a friend request
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

// Accept a friend request
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
  const edgeId = [data.from, data.to].sort().join('_');
  await setDoc(doc(db, 'friends', edgeId), {
    id: edgeId,
    participants: [data.from, data.to],
    createdAt: serverTimestamp(),
  }, { merge: true });
};

// Decline a friend request
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

// Remove friendship between two users
export const removeFriendship = async (userA, userB) => {
  const edgeId = [userA, userB].sort().join('_');
  await deleteDoc(doc(db, 'friends', edgeId));
};

// Check if two users are friends
export const areUsersFriends = async (userA, userB) => {
  const edgeId = [userA, userB].sort().join('_');
  const ref = doc(db, 'friends', edgeId);
  const snap = await getDoc(ref);
  return snap.exists();
};

// Get pending friend request between two users
export const getPendingFriendRequest = async (userA, userB) => {
  const requestsRef = collection(db, 'friend_requests');
  const q = query(
    requestsRef,
    where('participants', '==', [userA, userB].sort().join('_')),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
};
