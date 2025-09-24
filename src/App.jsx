import React, { useEffect, useState, Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, BrowserRouter } from "react-router-dom";
import AuthProvider from "./Context/AuthProvider.jsx";
import AppProvider from "./Context/AppProvider.jsx";
import { ThemeProvider } from "./Context/ThemeProvider.jsx";
import AlertProvider from "./Context/AlertProvider.jsx";
import AddRoomModal from "./components/Modals/AddRoomModal.jsx";
import InviteMemberModal from "./components/Modals/InviteMemberModal.jsx";
import VoteModal from "./components/Modals/VoteModal.jsx";
import NewMessageModal from "./components/Modals/NewMessageModal.jsx";
import AddFriendModal from "./components/Modals/AddFriendModal.jsx";
import UserProfileModal from "./components/Modals/UserProfileModal.jsx";
import BlockedUsersModal from "./components/Modals/BlockedUsersModal.jsx";
import SplashScreen from "./components/SplashScreen";
import listenerManager from "./firebase/utils/listener.manager";

// Lazy load các components lớn
const Login = lazy(() => import("./components/Login/index.jsx"));
const ChatRoom = lazy(() => import("./components/ChatRoom/index.jsx"));

// Tạo QueryClient với cấu hình tối ưu cho caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút
      cacheTime: 10 * 60 * 1000, // 10 phút
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Dọn dẹp tất cả listeners khi app unmount
  useEffect(() => {
    return () => {
      listenerManager.cleanupAll();
    };
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AlertProvider>
            <div className="app-root">
              <AuthProvider>
                <AppProvider>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-screen">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-skybrand-600"></div>
                      </div>
                    }
                  >
                    <Switch>
                      <Route component={Login} path="/login" />
                      <Route component={ChatRoom} path="/" />
                    </Switch>
                  </Suspense>
                  <AddRoomModal />
                  <InviteMemberModal />
                  <VoteModal />
                  <NewMessageModal />
                  <AddFriendModal />
                  <UserProfileModal />
                  <BlockedUsersModal />
                </AppProvider>
              </AuthProvider>
            </div>
          </AlertProvider>
        </ThemeProvider>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
