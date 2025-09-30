import { collection, addDoc, serverTimestamp, doc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config';
import { handleServiceError, logSuccess, validateUserAction, ErrorTypes, SmurfChatError } from '../utils/error.utils';
import { getMutualBlockStatus, isUserBlockedOptimized, clearBlockCache } from '../utils/block.utils';

// Dịch vụ chặn người dùng

// Chặn một người dùng
export const blockUser = async (blockerUserId, blockedUserId) => {
  try {
    validateUserAction(blockerUserId, blockedUserId, 'chặn');

    // Kiểm tra xem đã chặn chưa bằng hàm tối ưu
    const isBlocked = await isUserBlockedOptimized(blockerUserId, blockedUserId);
    if (isBlocked) {
      throw new SmurfChatError(ErrorTypes.BUSINESS_ALREADY_EXISTS, 'Người dùng đã bị chặn');
    }

    const blockedUsersRef = collection(db, 'blocked_users');

    const docRef = await addDoc(blockedUsersRef, {
      blocker: blockerUserId,
      blocked: blockedUserId,
      createdAt: serverTimestamp(),
    });

    // Xóa cache sau khi chặn
    clearBlockCache(blockerUserId, blockedUserId);

    logSuccess('blockUser', { blocker: blockerUserId, blocked: blockedUserId, docId: docRef.id });
    return docRef.id;
  } catch (error) {
    const handledError = handleServiceError(error, 'blockUser');
    throw handledError;
  }
};

// Bỏ chặn một người dùng
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

    // Xóa bản ghi chặn
    const blockDoc = snapshot.docs[0];
    await deleteDoc(doc(db, 'blocked_users', blockDoc.id));

    // Xóa cache sau khi bỏ chặn
    clearBlockCache(blockerUserId, blockedUserId);

    logSuccess('unblockUser', { blocker: blockerUserId, blocked: blockedUserId });
  } catch (error) {
    const handledError = handleServiceError(error, 'unblockUser');
    throw handledError;
  }
};

// Kiểm tra xem người dùng có bị chặn không (tương thích ngược)
export const isUserBlocked = async (blockerUserId, blockedUserId) => {
  return await isUserBlockedOptimized(blockerUserId, blockedUserId);
};

// Lấy danh sách người dùng bị chặn bởi người dùng hiện tại
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

// Lấy danh sách người dùng đã chặn người dùng hiện tại
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

// Kiểm tra xem hai người dùng có chặn lẫn nhau không
export const areMutuallyBlocked = async (userA, userB) => {
  return await getMutualBlockStatus(userA, userB);
};
