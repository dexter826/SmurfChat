import React, { useContext } from "react";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import ConversationWindow from "./ConversationWindow.jsx";
import { AppContext } from "../../Context/AppProvider";

export default function ChatRoom() {
  const { chatType } = useContext(AppContext);

  return (
    <div className="flex h-screen w-full">
      <aside className="w-full sm:w-80 md:w-72 lg:w-80 xl:w-96 shrink-0 border-r border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-black/50 max-sm:absolute max-sm:z-10 max-sm:h-full">
        <Sidebar />
      </aside>
      <main className="flex-1 min-w-0 bg-white dark:bg-black max-sm:w-full">
        {chatType === "room" ? <ChatWindow /> : <ConversationWindow />}
      </main>
    </div>
  );
}
