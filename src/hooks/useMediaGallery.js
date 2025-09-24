import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const useMediaGallery = (chatType, chatId) => {
    const [allMessages, setAllMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!chatType || !chatId) {
            setAllMessages([]);
            return;
        }

        setLoading(true);
        setError(null);

        // Fetch all messages for the chat first
        const messagesQuery = query(
            collection(db, 'messages'),
            where('chatId', '==', chatId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            messagesQuery,
            (snapshot) => {
                const messages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllMessages(messages);
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching messages:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [chatType, chatId]);

    const mediaFiles = useMemo(() => {
        return allMessages.filter(file => {
            // Filter out recalled messages
            if (file.recalled) return false;

            // Filter out messages without file data
            if (!file.fileData) return false;

            // Only include file and voice messages
            return file.messageType === 'file' || file.messageType === 'voice';
        });
    }, [allMessages]);

    const stats = useMemo(() => {
        const stats = {
            total: mediaFiles.length,
            images: 0,
            videos: 0,
            audio: 0,
            documents: 0
        };

        mediaFiles.forEach(file => {
            const category = file.fileData?.category;
            if (category === 'image') stats.images++;
            else if (category === 'video') stats.videos++;
            else if (category === 'audio' || category === 'voice') stats.audio++;
            else stats.documents++;
        });

        return stats;
    }, [mediaFiles]);

    return {
        mediaFiles,
        loading,
        error,
        stats,
        hasMedia: mediaFiles.length > 0
    };
};

export default useMediaGallery;