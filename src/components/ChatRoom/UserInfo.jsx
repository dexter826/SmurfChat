import React, { useState } from 'react';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import { useTheme } from '../../Context/ThemeProvider';
import NewMessageModal from '../Modals/NewMessageModal';
import { updateUserSettings } from '../../firebase/services';

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

const SettingsIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function UserInfo() {
  const [isNewMessageModalVisible, setIsNewMessageModalVisible] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const {
    user: { displayName, photoURL, uid },
  } = React.useContext(AuthContext);
  const { setIsAddRoomVisible } = React.useContext(AppContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const [visibility, setVisibility] = useState('public');

  const handleNewRoom = () => {
    setIsAddRoomVisible(true);
    setShowDropdown(false);
  };
  
  const handleNewMessage = () => {
    setIsNewMessageModalVisible(true);
    setShowDropdown(false);
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

        {/* Settings Dropdown */}
        <div className="relative">
          <QuickActionButton
            title="Cài đặt"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <SettingsIcon />
          </QuickActionButton>
          
          {showDropdown && (
            <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-2 border-b border-slate-200 pb-2 dark:border-slate-600">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quyền tìm kiếm
                </label>
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  value={visibility}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setVisibility(v);
                    try { 
                      await updateUserSettings(uid, { searchVisibility: v }); 
                    } catch (error) {
                      console.error('Error updating settings:', error);
                    }
                  }}
                >
                  <option value="public">Công khai</option>
                  <option value="friends">Chỉ bạn bè</option>
                </select>
              </div>
              
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => setShowDropdown(false)}
              >
                Đóng menu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleNewRoom}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-skybrand-500 hover:bg-skybrand-50 hover:text-skybrand-600 focus:outline-none focus:ring-2 focus:ring-skybrand-500 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-skybrand-400 dark:hover:bg-skybrand-900/20"
        >
          <PlusIcon />
          Phòng
        </button>
        
        <button
          onClick={handleNewMessage}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-skybrand-500 hover:bg-skybrand-50 hover:text-skybrand-600 focus:outline-none focus:ring-2 focus:ring-skybrand-500 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-skybrand-400 dark:hover:bg-skybrand-900/20"
        >
          <PlusIcon />
          Tin nhắn
        </button>

        <QuickActionButton
          title={isDarkMode ? 'Chuyển sáng' : 'Chuyển tối'}
          onClick={toggleTheme}
          variant="theme"
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </QuickActionButton>
      </div>

      <NewMessageModal
        visible={isNewMessageModalVisible}
        onClose={() => setIsNewMessageModalVisible(false)}
      />
    </div>
  );
}
