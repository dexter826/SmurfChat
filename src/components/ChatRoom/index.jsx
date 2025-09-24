import React, { useContext, Suspense, lazy } from "react";
import Sidebar from "./Sidebar.jsx";
import { AppContext } from "../../Context/AppProvider";

// Lazy load các components lớn
const ChatWindow = lazy(() => import("./ChatWindow.jsx"));
const ConversationWindow = lazy(() => import("./ConversationWindow.jsx"));

export default function ChatRoom() {
  const { chatType } = useContext(AppContext);

  return (
    <div className="flex h-screen w-full">
      <aside className="w-full sm:w-80 md:w-72 lg:w-80 xl:w-96 shrink-0 border-r border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-slate-900/95 max-sm:absolute max-sm:z-10 max-sm:h-full">
        <Sidebar />
      </aside>
      <main className="flex-1 min-w-0 bg-white dark:bg-slate-900 max-sm:w-full">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-skybrand-600"></div>
            </div>
          }
        >
          {chatType === "room" ? <ChatWindow /> : <ConversationWindow />}
        </Suspense>
      </main>
    </div>
  );
}
