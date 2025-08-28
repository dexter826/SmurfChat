import React, { useContext } from 'react';
import { Avatar, Dropdown, Button, message } from 'antd';
import { MoreOutlined, PushpinOutlined, DeleteOutlined, BellOutlined, BellFilled } from '@ant-design/icons';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { useTheme } from '../../Context/ThemeProvider';
import useFirestore from '../../hooks/useFirestore';
import { deleteConversation, togglePinChat, dissolveRoom, updateLastSeen } from '../../firebase/services';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const ChatItemStyled = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
  background-color: ${props => props.selected ? props.theme.colors.sidebarHover : 'transparent'};
  position: relative;
  
  &:hover {
    background-color: ${props => props.theme.colors.sidebarHover};
    
    .chat-menu {
      opacity: 1;
    }
  }
  
  .chat-avatar {
    margin-right: 12px;
    position: relative;
    
    .avatar-upload {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      
      &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
    }
  }
  
  .chat-info {
    flex: 1;
    color: ${props => props.theme.colors.sidebarText};
  }
  
  .chat-name {
    font-weight: ${props => props.hasUnread ? 'bold' : '500'};
    margin: 0;
    color: ${props => props.hasUnread ? props.theme.colors.unread : props.theme.colors.sidebarText};
  }
  
  .chat-description {
    font-size: 12px;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: ${props => props.hasUnread ? 'bold' : 'normal'};
    color: ${props => props.hasUnread ? props.theme.colors.unread : props.theme.colors.textMuted};
  }
  
  .chat-type-badge {
    font-size: 10px;
    background: ${props => props.theme.colors.primary};
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
  }
  
  .chat-menu {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    transition: opacity 0.2s;
    
    .ant-btn {
      background: ${props => props.theme.colors.surface};
      border: 1px solid ${props => props.theme.colors.border};
      color: ${props => props.theme.colors.sidebarText};
      
      &:hover {
        background: ${props => props.theme.colors.primary};
        color: white;
      }
    }
  }
  
  .pin-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    color: #faad14;
    font-size: 12px;
  }
