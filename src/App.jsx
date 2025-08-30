import "./App.css";
import Login from "./components/Login/index.jsx";
import { Route, Switch, BrowserRouter } from "react-router-dom";
import ChatRoom from "./components/ChatRoom/index.jsx";
import AuthProvider from "./Context/AuthProvider.jsx";
import AppProvider from "./Context/AppProvider.jsx";
import { ThemeProvider } from "./Context/ThemeProvider.jsx";
import AlertProvider from "./Context/AlertProvider.jsx";
import AddRoomModal from "./components/Modals/AddRoomModal.jsx";
import InviteMemberModal from "./components/Modals/InviteMemberModal.jsx";
import CalendarModal from "./components/Modals/CalendarModal.jsx";
import VoteModal from "./components/Modals/VoteModal.jsx";
import NewMessageModal from "./components/Modals/NewMessageModal.jsx";
import AddFriendModal from "./components/Modals/AddFriendModal.jsx";
import UserProfileModal from "./components/Modals/UserProfileModal.jsx";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AlertProvider>
          <div className="app-root">
            <AuthProvider>
              <AppProvider>
                <Switch>
                  <Route component={Login} path="/login" />
                  <Route component={ChatRoom} path="/" />
                </Switch>
                <AddRoomModal />
                <InviteMemberModal />
                <CalendarModal />
                <VoteModal />
                <NewMessageModal />
                <AddFriendModal />
                <UserProfileModal />
              </AppProvider>
            </AuthProvider>
          </div>
        </AlertProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
