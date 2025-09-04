import { collection, addDoc, serverTimestamp, doc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config';
import { handleServiceError, logSuccess, validateUserAction, ErrorTypes, SmurfChatError } from '../utils/error.utils';

// Block user services

// Block a user
export const blockUser = async (blockerUserId, blockedUserId) => {
  try {
    validateUserAction(blockerUserId, blockedUserId, 'chặn');

    // Check if already blocked
    const isBlocked = await isUserBlocked(blockerUserId, blockedUserId);
    if (isBlocked) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_ALREADY_EXISTS, 'Người dùng đã bị chặn');
    }

    const blockedUsersRef = collection(db, 'blocked_users');
    
    const docRef = await addDoc(blockedUsersRef, {
      blocker: blockerUserId,
      blocked: blockedUserId,
      createdAt: serverTimestamp(),
    });

    logSuccess('blockUser', { blocker: blockerUserId, blocked: blockedUserId, docId: docRef.id });
    return docRef.id;
  } catch (error) {
    const handledError = handleServiceError(error, 'blockUser');
    throw handledError;
  }
};

// Unblock a user
export const unblockUser = async (blockerUserId, blockedUserId) => {
  try {
    const blockedUsersRef = collection(db, 'blocked_users');
    const q = query(
      blockedUsersRef,
      where('blocker', '==', blockerUserId),
      where('blocked', '==', blockedUserId)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_NOT_FOUND, 'Người dùng không bị chặn');
    }

    // Delete the block record
    const blockDoc = snapshot.docs[0];
    await deleteDoc(doc(db, 'blocked_users', blockDoc.id));
    
    logSuccess('unblockUser', { blocker: blockerUserId, blocked: blockedUserId });
  } catch (error) {
    const handledError = handleServiceError(error, 'unblockUser');
    throw handledError;
  }
};

// Check if a user is blocked
export const isUserBlocked = async (blockerUserId, blockedUserId) => {
  const blockedUsersRef = collection(db, 'blocked_users');
  const q = query(
    blockedUsersRef,
    where('blocker', '==', blockerUserId),
    where('blocked', '==', blockedUserId)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

// Get list of users blocked by current user
export const getBlockedUsers = async (userId) => {
  const blockedUsersRef = collection(db, 'blocked_users');
  const q = query(
    blockedUsersRef,
    where('blocker', '==', userId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Get list of users who blocked current user
export const getUsersWhoBlockedMe = async (userId) => {
  const blockedUsersRef = collection(db, 'blocked_users');
  const q = query(
    blockedUsersRef,
    where('blocked', '==', userId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Check if two users have blocked each other (mutual block check)
export const areMutuallyBlocked = async (userA, userB) => {
  const aBlockedB = await isUserBlocked(userA, userB);
  const bBlockedA = await isUserBlocked(userB, userA);
  
  return {
    aBlockedB,
    bBlockedA,
    isBlocked: aBlockedB || bBlockedA
  };
};
