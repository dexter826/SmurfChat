import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import { getMutualBlockStatus } from '../utils/block.utils';
import { handleServiceError, SmurfChatError, ErrorTypes } from '../utils/error.utils';

// Dịch vụ hệ thống bạn bè

// Gửi lời mời kết bạn (nếu chưa tồn tại)
export const sendFriendRequest = async (fromUserId, toUserId) => {
  try {
    if (fromUserId === toUserId) {
      throw new SmurfChatError('Không thể kết bạn với chính mình', ErrorTypes.VALIDATION_ERROR);
    }

    // Kiểm tra xem người dùng nào đã chặn người kia
    const blockStatus = await getMutualBlockStatus(fromUserId, toUserId);

    if (blockStatus.aBlockedB) {
      throw new SmurfChatError('Bạn đã chặn người dùng này', ErrorTypes.PERMISSION_ERROR);
    }

    if (blockStatus.bBlockedA) {
      throw new SmurfChatError('Không thể gửi lời mời kết bạn đến người dùng này', ErrorTypes.PERMISSION_ERROR);
    }

    const requestsRef = collection(db, 'friend_requests');

    // Kiểm tra xem hai người dùng đã là bạn bè chưa
    const alreadyFriends = await areUsersFriends(fromUserId, toUserId);
    if (alreadyFriends) {
      throw new SmurfChatError('Hai người dùng đã là bạn bè', ErrorTypes.VALIDATION_ERROR);
    }

    // Chỉ kiểm tra các yêu cầu đang chờ xử lý (không phải đã chấp nhận, vì tình bạn có thể bị xóa)
    const q = query(
      requestsRef,
      where('participants', '==', [fromUserId, toUserId].sort().join('_'))
    );
    const snapshot = await getDocs(q);
    const pendingRequest = snapshot.docs.find(d => !d.data().deleted && d.data().status === 'pending');
    if (pendingRequest) return pendingRequest.id;

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

// Hủy lời mời kết bạn
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

// Chấp nhận lời mời kết bạn
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

  // Thêm vào bộ sưu tập bạn bè (hai chiều qua hai tài liệu hoặc một cạnh duy nhất)
  const edgeId = [data.from, data.to].sort().join('_');
  await setDoc(doc(db, 'friends', edgeId), {
    id: edgeId,
    participants: [data.from, data.to],
    createdAt: serverTimestamp(),
  }, { merge: true });
};

// Từ chối lời mời kết bạn
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

// Xóa tình bạn giữa hai người dùng
export const removeFriendship = async (userA, userB) => {
  const edgeId = [userA, userB].sort().join('_');
  await deleteDoc(doc(db, 'friends', edgeId));
};

// Kiểm tra xem hai người dùng có phải là bạn bè không
export const areUsersFriends = async (userA, userB) => {
  const edgeId = [userA, userB].sort().join('_');
  const ref = doc(db, 'friends', edgeId);
  const snap = await getDoc(ref);
  return snap.exists();
};

// Lấy yêu cầu kết bạn đang chờ xử lý giữa hai người dùng
export const getPendingFriendRequest = async (userA, userB) => {
  const requestsRef = collection(db, 'friend_requests');
  const q = query(
    requestsRef,
    where('participants', '==', [userA, userB].sort().join('_')),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
};
