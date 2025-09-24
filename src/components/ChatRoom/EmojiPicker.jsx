import React, { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";

// Icon emoji dạng SVG
const EmojiIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
      clipRule="evenodd"
    />
  </svg>
);

const EmojiPickerComponent = ({ onEmojiClick, disabled = false }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // Đóng picker khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker]);

  // Xử lý khi chọn emoji
  const handleEmojiClick = (emojiObject) => {
    onEmojiClick(emojiObject.emoji);
    // Giữ picker mở để chọn nhiều emoji
  };

  // Toggle hiển thị picker
  const togglePicker = () => {
    if (!disabled) {
      setShowPicker(!showPicker);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePicker}
        disabled={disabled}
        className={`flex items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
          disabled
            ? "text-slate-300 cursor-not-allowed dark:text-slate-600"
            : "text-slate-600 hover:bg-slate-100 hover:text-skybrand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-skybrand-400"
        }`}
        title="Chọn emoji"
      >
        <EmojiIcon />
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700"
          style={{
            transform: "translateX(-50%)",
            left: "50%",
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="auto"
            previewConfig={{ showPreview: false }}
            searchDisabled={false}
            skinTonesDisabled={true}
            width={320}
            height={400}
            lazyLoadEmojis={true}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiPickerComponent;
