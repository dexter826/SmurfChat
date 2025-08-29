import { useState, useCallback } from 'react';

// Common emoji reactions for quick access
export const QUICK_REACTIONS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏'
];

// Emoji categories with popular emojis
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

// Hook for managing emoji functionality
export const useEmoji = () => {
  const [recentEmojis, setRecentEmojis] = useState(() => {
    const stored = localStorage.getItem('smurfchat_recent_emojis');
    return stored ? JSON.parse(stored) : [];
  });

  // Add emoji to recent list
  const addToRecent = useCallback((emoji) => {
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      const newRecent = [emoji, ...filtered].slice(0, 20); // Keep last 20
      localStorage.setItem('smurfchat_recent_emojis', JSON.stringify(newRecent));
      return newRecent;
    });
  }, []);

  // Check if text contains emoji
  const hasEmoji = useCallback((text) => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    return emojiRegex.test(text);
  }, []);

  // Extract emojis from text
  const extractEmojis = useCallback((text) => {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    return text.match(emojiRegex) || [];
  }, []);

  // Parse text with emojis for better rendering
  const parseEmojiText = useCallback((text) => {
    if (!text) return [];
    
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(text)) !== null) {
      // Add text before emoji
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add emoji
      parts.push({
        type: 'emoji',
        content: match[0]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
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
