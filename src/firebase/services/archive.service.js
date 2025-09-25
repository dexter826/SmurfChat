import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../config';
import { handleServiceError, logSuccess } from '../utils/error.utils';

// Archive a chat (conversation or room)
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

// Unarchive a chat
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

// Check if a chat is archived by user
export const isChatArchived = async (chatId, userId) => {
    try {
        const archiveId = `${userId}_${chatId}`;
        const archiveRef = doc(db, 'archived_chats', archiveId);
        const archiveDoc = await getDoc(archiveRef);
        return archiveDoc.exists();
    } catch (error) {
        console.error('Error checking archived status:', error);
        return false;
    }
};

// Get all archived chats for a user
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