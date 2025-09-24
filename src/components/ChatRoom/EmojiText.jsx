import React from "react";
import { useEmoji } from "../../hooks/useEmoji";

// Component hiển thị text có chứa emoji
const EmojiText = ({ text, className = "" }) => {
  const { parseEmojiText } = useEmoji();

  if (!text) return null;

  const parts = parseEmojiText(text);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "emoji") {
          return (
            <span
              key={index}
              className="text-lg inline-block mx-0.5"
              style={{ fontSize: "1.2em" }}
            >
              {part.content}
            </span>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
};

// Component hiển thị tin nhắn chỉ chứa emoji (hiển thị lớn)
export const EmojiOnlyMessage = ({ text, className = "" }) => {
  const { parseEmojiText, hasEmoji } = useEmoji();

  if (!text || !hasEmoji(text)) return null;

  const parts = parseEmojiText(text);
  const isEmojiOnly = parts.every(
    (part) =>
      part.type === "emoji" || (part.type === "text" && !part.content.trim())
  );

  if (!isEmojiOnly) return null;

  const emojiCount = parts.filter((p) => p.type === "emoji").length;
  const sizeClass =
    emojiCount <= 3 ? "text-4xl" : emojiCount <= 6 ? "text-3xl" : "text-2xl";

  return (
    <div className={`${className} py-2`}>
      {parts.map((part, index) => {
        if (part.type === "emoji") {
          return (
            <span key={index} className={`${sizeClass} inline-block mx-1`}>
              {part.content}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
};

// Component hiển thị các emoji reaction nhanh
export const QuickReactions = ({ onEmojiClick, disabled = false }) => {
  const { QUICK_REACTIONS } = useEmoji();

  return (
    <div className="flex gap-1 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
      <span className="text-xs text-slate-500 dark:text-slate-400 mr-2 self-center">
        Nhanh:
      </span>
      {QUICK_REACTIONS.map((emoji, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onEmojiClick(emoji)}
          disabled={disabled}
          className={`text-lg p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
            disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-110"
          }`}
          title={`Thêm ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiText;