`;

export default function UnifiedChatList() {
  const {
    rooms,
    conversations,
    selectedRoomId,
    selectedConversationId,
    selectRoom,
    selectConversation
  } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const theme = useTheme();

  // Get all users for conversation lookup
  const allUsersCondition = React.useMemo(() => ({
    fieldName: 'uid',
    operator: '!=',
    compareValue: user.uid,
  }), [user.uid]);

  const allUsers = useFirestore('users', allUsersCondition);


  const handleRoomClick = async (roomId) => {
    selectRoom(roomId);
    try {
      await updateLastSeen(roomId, user.uid, false);
    } catch (e) {
      console.error('Error updating room last seen:', e);
    }
  };

  const handleConversationClick = async (conversationId) => {
    selectConversation(conversationId);
    try {
      await updateLastSeen(conversationId, user.uid, true);
    } catch (e) {
      console.error('Error updating conversation last seen:', e);
    }
  };

  const handlePinChat = async (chatId, isPinned, isConversation) => {
    try {
      await togglePinChat(chatId, isPinned, isConversation);
      message.success(isPinned ? 'Đã bỏ ghim cuộc trò chuyện' : 'Đã ghim cuộc trò chuyện');
    } catch (error) {
      console.error('Error toggling pin:', error);
      message.error('Có lỗi xảy ra khi ghim/bỏ ghim');
    }
  };

  const handleDeleteChat = async (chatId, isConversation) => {
    try {
      if (isConversation) {
        await deleteConversation(chatId);
        message.success('Đã xóa cuộc trò chuyện');
      } else {
        await dissolveRoom(chatId);
        message.success('Đã xóa phòng chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      message.error('Có lỗi xảy ra khi xóa');
    }
  };

  const handleToggleMute = async (chat, isConversation) => {
    try {
      const collectionName = isConversation ? 'conversations' : 'rooms';
      const ref = doc(db, collectionName, chat.id);
      const current = !!(chat.mutedBy && chat.mutedBy[user.uid]);
      await updateDoc(ref, {
        [
          `mutedBy.${user.uid}`
        ]: !current
      });
      message.success(!current ? 'Đã tắt thông báo cuộc trò chuyện' : 'Đã bật thông báo cuộc trò chuyện');
    } catch (error) {
      console.error('Error toggling mute:', error);
      message.error('Có lỗi xảy ra khi tắt/bật thông báo');
    }
  };

  // Combine rooms and conversations into a single list
  const allChats = React.useMemo(() => {
    const getOtherParticipant = (conversation) => {
      const otherUid = conversation.participants.find(uid => uid !== user.uid);
      return allUsers.find(u => u.uid === otherUid) || { displayName: 'Unknown User', photoURL: '' };
    };

    const roomItems = rooms.map(room => ({
      ...room,
      type: 'room',
      displayName: room.name,
      description: room.description,
      avatar: room.avatar,
      isSelected: selectedRoomId === room.id,
      isMuted: !!(room.mutedBy && room.mutedBy[user.uid]),
      hasUnread: !!(room.lastSeen && room.lastSeen[user.uid] && room.lastMessageAt &&
        (room.lastMessageAt?.toDate ? room.lastMessageAt.toDate() : new Date(room.lastMessageAt)) >
        (room.lastSeen[user.uid]?.toDate ? room.lastSeen[user.uid].toDate() : new Date(room.lastSeen[user.uid]))),
      isPinned: room.pinned || false
    }));

    const conversationItems = conversations.map(conversation => {
      const otherUser = getOtherParticipant(conversation);
      return {
        ...conversation,
        type: 'conversation',
        displayName: otherUser.displayName,
        description: conversation.lastMessage || 'Chưa có tin nhắn',
        avatar: otherUser.photoURL,
        isSelected: selectedConversationId === conversation.id,
        otherUser,
        isMuted: !!(conversation.mutedBy && conversation.mutedBy[user.uid]),
        hasUnread: !!(conversation.lastSeen && conversation.lastSeen[user.uid] && conversation.lastMessageAt &&
          (conversation.lastMessageAt?.toDate ? conversation.lastMessageAt.toDate() : new Date(conversation.lastMessageAt)) >
          (conversation.lastSeen[user.uid]?.toDate ? conversation.lastSeen[user.uid].toDate() : new Date(conversation.lastSeen[user.uid]))),
        isPinned: conversation.pinned || false
      };
    });

    // Sort by pinned first, then by last activity
    return [...roomItems, ...conversationItems].sort((a, b) => {
      // Pinned items first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then by last activity or creation date
      const normalize = (t) => (t?.toDate ? t.toDate() : (t ? new Date(t) : new Date(0)));
      const aTime = normalize(a.lastMessageAt) || normalize(a.createdAt);
      const bTime = normalize(b.lastMessageAt) || normalize(b.createdAt);
      return bTime - aTime;
    });
  }, [rooms, conversations, selectedRoomId, selectedConversationId, allUsers, user.uid]);

  return (
    <div style={{ padding: '16px 0' }}>
      <h4 style={{ color: theme.colors.sidebarText, margin: '0 0 16px 16px', fontSize: '14px', fontWeight: 'bold' }}>
        Cuộc trò chuyện
      </h4>
      <div>
        {allChats.map((chat) => {
          const menuItems = [
            {
              key: 'pin',
              label: chat.isPinned ? 'Bỏ ghim' : 'Ghim cuộc trò chuyện',
              icon: <PushpinOutlined />,
              onClick: () => handlePinChat(chat.id, chat.isPinned, chat.type === 'conversation')
            },
            {
              key: 'mute',
              label: chat.isMuted ? 'Bật thông báo' : 'Tắt thông báo',
              icon: chat.isMuted ? <BellOutlined /> : <BellFilled />,
              onClick: () => handleToggleMute(chat, chat.type === 'conversation')
            },
            {
              key: 'delete',
              label: chat.type === 'room' ? 'Xóa phòng chat' : 'Xóa cuộc trò chuyện',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => handleDeleteChat(chat.id, chat.type === 'conversation')
            }
          ];

          return (
            <ChatItemStyled
              key={`${chat.type}-${chat.id}`}
              selected={chat.isSelected}
              hasUnread={chat.hasUnread}
              theme={theme}
              onClick={(e) => {
                // Prevent click when clicking on menu
                if (e.target.closest('.chat-menu')) return;

                if (chat.type === 'room') {
                  handleRoomClick(chat.id);
                } else {
                  handleConversationClick(chat.id);
                }
              }}
            >
              {chat.isPinned && (
                <PushpinOutlined className="pin-indicator" />
              )}

              <div className="chat-avatar">
                <Avatar
                  size={40}
                  src={chat.avatar}
                  style={{ backgroundColor: '#1890ff' }}
                >
                  {chat.avatar ? '' : chat.displayName?.charAt(0)?.toUpperCase()}
                </Avatar>
              </div>

              <div className="chat-info">
                <p className="chat-name">
                  {chat.displayName}
                  {chat.isMuted && (
                    <span style={{ marginLeft: 6, color: theme.colors.textMuted, fontSize: 12 }}>
                      <BellOutlined style={{ verticalAlign: 'middle' }} />
                    </span>
                  )}
                  {chat.type === 'room' && (
                    <span className="chat-type-badge">
                      Nhóm
                    </span>
                  )}
                </p>
                <p className="chat-description">
                  {(() => {
                    const typingMap = chat.type === 'conversation' ? chat.typingStatus : chat.typingStatus;
                    const someoneElseTyping = typingMap && Object.entries(typingMap).some(([k, v]) => k !== user.uid && v);
                    if (someoneElseTyping) return 'Đang nhập...';
                    return chat.description;
                  })()}
                </p>
              </div>

              <div className="chat-menu">
                <Dropdown
                  menu={{ items: menuItems }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button
                    type="text"
                    icon={<MoreOutlined />}
                    size="small"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
            </ChatItemStyled>
          );
        })}
      </div>
    </div>
  );
}
