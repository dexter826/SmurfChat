import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../config';
import { handleServiceError, logSuccess } from '../utils/error.utils';

// Lưu trữ một cuộc trò chuyện (conversation hoặc room)
export const archiveChat = async (chatId, isConversation, userId) => {
    try {
        const archiveId = `${userId}_${chatId}`;
        const archiveRef = doc(db, 'archived_chats', archiveId);

        await setDoc(archiveRef, {
            userId,
            chatId,
            isConversation,
            archivedAt: serverTimestamp(),
        });

        logSuccess('archiveChat', { archiveId });
        return archiveId;
    } catch (error) {
        const handledError = handleServiceError(error, 'archiveChat');
        throw handledError;
    }
};

// Hủy lưu trữ một cuộc trò chuyện
export const unarchiveChat = async (chatId, userId) => {
    try {
        const archiveId = `${userId}_${chatId}`;
        const archiveRef = doc(db, 'archived_chats', archiveId);
        await deleteDoc(archiveRef);

        logSuccess('unarchiveChat', { archiveId });
    } catch (error) {
        const handledError = handleServiceError(error, 'unarchiveChat');
        throw handledError;
    }
};

// Kiểm tra xem một cuộc trò chuyện có được lưu trữ bởi người dùng không
export const isChatArchived = async (chatId, userId) => {
    try {
        const archiveId = `${userId}_${chatId}`;
        const archiveRef = doc(db, 'archived_chats', archiveId);
        const archiveDoc = await getDoc(archiveRef);
        return archiveDoc.exists();
    } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái lưu trữ:', error);
        return false;
    }
};

// Lấy tất cả các cuộc trò chuyện đã lưu trữ cho một người dùng
export const getArchivedChats = async (userId) => {
    try {
        const q = query(collection(db, 'archived_chats'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        const handledError = handleServiceError(error, 'getArchivedChats');
        throw handledError;
    }
};