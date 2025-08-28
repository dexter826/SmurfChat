import React, { useState } from 'react';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import { useTheme } from '../../Context/ThemeProvider';
import NewMessageModal from '../Modals/NewMessageModal';
import { updateUserSettings } from '../../firebase/services';

export default function UserInfo() {
  const [isNewMessageModalVisible, setIsNewMessageModalVisible] = useState(false);
  const {
    user: { displayName, photoURL, uid },
  } = React.useContext(AuthContext);
  const { setIsAddRoomVisible } = React.useContext(AppContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const [visibility, setVisibility] = useState('public');

  const handleNewRoom = () => setIsAddRoomVisible(true);
  const handleNewMessage = () => setIsNewMessageModalVisible(true);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-gray-800 dark:bg-black/40">
      <div className="flex items-center">
        {photoURL ? (
          <img className="h-10 w-10 rounded-full ring-2 ring-skybrand-500" src={photoURL} alt="avatar" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skybrand-600 text-white ring-2 ring-skybrand-500">
            {displayName?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <span className="ml-3 text-sm font-medium text-slate-800 dark:text-slate-100">{displayName}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          title="Tạo phòng mới"
          className="rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 dark:border-gray-700 dark:text-slate-200"
          onClick={handleNewRoom}
        >
          + Phòng
        </button>
        <button
          title="Tạo tin nhắn mới"
          className="rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 dark:border-gray-700 dark:text-slate-200"
          onClick={handleNewMessage}
        >
          + Tin nhắn
        </button>

        <button
          title={isDarkMode ? 'Chuyển sáng' : 'Chuyển tối'}
          className="ml-1 inline-flex items-center justify-center rounded-md border border-gray-300 p-1 text-slate-700 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={toggleTheme}
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>

        <div className="ml-1">
          <label className="sr-only" htmlFor="visibility">Quyền tìm kiếm</label>
          <select
            id="visibility"
            className="rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm text-slate-700 dark:border-gray-700 dark:text-slate-200"
            value={visibility}
            onChange={async (e) => {
              const v = e.target.value;
              setVisibility(v);
              try { await updateUserSettings(uid, { searchVisibility: v }); } catch { }
            }}
          >
            <option value="public">Công khai</option>
            <option value="friends">Chỉ bạn bè</option>
          </select>
        </div>
      </div>

      <NewMessageModal
        visible={isNewMessageModalVisible}
        onClose={() => setIsNewMessageModalVisible(false)}
      />
    </div>
  );
}
