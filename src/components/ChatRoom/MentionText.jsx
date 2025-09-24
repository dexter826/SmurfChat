import React from "react";

const MentionText = ({ text, className = "", members = [] }) => {
  if (!text) return null;

  // Create a map of display names to user objects for quick lookup
  const userMap = new Map();
  members.forEach((member) => {
    if (member && member.displayName) {
      userMap.set(member.displayName.toLowerCase(), member);
    }
  });

  // Parse text for mentions
  const parseMentions = (inputText) => {
    const parts = [];
    let lastIndex = 0;

    // Regex to match @mentions (Unicode word characters and spaces, stop at first non-word/space char)
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*)/g;
    let match;

    while ((match = mentionRegex.exec(inputText)) !== null) {
      const mentionText = match[0]; // e.g., "@John Doe"
      const displayName = match[1]; // e.g., "John Doe"
      const startIndex = match.index;
      const endIndex = startIndex + mentionText.length;

      // Add text before mention
      if (startIndex > lastIndex) {
        parts.push({
          type: "text",
          content: inputText.substring(lastIndex, startIndex),
        });
      }

      // Check if this is a valid mention by trying different lengths
      let validMention = null;
      let validDisplayName = null;
      let validMentionText = null;

      // Split displayName into words and try progressively shorter names
      const words = displayName.trim().split(/\s+/);
      for (let i = words.length; i > 0; i--) {
        const testName = words.slice(0, i).join(" ").toLowerCase();
        const user = userMap.get(testName);
        if (user) {
          validMention = user;
          validDisplayName = words.slice(0, i).join(" ");
          validMentionText = "@" + validDisplayName;
          break;
        }
      }

      if (validMention) {
        // Add text before valid mention
        if (startIndex > lastIndex) {
          parts.push({
            type: "text",
            content: inputText.substring(lastIndex, startIndex),
          });
        }

        parts.push({
          type: "mention",
          content: validMentionText,
          user: validMention,
        });

        // Update lastIndex to after the valid mention
        lastIndex = startIndex + validMentionText.length;
      } else {
        // No valid mention found, continue with original logic
        // Add text before mention
        if (startIndex > lastIndex) {
          parts.push({
            type: "text",
            content: inputText.substring(lastIndex, startIndex),
          });
        }

        // Not a valid mention, treat as regular text
        parts.push({
          type: "text",
          content: mentionText,
        });

        lastIndex = endIndex;
      }
    }

    // Add remaining text
    if (lastIndex < inputText.length) {
      parts.push({
        type: "text",
        content: inputText.substring(lastIndex),
      });
    }
    return parts;
  };

  const parts = parseMentions(text);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "mention") {
          return (
            <span
              key={index}
              className="font-bold"
              title={`Đã tag: ${part.user?.displayName || "Unknown"}`}
            >
              {part.content}
            </span>
          );
        } else {
          return (
            <span key={index} className="break-words">
              {part.content}
            </span>
          );
        }
      })}
    </span>
  );
};

export default MentionText;
