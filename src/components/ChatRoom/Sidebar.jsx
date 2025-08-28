import React, { useContext, useState } from 'react';
import UserInfo from './UserInfo';
import UnifiedChatList from './UnifiedChatList';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import useFirestore from '../../hooks/useFirestore';
import { acceptFriendRequest, declineFriendRequest, cancelFriendRequest, removeFriendship, createOrUpdateConversation, sendFriendRequest } from '../../firebase/services';

// Icon components
const ChevronDownIcon = () => (
  <svg className="h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UserPlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8v6M23 11h-6" />
  </svg>
);

const UserFriendsIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const MessageCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.476L3 21l2.476-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
  </svg>
);

const LogOutIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const { clearState, selectConversation, setChatType } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('conversations');
  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [publicSearchTerm, setPublicSearchTerm] = useState('');
  
  // Collapsible sections state
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    incoming: false,
    outgoing: false,
    friends: false
  });

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
  
  // Filter users for public search
  const publicUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(publicSearchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(publicSearchTerm.toLowerCase())
  );
  
  // Filter friends for friend search
  const filteredFriends = friendEdges.filter(edge => {
    const otherId = (edge.participants || []).find(id => id !== user.uid);
    const other = getUserById(otherId) || {};
    return other.displayName?.toLowerCase().includes(friendSearchTerm.toLowerCase()) ||
           other.email?.toLowerCase().includes(friendSearchTerm.toLowerCase());
  });

  const handleLogout = async () => {
    await logout();
    clearState();
  };

  const toggleSection = (section) => {
    setSectionsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const TabButton = ({ active, onClick, children, count = 0 }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
        active 
          ? 'border-skybrand-500 text-skybrand-600 bg-skybrand-50 dark:bg-skybrand-900/20 dark:text-skybrand-400 dark:border-skybrand-400'
          : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {children}
      {count > 0 && (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-skybrand-500 px-1.5 text-xs font-medium text-white">
          {count}
        </span>
      )}
    </button>
  );
  
  const SectionHeader = ({ title, count = 0, icon: Icon, isCollapsed, onToggle, showBadge = false }) => (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <div className="flex items-center gap-3">
        <Icon />
        <span className="font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        {showBadge && count > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-skybrand-500 px-1.5 text-xs font-medium text-white">
            {count}
          </span>
        )}
      </div>
      <div className={`transform transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}>
        <ChevronDownIcon />
      </div>
    </button>
  );

  const ActionButton = ({ onClick, variant = 'primary', children, size = 'sm', className = '' }) => {
    const baseClasses = "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1";
    const variants = {
      primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
      secondary: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
      ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm"
    };
    
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      >
        {children}
      </button>
    );
  };

  const UserCard = ({ user, description, actions, className = '' }) => (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 ${className}`}>
      <div className="relative">
        <img
          className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
          src={user?.photoURL || ''}
          alt="avatar"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div 
          className="hidden h-10 w-10 items-center justify-center rounded-full bg-skybrand-500 text-white ring-2 ring-slate-200 dark:ring-slate-700"
          style={{ display: 'none' }}
        >
          {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {user?.displayName || 'Người dùng không xác định'}
        </div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </div>
  );

  const AddFriendModal = () => (
    showAddFriendModal && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Kết bạn</h3>
            <button
              onClick={() => setShowAddFriendModal(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={publicSearchTerm}
                onChange={(e) => setPublicSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {publicSearchTerm && publicUsers.slice(0, 10).map((searchUser) => {
              const hasOutgoingRequest = outgoingRequests.some(req => req.to === searchUser.uid);
              const hasIncomingRequest = incomingRequests.some(req => req.from === searchUser.uid);
              const isFriend = friendEdges.some(edge => edge.participants?.includes(searchUser.uid));
              
              return (
                <UserCard
                  key={searchUser.uid}
                  user={searchUser}
                  description={isFriend ? 'Đã là bạn bè' : hasOutgoingRequest ? 'Đã gửi lời mời' : hasIncomingRequest ? 'Đã nhận lời mời' : 'Người dùng'}
                  actions={
                    !isFriend && !hasOutgoingRequest && !hasIncomingRequest && (
                      <ActionButton
                        variant="primary"
                        onClick={async () => {
                          await sendFriendRequest(user.uid, searchUser.uid);
                          setPublicSearchTerm('');
                        }}
                      >
                        Kết bạn
                      </ActionButton>
                    )
                  }
                />
              );
            })}
            {publicSearchTerm && publicUsers.length === 0 && (
              <div className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Không tìm thấy người dùng nào
              </div>
            )}
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      {/* Header Section */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <UserInfo />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex">
          <TabButton
            active={activeTab === 'conversations'}
            onClick={() => setActiveTab('conversations')}
          >
            <MessageCircleIcon />
            Cuộc trò chuyện
          </TabButton>
          <TabButton
            active={activeTab === 'friends'}
            onClick={() => setActiveTab('friends')}
            count={incomingRequests.length + outgoingRequests.length}
          >
            <UserFriendsIcon />
            Bạn bè
          </TabButton>
        </div>
      </div>

      {/* Tab Content */}
      <div className="thin-scrollbar flex-1 overflow-y-auto">
        {activeTab === 'conversations' && (
          <div className="py-2">
            <UnifiedChatList />
          </div>
        )}
        
        {activeTab === 'friends' && (
          <>
            {/* Friend Search */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm bạn bè..."
                    value={friendSearchTerm}
                    onChange={(e) => setFriendSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 transition-all duration-200"
                  />
                </div>
                <button
                  onClick={() => setShowAddFriendModal(true)}
                  className="flex items-center justify-center rounded-lg bg-skybrand-500 p-2.5 text-white transition-all duration-200 hover:bg-skybrand-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 active:scale-95"
                  title="Kết bạn mới"
                >
                  <UserPlusIcon />
                </button>
              </div>
            </div>

            {/* Incoming Friend Requests */}
            {incomingRequests.length > 0 && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <SectionHeader 
                  title="Lời mời kết bạn"
                  count={incomingRequests.length}
                  icon={MailIcon}
                  isCollapsed={sectionsCollapsed.incoming}
                  onToggle={() => toggleSection('incoming')}
                  showBadge={true}
                />
                {!sectionsCollapsed.incoming && (
                  <div className="space-y-2 px-2 pb-3">
                    {incomingRequests.map((req) => {
                      const fromUser = getUserById(req.from);
                      return (
                        <UserCard
                          key={req.id}
                          user={fromUser}
                          description="đã gửi lời mời kết bạn"
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          actions={
                            <>
                              <ActionButton
                                variant="primary"
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
                              </ActionButton>
                              <ActionButton
                                variant="secondary"
                                onClick={async () => { 
                                  await declineFriendRequest(req.id, user.uid); 
                                }}
                              >
                                Từ chối
                              </ActionButton>
                            </>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Outgoing Friend Requests */}
            {outgoingRequests.length > 0 && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <SectionHeader 
                  title="Lời mời đã gửi"
                  count={outgoingRequests.length}
                  icon={MailIcon}
                  isCollapsed={sectionsCollapsed.outgoing}
                  onToggle={() => toggleSection('outgoing')}
                  showBadge={true}
                />
                {!sectionsCollapsed.outgoing && (
                  <div className="space-y-1 pb-3">
                    {outgoingRequests.map((req) => {
                      const toUser = getUserById(req.to);
                      return (
                        <UserCard
                          key={req.id}
                          user={toUser}
                          description="đang chờ chấp nhận"
                          actions={
                            <ActionButton
                              variant="secondary"
                              onClick={async () => { 
                                await cancelFriendRequest(req.id, user.uid); 
                              }}
                            >
                              Hủy lời mời
                            </ActionButton>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Friends List */}
            <div>
              <SectionHeader 
                title="Danh sách bạn bè"
                count={filteredFriends.length}
                icon={UserFriendsIcon}
                isCollapsed={sectionsCollapsed.friends}
                onToggle={() => toggleSection('friends')}
                showBadge={false}
              />
              {!sectionsCollapsed.friends && (
                <div className="space-y-1 px-2 pb-3">
                  {filteredFriends.map((edge) => {
                    const otherId = (edge.participants || []).find(id => id !== user.uid);
                    const other = getUserById(otherId) || {};
                    return (
                      <UserCard
                        key={edge.id || otherId}
                        user={other}
                        description="Bạn bè"
                        className="hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200"
                        actions={
                          <ActionButton
                            variant="secondary"
                            onClick={async () => { 
                              if (window.confirm('Bạn có chắc muốn hủy kết bạn?')) {
                                await removeFriendship(user.uid, otherId);
                              }
                            }}
                          >
                            Hủy kết bạn
                          </ActionButton>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Empty State */}
            {incomingRequests.length === 0 && outgoingRequests.length === 0 && friendEdges.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                  <UserFriendsIcon />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Chưa có bạn bè</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Hãy bắt đầu kết nối bằng cách gửi lời mời kết bạn
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with Logout */}
      <div className="border-t border-slate-200 bg-white/95 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <ActionButton
          variant="ghost"
          size="md"
          onClick={handleLogout}
          className="w-full justify-center gap-2 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 dark:hover:bg-rose-900/20 dark:hover:border-rose-700 dark:hover:text-rose-400"
        >
          <LogOutIcon />
          Đăng xuất
        </ActionButton>
      </div>
      
      <AddFriendModal />
    </div>
  );
}
