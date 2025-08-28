import React, { useContext } from "react";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import ConversationWindow from "./ConversationWindow.jsx";
import { AppContext } from "../../Context/AppProvider";

export default function ChatRoom() {
  const { chatType } = useContext(AppContext);

  return (
    <div className="flex h-screen w-full">
      <aside className="w-72 shrink-0 border-r border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-black/50">
        <Sidebar />
      </aside>
      <main className="flex-1 min-w-0 bg-white dark:bg-black">
        {chatType === "room" ? <ChatWindow /> : <ConversationWindow />}
      </main>
    </div>
  );
}
