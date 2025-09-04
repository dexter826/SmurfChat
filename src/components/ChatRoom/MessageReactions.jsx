import React, { useState, useContext } from 'react';
import { AuthContext } from '../../Context/AuthProvider';
import { toggleReaction } from '../../firebase/services';
import { useAlert } from '../../Context/AlertProvider';
import useEmoji from '../../hooks/useEmoji';

/**
 * MessageReactions Component
 * 
 * Displays and handles reactions on messages
 * Features:
 * - Show existing reactions with counts
 * - Allow users to add/remove reactions (ONE reaction per user)
 * - Quick reaction picker
 * - Tooltip showing who reacted
 * - Automatic removal of old reaction when selecting new one
 */
const MessageReactions = ({ 
  messageId, 
  reactions = {}, 
  chatType = 'room',
  disabled = false,
  className = '' 
}) => {
  const { user } = useContext(AuthContext);
  const { error } = useAlert();
  const { QUICK_REACTIONS } = useEmoji();
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get current user's reaction emoji (if any)
  const getUserCurrentReaction = () => {
    for (const [emoji, users] of Object.entries(reactions)) {
      if (users && users.includes(user?.uid)) {
        return emoji;
      }
    }
    return null;
  };

  // Handle reaction toggle with single reaction constraint
  const handleReactionToggle = async (emoji) => {
    if (disabled || loading || !user?.uid) return;

    setLoading(true);
    try {
      const currentReaction = getUserCurrentReaction();
      
      // If user clicks the same emoji they already reacted with, remove it
      if (currentReaction === emoji) {
        await toggleReaction(messageId, user.uid, emoji, 'messages');
      } 
      // If user has a different reaction, remove old one and add new one
      else if (currentReaction && currentReaction !== emoji) {
        // Remove old reaction first
        await toggleReaction(messageId, user.uid, currentReaction, 'messages');
        // Add new reaction
        await toggleReaction(messageId, user.uid, emoji, 'messages');
      }
      // If user has no reaction, just add the new one
      else {
        await toggleReaction(messageId, user.uid, emoji, 'messages');
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
      error('Không thể thêm reaction');
    } finally {
      setLoading(false);
    }
  };

  // Get reaction entries sorted by count
  const reactionEntries = Object.entries(reactions)
    .filter(([, users]) => users && users.length > 0)
    .sort(([, a], [, b]) => b.length - a.length);

  // Don't render if no reactions and not interactive
  if (reactionEntries.length === 0 && disabled) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${className}`}>
      {/* Existing Reactions */}
      {reactionEntries.map(([emoji, users]) => {
        const count = users.length;
        const isCurrentUserReaction = getUserCurrentReaction() === emoji;
        
        return (
          <button
            key={emoji}
            onClick={() => handleReactionToggle(emoji)}
            disabled={disabled || loading}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${
              isCurrentUserReaction
                ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/50 ring-2 ring-blue-300 dark:ring-blue-500'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
            title={isCurrentUserReaction ? 
              `Bạn đã react với ${emoji} (${users.length} người)` : 
              `${users.length} người đã react với ${emoji}`
            }
          >
            <span className="text-sm">{emoji}</span>
            <span className="min-w-[16px] text-center">{count}</span>
          </button>
        );
      })}

      {/* Add Reaction Button */}
      {!disabled && (
        <div className="relative">
          <button
            onClick={() => setShowQuickPicker(!showQuickPicker)}
            disabled={loading}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors duration-200"
            title="Thêm reaction"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Quick Reaction Picker */}
          {showQuickPicker && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowQuickPicker(false)}
              />
              
              {/* Picker */}
              <div className="absolute bottom-full left-0 mb-2 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg p-2 flex gap-1">
                {QUICK_REACTIONS.map(emoji => {
                  const isCurrentReaction = getUserCurrentReaction() === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleReactionToggle(emoji);
                        setShowQuickPicker(false);
                      }}
                      disabled={loading}
                      className={`p-2 text-lg rounded-md transition-colors duration-200 hover:scale-110 ${
                        isCurrentReaction 
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-500' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={isCurrentReaction ? 
                        `Bỏ reaction ${emoji}` : 
                        `React với ${emoji}`
                      }
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;
