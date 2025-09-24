import React, { useState, useEffect, useRef, useContext, useMemo } from "react";
import { AppContext } from "../../Context/AppProvider";

const MentionInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Nhập tin nhắn...",
  disabled = false,
  chatType,
  members = [],
}) => {
  const { user } = useContext(AppContext);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionQuery, setMentionQuery] = useState("");
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Get available users for mentions (only in room chat)
  const availableUsers = useMemo(() => {
    if (chatType !== "room" || !members || members.length === 0) {
      return [];
    }

    return members
      .filter((member) => member && member.uid !== user?.uid) // Exclude current user
      .map((member) => ({
        uid: member.uid,
        displayName: member.displayName || "Unknown User",
        photoURL: member.photoURL,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [chatType, members, user?.uid]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1 && atIndex === textBeforeCursor.length - 1) {
      // @ is at the end of text before cursor
      setMentionStart(atIndex);
      setMentionQuery("");
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else if (atIndex !== -1 && cursorPosition > atIndex + 1) {
      // There's text after @
      const query = textBeforeCursor.substring(atIndex + 1);
      if (!query.includes(" ")) {
        // No space in query (valid mention)
        setMentionStart(atIndex);
        setMentionQuery(query.toLowerCase());
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        // Space found, close suggestions
        setShowSuggestions(false);
      }
    } else {
      // No @ or invalid position
      setShowSuggestions(false);
    }
  };

  // Filter suggestions based on query
  useEffect(() => {
    if (!showSuggestions) {
      setSuggestions([]);
      return;
    }

    let filtered = availableUsers;
    if (mentionQuery) {
      filtered = availableUsers.filter((user) =>
        user.displayName.toLowerCase().includes(mentionQuery)
      );
    }

    setSuggestions(filtered.slice(0, 5)); // Limit to 5 suggestions
  }, [showSuggestions, mentionQuery, availableUsers]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectUser(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
      case " ":
        // Close suggestions on space
        setShowSuggestions(false);
        break;
      default:
        break;
    }
  };

  // Select user from suggestions
  const selectUser = (selectedUser) => {
    if (!inputRef.current) return;

    const beforeMention = value.substring(0, mentionStart);
    const afterCursor = value.substring(inputRef.current.selectionStart);
    const mentionText = `@${selectedUser.displayName} `;

    const newValue = beforeMention + mentionText + afterCursor;
    onChange(newValue);

    setShowSuggestions(false);
    setMentionStart(-1);
    setMentionQuery("");

    // Set cursor position after the mention
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Handle suggestion click
  const handleSuggestionClick = (selectedUser) => {
    selectUser(selectedUser);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showSuggestions &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSuggestions]);

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        className="w-full bg-transparent px-2 py-1 outline-none placeholder:text-slate-400"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full mb-1 w-64 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
        >
          {suggestions.map((user, index) => (
            <div
              key={user.uid}
              className={`flex items-center p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 ${
                index === selectedIndex ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
              onClick={() => handleSuggestionClick(user)}
            >
              <div className="flex-shrink-0 mr-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-900 dark:text-white truncate">
                {user.displayName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
