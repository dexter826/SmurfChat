import { useState, useMemo, useCallback } from 'react';
import { searchMessagesInChat } from '../firebase/services/message.service';

/**
 * Hook để tìm kiếm tin nhắn trong chat
 * @param {string} chatType - Loại chat ('room' hoặc 'direct')
 * @param {string} chatId - ID của chat
 * @returns {Object} - Object chứa các hàm và state cho tìm kiếm
 */
export const useMessageSearch = (chatType, chatId) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    /**
     * Tìm kiếm tin nhắn dựa trên từ khóa
     * @param {string} query - Từ khóa tìm kiếm
     * @param {number} limitCount - Số lượng kết quả tối đa (mặc định 50)
     */
    const searchMessages = useCallback(async (query, limitCount = 50) => {
        if (!query.trim() || !chatId) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setSearchError(null);

        try {
            const allMessages = await searchMessagesInChat(chatId, query, limitCount);
            setSearchResults(allMessages);
        } catch (error) {
            setSearchError(error.message);
            console.error('Error searching messages:', error);
        } finally {
            setIsSearching(false);
        }
    }, [chatId]);

    /**
     * Xóa kết quả tìm kiếm
     */
    const clearSearch = useCallback(() => {
        setSearchTerm('');
        setSearchResults([]);
        setSearchError(null);
    }, []);

    /**
     * Computed value để kiểm tra có đang tìm kiếm không
     */
    const hasSearchTerm = useMemo(() => searchTerm.trim().length > 0, [searchTerm]);

    /**
     * Computed value để lấy số lượng kết quả
     */
    const resultCount = useMemo(() => searchResults.length, [searchResults]);

    return {
        // State
        searchTerm,
        searchResults,
        isSearching,
        searchError,
        hasSearchTerm,
        resultCount,

        // Actions
        setSearchTerm,
        searchMessages,
        clearSearch,
    };
};

export default useMessageSearch;