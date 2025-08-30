import React, { useState, useContext } from 'react';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import { useAlert } from '../../Context/AlertProvider';
import { uploadImage, sendFriendRequest, createOrUpdateConversation, blockUser, unblockUser, isUserBlocked } from '../../firebase/services';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { FaCamera, FaTimes, FaEnvelope, FaCalendarAlt, FaCircle, FaBan } from 'react-icons/fa';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import useFirestore from '../../hooks/useFirestore';

function UserProfileModalComponent({ visible, onClose, targetUser, isOwnProfile = false }) {
  const { user: currentUser } = useContext(AuthContext);
  const { selectConversation, setChatType } = useContext(AppContext);
  const { success, error, confirm } = useAlert();
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const { isOnline } = useOnlineStatus(targetUser?.uid);

  // Check if users are friends
  const friendsCondition = React.useMemo(() => ({
    fieldName: 'participants',
    operator: 'array-contains',
    compareValue: currentUser?.uid,
  }), [currentUser?.uid]);
  
  const friendEdges = useFirestore('friends', friendsCondition);
  
  // Check if there's a pending friend request
  const outgoingReqsCondition = React.useMemo(() => ({
    fieldName: 'from',
    operator: '==',
    compareValue: currentUser?.uid,
  }), [currentUser?.uid]);
  
  const outgoingRequests = useFirestore('friend_requests', outgoingReqsCondition);

  // Kiểm tra trạng thái block khi modal mở
  React.useEffect(() => {
    const checkBlockStatus = async () => {
      if (currentUser?.uid && targetUser?.uid && !isOwnProfile && visible) {
        try {
          const blocked = await isUserBlocked(currentUser.uid, targetUser.uid);
          setIsBlocked(blocked);
        } catch (err) {
          console.error('Error checking block status:', err);
        }
      }
    };

    if (visible) {
      checkBlockStatus();
    }
  }, [visible, currentUser?.uid, targetUser?.uid, isOwnProfile]);

  // Nếu không có targetUser, không hiển thị modal
  if (!visible || !targetUser) return null;
  
  const isFriend = friendEdges.some(edge => 
    edge.participants?.includes(targetUser.uid) && 
    edge.participants?.includes(currentUser.uid)
  );

  const hasPendingRequest = outgoingRequests.some(req => 
    req.to === targetUser.uid && req.status === 'pending'
  );

  // Xử lý upload avatar (chỉ cho profile của mình)
  const handleAvatarUpload = async (file) => {
    if (!isOwnProfile) return;
    
    setIsUploading(true);
    try {
      const uploadResult = await uploadImage(file, currentUser.uid);
      await updateProfile(auth.currentUser, {
        photoURL: uploadResult.url
      });
      success('Đã cập nhật avatar!');
    } catch (err) {
      console.error('Lỗi upload avatar:', err);
      error('Không thể cập nhật avatar');
    } finally {
      setIsUploading(false);
    }
  };

  // Xử lý gửi tin nhắn
  const handleSendMessage = async () => {
    try {
      const conversationId = [currentUser.uid, targetUser.uid].sort().join('_');
      await createOrUpdateConversation({
        id: conversationId,
        participants: [currentUser.uid, targetUser.uid],
        type: 'direct',
        lastMessage: '',
        lastMessageAt: null,
        createdBy: currentUser.uid
      });
      setChatType('direct');
      selectConversation(conversationId);
      onClose();
      success('Đã mở cuộc trò chuyện!');
    } catch (err) {
      console.error('Error creating conversation:', err);
      error(err.message || 'Không thể mở cuộc trò chuyện');
    }
  };

  // Xử lý kết bạn
  const handleAddFriend = async () => {
    if (hasPendingRequest) {
      error('Đã gửi lời mời kết bạn trước đó');
      return;
    }

    setIsAddingFriend(true);
    try {
      await sendFriendRequest(currentUser.uid, targetUser.uid);
      success('Đã gửi lời mời kết bạn!');
      onClose();
    } catch (err) {
      console.error('Error sending friend request:', err);
      error(err.message || 'Không thể gửi lời mời kết bạn');
    } finally {
      setIsAddingFriend(false);
    }
  };

  // Format ngày tham gia
  const formatJoinDate = (timestamp) => {
    if (!timestamp) return 'Chưa rõ';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('vi-VN');
  };

  // Xử lý chặn/bỏ chặn người dùng
  const handleToggleBlock = async () => {
    const actionText = isBlocked ? 'bỏ chặn' : 'chặn';
    const confirmed = await confirm(
      `Bạn có chắc muốn ${actionText} ${targetUser.displayName}?`
    );
    
    if (!confirmed) return;

    setIsBlockingUser(true);
    try {
      if (isBlocked) {
        await unblockUser(currentUser.uid, targetUser.uid);
        setIsBlocked(false);
        success(`Đã bỏ chặn ${targetUser.displayName}`);
      } else {
        await blockUser(currentUser.uid, targetUser.uid);
        setIsBlocked(true);
        success(`Đã chặn ${targetUser.displayName}`);
        onClose(); // Đóng modal sau khi chặn
      }
    } catch (err) {
      console.error('Error toggling block:', err);
      error(err.message || `Không thể ${actionText} người dùng`);
    } finally {
      setIsBlockingUser(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-slate-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {isOwnProfile ? 'Hồ sơ của tôi' : 'Hồ sơ người dùng'}
          </h3>
          <button
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>

        {/* Avatar Section */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative mb-4">
            {targetUser.photoURL ? (
              <img
                className="h-24 w-24 rounded-full object-cover ring-4 ring-skybrand-400/30"
                src={targetUser.photoURL}
                alt="avatar"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-skybrand-500 to-skybrand-600 text-white ring-4 ring-skybrand-400/30 text-2xl font-semibold">
                {targetUser.displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            
            {/* Camera icon for own profile */}
            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-skybrand-600 p-2 text-white shadow-lg transition hover:bg-skybrand-700">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                  }}
                  disabled={isUploading}
                />
                <FaCamera className="h-3 w-3" />
              </label>
            )}
            
            {/* Upload indicator */}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* User Name */}
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {targetUser.displayName || targetUser.email || 'Người dùng không xác định'}
          </h2>
        </div>

        {/* User Info */}
        <div className="mb-6 space-y-3">
          {/* Email */}
          <div className="flex items-center gap-3 text-sm">
            <FaEnvelope className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">
              {targetUser.email || 'Email không có sẵn'}
            </span>
          </div>

          {/* Online Status */}
          <div className="flex items-center gap-3 text-sm">
            <FaCircle className={`h-3 w-3 ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span className="text-slate-600 dark:text-slate-400">
              {isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
            </span>
          </div>

          {/* Join Date */}
          {(targetUser.metadata?.creationTime || targetUser.createdAt) && (
            <div className="flex items-center gap-3 text-sm">
              <FaCalendarAlt className="h-4 w-4 text-slate-500" />
              <span className="text-slate-600 dark:text-slate-400">
                Tham gia: {formatJoinDate(
                  targetUser.metadata?.creationTime 
                    ? new Date(targetUser.metadata.creationTime)
                    : targetUser.createdAt?.toDate 
                      ? targetUser.createdAt.toDate()
                      : new Date(targetUser.createdAt)
                )}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="flex flex-col gap-3">
            {/* Primary Action Buttons */}
            <div className="flex gap-3">
              {/* Send Message Button */}
              {isFriend && !isBlocked && (
                <button
                  onClick={handleSendMessage}
                  className="flex-1 rounded-lg bg-skybrand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-skybrand-700 focus:outline-none focus:ring-2 focus:ring-skybrand-500 focus:ring-offset-1"
                >
                  Gửi tin nhắn
                </button>
              )}

              {/* Add Friend Button */}
              {!isFriend && !isBlocked && (
                <button
                  onClick={handleAddFriend}
                  disabled={isAddingFriend}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-skybrand-500 focus:ring-offset-1 ${
                    hasPendingRequest 
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20' 
                      : 'border-skybrand-600 text-skybrand-600 hover:bg-skybrand-50 dark:hover:bg-skybrand-900/20'
                  } ${isAddingFriend ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isAddingFriend ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Đang gửi...
                    </div>
                  ) : hasPendingRequest ? (
                    'Đã gửi lời mời'
                  ) : (
                    'Kết bạn'
                  )}
                </button>
              )}
            </div>

            {/* Block/Unblock Button */}
            <button
              onClick={handleToggleBlock}
              disabled={isBlockingUser}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                isBlocked 
                  ? 'border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-100 focus:ring-orange-500 dark:bg-orange-900/20 dark:hover:bg-orange-900/30'
                  : 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500 dark:bg-red-900/20 dark:hover:bg-red-900/30'
              } ${isBlockingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isBlockingUser ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  {isBlocked ? 'Đang bỏ chặn...' : 'Đang chặn...'}
                </>
              ) : (
                <>
                  <FaBan className="h-4 w-4" />
                  {isBlocked ? 'Bỏ chặn' : 'Chặn người dùng'}
                </>
              )}
            </button>

            {/* Blocked User Message */}
            {isBlocked && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center dark:bg-red-900/20 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Bạn đã chặn người dùng này. Họ không thể gửi tin nhắn cho bạn.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper component that connects to AppContext
export default function UserProfileModal() {
  const { user: currentUser } = useContext(AuthContext);
  const { 
    isUserProfileVisible, 
    setIsUserProfileVisible, 
    selectedUser 
  } = useContext(AppContext);

  const handleClose = () => {
    setIsUserProfileVisible(false);
  };

  // Determine if this is the user's own profile
  const isOwnProfile = selectedUser?.uid === currentUser?.uid;

  return (
    <UserProfileModalComponent
      visible={isUserProfileVisible}
      onClose={handleClose}
      targetUser={selectedUser}
      isOwnProfile={isOwnProfile}
    />
  );
}
