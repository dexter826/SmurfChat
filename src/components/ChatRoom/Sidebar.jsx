import React, { useContext } from 'react';
import UserInfo from './UserInfo';
import UnifiedChatList from './UnifiedChatList';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import useFirestore from '../../hooks/useFirestore';
import { acceptFriendRequest, declineFriendRequest, cancelFriendRequest, removeFriendship, createOrUpdateConversation } from '../../firebase/services';

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const { clearState, selectConversation, setChatType } = useContext(AppContext);
  const { user } = useContext(AuthContext);

  // Incoming friend requests for current user
  const incomingReqsCondition = React.useMemo(() => ({
    fieldName: 'to',
    operator: '==',
    compareValue: user?.uid,
  }), [user?.uid]);
  const incomingRequests = useFirestore('friend_requests', incomingReqsCondition).filter(r => r.status === 'pending');

  // Outgoing friend requests
  const outgoingReqsCondition = React.useMemo(() => ({
    fieldName: 'from',
    operator: '==',
    compareValue: user?.uid,
  }), [user?.uid]);
  const outgoingRequests = useFirestore('friend_requests', outgoingReqsCondition).filter(r => r.status === 'pending');

  // Friends list (edges containing current user)
  const friendsCondition = React.useMemo(() => ({
    fieldName: 'participants',
    operator: 'array-contains',
    compareValue: user?.uid,
  }), [user?.uid]);
  const friendEdges = useFirestore('friends', friendsCondition);

  // Fetch all users (to resolve names)
  const allUsersCondition = React.useMemo(() => ({
    fieldName: 'uid',
    operator: '!=',
    compareValue: user?.uid,
  }), [user?.uid]);
  const allUsers = useFirestore('users', allUsersCondition);

  const getUserById = (uid) => allUsers.find(u => u.uid === uid);

  const handleLogout = async () => {
    await logout();
    clearState();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 p-3 dark:border-gray-800">
        <UserInfo />
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto pb-24">
        <div className="flex items-center px-4 py-2">
          <span className="flex-1 font-semibold">Cuộc trò chuyện</span>
          <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">Lời mời</span>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-skybrand-500 px-1 text-xs font-medium text-white">
            {incomingRequests.length}
          </span>
        </div>

        <UnifiedChatList />

        {incomingRequests.length > 0 && (
          <div className="border-t border-gray-200 pt-2 dark:border-gray-800">
            <div className="px-4 pb-2 font-semibold">Lời mời kết bạn</div>
            <ul className="space-y-1">
              {incomingRequests.map((req) => (
                <li key={req.id} className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <img
                      className="h-8 w-8 rounded-full object-cover"
                      src={getUserById(req.from)?.photoURL || ''}
                      alt="avatar"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{getUserById(req.from)?.displayName || 'Một người dùng'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">đã gửi lời mời kết bạn</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        onClick={async () => {
                          await acceptFriendRequest(req.id, user.uid);
                          const otherId = req.from;
                          const conversationId = [user.uid, otherId].sort().join('_');
                          await createOrUpdateConversation({
                            id: conversationId,
                            participants: [user.uid, otherId],
                            type: 'direct',
                            lastMessage: '',
                            lastMessageAt: null,
                            createdBy: user.uid
                          });
                          setChatType && setChatType('direct');
                          selectConversation(conversationId);
                        }}
                      >
                        Chấp nhận
                      </button>
                      <button
                        className="inline-flex items-center rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                        onClick={async () => { await declineFriendRequest(req.id, user.uid); }}
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {outgoingRequests.length > 0 && (
          <div className="border-t border-gray-200 pt-2 dark:border-gray-800">
            <div className="px-4 pb-2 font-semibold">Lời mời đã gửi</div>
            <ul className="space-y-1">
              {outgoingRequests.map((req) => (
                <li key={req.id} className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <img
                      className="h-8 w-8 rounded-full object-cover"
                      src={getUserById(req.to)?.photoURL || ''}
                      alt="avatar"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{getUserById(req.to)?.displayName || 'Một người dùng'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">đang chờ chấp nhận</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                        onClick={async () => { await cancelFriendRequest(req.id, user.uid); }}
                      >
                        Hủy lời mời
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {friendEdges.length > 0 && (
          <div className="border-t border-gray-200 pt-2 dark:border-gray-800">
            <div className="px-4 pb-2 font-semibold">Bạn bè</div>
            <ul className="space-y-1">
              {friendEdges.map((edge) => {
                const otherId = (edge.participants || []).find(id => id !== user.uid);
                const other = getUserById(otherId) || {};
                return (
                  <li key={edge.id || otherId} className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <img
                        className="h-8 w-8 rounded-full object-cover"
                        src={other.photoURL || ''}
                        alt="avatar"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{other.displayName || otherId}</div>
                      </div>
                      <button
                        className="inline-flex items-center rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                        onClick={async () => { await removeFriendship(user.uid, otherId); }}
                      >
                        Hủy kết bạn
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-gray-800 dark:bg-black/40">
        <button
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-rose-600 hover:text-white dark:border-gray-700 dark:text-slate-100"
          onClick={handleLogout}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
