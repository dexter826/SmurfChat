import React, { useState, useContext } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { createOrUpdateConversation, areUsersFriends, getPendingFriendRequest, sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } from '../../firebase/services';
import useFirestore from '../../hooks/useFirestore';

export default function NewMessageModal({ visible, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { allUsers, setSelectedConversationId, setChatType } = useContext(AppContext);
  const { user } = useContext(AuthContext);

  // Relationship data for current user
  const incomingReqsCondition = React.useMemo(() => ({
    fieldName: 'to',
    operator: '==',
    compareValue: user?.uid,
  }), [user?.uid]);
  const outgoingReqsCondition = React.useMemo(() => ({
    fieldName: 'from',
    operator: '==',
    compareValue: user?.uid,
  }), [user?.uid]);
  const friendsCondition = React.useMemo(() => ({
    fieldName: 'participants',
    operator: 'array-contains',
    compareValue: user?.uid,
  }), [user?.uid]);
  const incomingRequests = useFirestore('friend_requests', incomingReqsCondition).filter(r => r.status === 'pending');
  const outgoingRequests = useFirestore('friend_requests', outgoingReqsCondition).filter(r => r.status === 'pending');
  const friendEdges = useFirestore('friends', friendsCondition);

  // Helpers for relation and privacy
  const getRelation = (otherUid) => {
    const edge = friendEdges.find(e => Array.isArray(e.participants) && e.participants.includes(otherUid));
    if (edge) return { type: 'friend' };
    const out = outgoingRequests.find(r => r.to === otherUid);
    if (out) return { type: 'outgoing', requestId: out.id };
    const inc = incomingRequests.find(r => r.from === otherUid);
    if (inc) return { type: 'incoming', requestId: inc.id };
    return { type: 'none' };
  };

  // Filter users based on search term, excluding current user, and respect privacy
  const filteredUsers = allUsers?.filter(u => {
    if (u.uid === user.uid) return false;
    const searchLower = searchTerm.toLowerCase();
    const matches = (
      u.displayName?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower)
    );
    if (!matches) return false;
    const rel = getRelation(u.uid);
    const visibility = u.searchVisibility || 'public';
    if (visibility === 'public') return true;
    // friends-only visibility: only show if already friends or incoming/outgoing (so user can act)
    return rel.type === 'friend' || rel.type === 'incoming' || rel.type === 'outgoing';
  }) || [];

  const openChatWith = async (selectedUser) => {
    try {
      setLoading(true);

      const isFriend = await areUsersFriends(user.uid, selectedUser.uid);
      if (isFriend) {
        // Create conversation ID (consistent ordering)
        const conversationId = [user.uid, selectedUser.uid].sort().join('_');

        // Create or update conversation
        await createOrUpdateConversation({
          id: conversationId,
          participants: [user.uid, selectedUser.uid],
          participantDetails: {
            [user.uid]: {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL
            },
            [selectedUser.uid]: {
              displayName: selectedUser.displayName,
              email: selectedUser.email,
              photoURL: selectedUser.photoURL
            }
          },
          type: 'direct',
          lastMessage: '',
          lastMessageAt: null,
          createdBy: user.uid
        });

        // Switch to conversation view
        setChatType('direct');
        setSelectedConversationId(conversationId);

        // Close modal and reset search
        onClose();
        setSearchTerm('');

        try { window.alert(`Đã tạo cuộc trò chuyện với ${selectedUser.displayName}`); } catch { }
        return;
      }
      try { window.alert('Hai bạn chưa là bạn bè. Hãy gửi lời mời kết bạn trước.'); } catch { }
    } catch (error) {
      console.error('Error creating conversation:', error);
      try { window.alert('Không thể thực hiện thao tác. Vui lòng thử lại.'); } catch { }
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (toUser) => {
    try {
      setLoading(true);
      const pending = await getPendingFriendRequest(user.uid, toUser.uid);
      if (pending && pending.status === 'pending') {
        try { window.alert('Bạn đã gửi lời mời trước đó.'); } catch { }
        return;
      }
      await sendFriendRequest(user.uid, toUser.uid);
      try { window.alert('Đã gửi lời mời kết bạn.'); } catch { }
    } catch (e) {
      console.error(e);
      try { window.alert('Gửi lời mời thất bại.'); } catch { }
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (reqId) => {
    try {
      setLoading(true);
      await cancelFriendRequest(reqId, user.uid);
      try { window.alert('Đã hủy lời mời.'); } catch { }
    } catch (e) {
      console.error(e);
      try { window.alert('Hủy lời mời thất bại.'); } catch { }
    } finally {
      setLoading(false);
    }
  };

  const acceptIncoming = async (reqId) => {
    try {
      setLoading(true);
      await acceptFriendRequest(reqId, user.uid);
      try { window.alert('Đã chấp nhận lời mời.'); } catch { }
    } catch (e) {
      console.error(e);
      try { window.alert('Không thể chấp nhận lời mời.'); } catch { }
    } finally {
      setLoading(false);
    }
  };

  const declineIncoming = async (reqId) => {
    try {
      setLoading(true);
      await declineFriendRequest(reqId, user.uid);
      try { window.alert('Đã từ chối lời mời.'); } catch { }
    } catch (e) {
      console.error(e);
      try { window.alert('Không thể từ chối lời mời.'); } catch { }
    } finally {
      setLoading(false);
    }
  };



  const handleCancel = () => {
    onClose();
    setSearchTerm('');
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="relative z-10 w-full max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tạo tin nhắn mới</h3>
          <button className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={handleCancel}>Đóng</button>
        </div>
        <div className="mb-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1.5 text-slate-400"><SearchOutlined /></span>
            <input
              className="w-full rounded border border-gray-300 bg-transparent py-1 pl-8 pr-2 text-sm outline-none dark:border-gray-700"
              placeholder="Tìm kiếm người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {searchTerm ? (
          filteredUsers.length > 0 ? (
            <ul className="thin-scrollbar max-h-80 space-y-2 overflow-y-auto">
              {filteredUsers.map((u) => {
                const rel = getRelation(u.uid);
                return (
                  <li key={u.uid} className={`flex items-center justify-between rounded-lg p-3 ${loading ? 'opacity-60' : ''} hover:bg-slate-100 dark:hover:bg-slate-800`}>
                    <div className="flex items-center">
                      {u.photoURL ? (
                        <img className="h-10 w-10 rounded-full" src={u.photoURL} alt="avatar" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skybrand-600 text-white">
                          {u.displayName?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {u.displayName}
                          {rel.type === 'friend' && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">Bạn bè</span>}
                          {rel.type === 'outgoing' && <span className="ml-2 rounded-full bg-skybrand-600 px-2 py-0.5 text-[10px] text-white">Đã gửi</span>}
                          {rel.type === 'incoming' && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">Chờ bạn</span>}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rel.type === 'friend' ? (
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700" onClick={() => openChatWith(u)}>Chat</button>
                      ) : rel.type === 'outgoing' ? (
                        <button className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20" onClick={() => cancelRequest(rel.requestId)}>Hủy lời mời</button>
                      ) : rel.type === 'incoming' ? (
                        <>
                          <button className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700" onClick={() => acceptIncoming(rel.requestId)}>Chấp nhận</button>
                          <button className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20" onClick={() => declineIncoming(rel.requestId)}>Từ chối</button>
                        </>
                      ) : (
                        <button className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700" onClick={() => sendRequest(u)}>Kết bạn</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-10 text-center text-slate-500">Không tìm thấy người dùng nào</div>
          )
        ) : (
          <div className="py-10 text-center text-slate-500">Nhập tên hoặc email để tìm kiếm người dùng</div>
        )}
      </div>
    </div>
  );
}
