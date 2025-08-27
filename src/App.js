import './App.css';
import Login from './components/Login';
import { Route, Switch, BrowserRouter } from 'react-router-dom';
import ChatRoom from './components/ChatRoom';
import AuthProvider from './Context/AuthProvider';
import AppProvider from './Context/AppProvider';
import { ThemeProvider } from './Context/ThemeProvider';
import AddRoomModal from './components/Modals/AddRoomModal';
import InviteMemberModal from './components/Modals/InviteMemberModal';
import CalendarModal from './components/Modals/CalendarModal';
import VoteModal from './components/Modals/VoteModal';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <Switch>
              <Route component={Login} path='/login' />
              <Route component={ChatRoom} path='/' />
            </Switch>
            <AddRoomModal />
            <InviteMemberModal />
            <CalendarModal />
            <VoteModal />
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
