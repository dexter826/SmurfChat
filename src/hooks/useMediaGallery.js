import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Hook để quản lý thư viện media trong chat
const useMediaGallery = (chatType, chatId) => {
    const [allMessages, setAllMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Kiểm tra nếu không có chatType hoặc chatId, reset danh sách tin nhắn
        if (!chatType || !chatId) {
            setAllMessages([]);
            return;
        }

        setLoading(true);
        setError(null);

        // Truy vấn tất cả tin nhắn của chat, sắp xếp theo thời gian tạo giảm dần
        const messagesQuery = query(
            collection(db, 'messages'),
            where('chatId', '==', chatId),
            orderBy('createdAt', 'desc')
        );

        // Lắng nghe thay đổi realtime từ Firestore
        const unsubscribe = onSnapshot(
            messagesQuery,
            (snapshot) => {
                // Chuyển đổi dữ liệu snapshot thành mảng tin nhắn
                const messages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllMessages(messages);
                setLoading(false);
            },
            (err) => {
                console.error('Lỗi khi lấy tin nhắn:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        // Hủy lắng nghe khi component unmount hoặc dependencies thay đổi
        return () => unsubscribe();
    }, [chatType, chatId]);

    // Lọc ra các file media từ tin nhắn
    const mediaFiles = useMemo(() => {
        return allMessages.filter(file => {
            // Loại bỏ tin nhắn đã thu hồi
            if (file.recalled) return false;

            // Loại bỏ tin nhắn không có dữ liệu file
            if (!file.fileData) return false;

            // Chỉ bao gồm tin nhắn file và voice
            return file.messageType === 'file' || file.messageType === 'voice';
        });
    }, [allMessages]);

    // Tính toán thống kê các loại file media
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

    // Trả về dữ liệu và trạng thái của hook
    return {
        mediaFiles,
        loading,
        error,
        stats,
        hasMedia: mediaFiles.length > 0
    };
};

export default useMediaGallery;