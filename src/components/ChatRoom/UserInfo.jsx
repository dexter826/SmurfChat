import React, { useState } from 'react';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import { useTheme } from '../../Context/ThemeProvider';
import NewMessageModal from '../Modals/NewMessageModal';

// Icon components
const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const SunIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);


export default function UserInfo() {
  const [isNewMessageModalVisible, setIsNewMessageModalVisible] = useState(false);
  const {
    user: { displayName, photoURL },
  } = React.useContext(AuthContext);
  const { setIsAddRoomVisible } = React.useContext(AppContext);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleNewRoom = () => {
    setIsAddRoomVisible(true);
  };
  
  const handleNewMessage = () => {
    setIsNewMessageModalVisible(true);
  };

  const QuickActionButton = ({ onClick, title, children, variant = 'default' }) => {
    const variants = {
      default: "border-slate-300 text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 hover:bg-skybrand-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-skybrand-400 dark:hover:bg-skybrand-900/20",
      theme: "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
    };
    
    return (
      <button
        title={title}
        className={`inline-flex items-center justify-center rounded-lg border p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-skybrand-500 focus:ring-offset-1 ${variants[variant]}`}
        onClick={onClick}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="p-4">
      {/* User Profile Section */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {photoURL ? (
            <img 
              className="h-12 w-12 rounded-full object-cover ring-2 ring-skybrand-400/50" 
              src={photoURL} 
              alt="avatar"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`${photoURL ? 'hidden' : 'flex'} h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-skybrand-500 to-skybrand-600 text-white ring-2 ring-skybrand-400/50 font-semibold text-lg`}
          >
            {displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {displayName || 'Người dùng'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Đang hoạt động</p>
        </div>

        {/* Theme Toggle */}
        <QuickActionButton
          title={isDarkMode ? 'Chuyển sáng' : 'Chuyển tối'}
          onClick={toggleTheme}
          variant="theme"
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </QuickActionButton>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleNewRoom}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all duration-200 hover:border-skybrand-500 hover:bg-skybrand-50 hover:text-skybrand-600 focus:outline-none focus:ring-2 focus:ring-skybrand-500 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-skybrand-400 dark:hover:bg-skybrand-900/20"
        >
          <PlusIcon />
          Phòng
        </button>
        
        <button
          onClick={handleNewMessage}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all duration-200 hover:border-skybrand-500 hover:bg-skybrand-50 hover:text-skybrand-600 focus:outline-none focus:ring-2 focus:ring-skybrand-500 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-skybrand-400 dark:hover:bg-skybrand-900/20"
        >
          <PlusIcon />
          Tin nhắn
        </button>
      </div>

      <NewMessageModal
        visible={isNewMessageModalVisible}
        onClose={() => setIsNewMessageModalVisible(false)}
      />
    </div>
  );
}
