import { useState, useCallback } from 'react';

// Emoji reactions thường dùng cho truy cập nhanh
export const QUICK_REACTIONS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏'
];

// Danh mục emoji với các emoji phổ biến
export const EMOJI_CATEGORIES = {
  smileys: {
    name: 'Mặt cười',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐']
  },
  gestures: {
    name: 'Cử chỉ',
    emojis: ['👍', '👎', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✊', '👊', '🤛', '🤜', '💪', '🦾', '🖐️', '✋', '🤚', '👋', '🤏', '👌', '✌️']
  },
  hearts: {
    name: 'Trái tim',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  nature: {
    name: 'Thiên nhiên',
    emojis: ['🌱', '🌿', '🍀', '🌾', '🌵', '🌴', '🌳', '🌲', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🌅', '🌄', '🌠', '🎆', '🎇', '🌈', '☀️', '🌤️', '⛅', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌊']
  }
};

// Hook để quản lý chức năng emoji
export const useEmoji = () => {
  const [recentEmojis, setRecentEmojis] = useState(() => {
    const stored = localStorage.getItem('smurfchat_recent_emojis');
    return stored ? JSON.parse(stored) : [];
  });

  // Thêm emoji vào danh sách gần đây
  const addToRecent = useCallback((emoji) => {
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      const newRecent = [emoji, ...filtered].slice(0, 20); // Giữ lại 20 emoji gần nhất
      localStorage.setItem('smurfchat_recent_emojis', JSON.stringify(newRecent));
      return newRecent;
    });
  }, []);

  // Kiểm tra xem văn bản có chứa emoji không
  const hasEmoji = useCallback((text) => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    return emojiRegex.test(text);
  }, []);

  // Trích xuất emoji từ văn bản
  const extractEmojis = useCallback((text) => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    return text.match(emojiRegex) || [];
  }, []);

  // Phân tích văn bản với emoji để hiển thị tốt hơn
  const parseEmojiText = useCallback((text) => {
    if (!text) return [];

    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(text)) !== null) {
      // Thêm văn bản trước emoji
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Thêm emoji
      parts.push({
        type: 'emoji',
        content: match[0]
      });

      lastIndex = match.index + match[0].length;
    }

    // Thêm văn bản còn lại
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  }, []);

  return {
    recentEmojis,
    addToRecent,
    hasEmoji,
    extractEmojis,
    parseEmojiText,
    QUICK_REACTIONS,
    EMOJI_CATEGORIES
  };
};

export default useEmoji;
