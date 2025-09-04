import React, { useContext } from "react";
import { AppContext } from "../../Context/AppProvider.jsx";
import { AuthContext } from "../../Context/AuthProvider.jsx";
import { useTheme } from "../../Context/ThemeProvider.jsx";
import useOptimizedFirestore from "../../hooks/useOptimizedFirestore";

function ConversationItem({ selected, children, onClick }) {
  return (
    <div
      className={`flex cursor-pointer items-center rounded px-0 py-2 transition ${
        selected ? "bg-white/20" : "bg-transparent"
      } hover:bg-white/10`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default function DirectMessageList() {
  const { setSelectedConversationId, selectedConversationId, conversations } =
    useContext(AppContext);
  const { user } = useContext(AuthContext);
  const theme = useTheme();

  // Get all users for search functionality
  const allUsersCondition = React.useMemo(
    () => ({
      fieldName: "displayName",
      operator: ">=",
      compareValue: ""
    }),
    []
  );

  const { documents: allUsers } = useOptimizedFirestore("users", allUsersCondition);

  const getOtherParticipant = (conversation) => {
    const otherUid = conversation.participants.find((uid) => uid !== user.uid);
    return (
      allUsers.find((u) => u.uid === otherUid) || {
        displayName: "Unknown User",
        photoURL: "",
      }
    );
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <h4
        style={{
          color: theme.colors.sidebarText,
          margin: "0 0 16px 16px",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        Tin nhắn trực tiếp
      </h4>
      <div style={{ padding: "0 16px" }}>
        {conversations.map((conversation) => {
          const otherUser = getOtherParticipant(conversation);
          return (
            <ConversationItem
              key={conversation.id}
              selected={selectedConversationId === conversation.id}
              onClick={() => setSelectedConversationId(conversation.id)}
            >
              <div className="h-7 w-7 flex-shrink-0">
                {otherUser.photoURL ? (
                  <img
                    className="h-7 w-7 rounded-full object-cover"
                    src={otherUser.photoURL}
                    alt="avatar"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-skybrand-600 text-[10px] font-semibold text-white">
                    {otherUser.displayName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1 text-white">
                <p className="m-0 text-sm font-medium">
                  {otherUser.displayName}
                </p>
                <p className="m-0 truncate text-xs opacity-70">
                  {conversation.lastMessage || "Chưa có tin nhắn"}
                </p>
              </div>
            </ConversationItem>
          );
        })}
      </div>
    </div>
  );
}
