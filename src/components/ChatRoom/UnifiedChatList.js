import React, { useContext } from 'react';
import { Avatar } from 'antd';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import useFirestore from '../../hooks/useFirestore';

const ChatItemStyled = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
  background-color: ${props => props.selected ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
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
    color: white;
  }
  
  .chat-name {
    font-weight: 500;
    margin: 0;
  }
  
  .chat-description {
    font-size: 12px;
    opacity: 0.7;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .chat-type-badge {
    font-size: 10px;
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
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

  // Get all users for conversation lookup
  const allUsersCondition = React.useMemo(() => ({
    fieldName: 'uid',
    operator: '!=',
    compareValue: user.uid,
  }), [user.uid]);

  const allUsers = useFirestore('users', allUsersCondition);


  const handleRoomClick = (roomId) => {
    selectRoom(roomId);
  };

  const handleConversationClick = (conversationId) => {
    selectConversation(conversationId);
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
      isSelected: selectedRoomId === room.id
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
        otherUser
      };
    });

    return [...roomItems, ...conversationItems].sort((a, b) => {
      // Sort by last activity or creation date
      const aTime = a.lastMessageAt || a.createdAt || new Date(0);
      const bTime = b.lastMessageAt || b.createdAt || new Date(0);
      return new Date(bTime) - new Date(aTime);
    });
  }, [rooms, conversations, selectedRoomId, selectedConversationId, allUsers, user.uid]);

  return (
    <div style={{ padding: '16px 0' }}>
      <h4 style={{ color: 'white', margin: '0 0 16px 16px', fontSize: '14px', fontWeight: 'bold' }}>
        Cuộc trò chuyện
      </h4>
      <div>
        {allChats.map((chat) => (
          <ChatItemStyled
            key={`${chat.type}-${chat.id}`}
            selected={chat.isSelected}
            onClick={() => {
              if (chat.type === 'room') {
                handleRoomClick(chat.id);
              } else {
                handleConversationClick(chat.id);
              }
            }}
          >
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
                {chat.type === 'room' && (
                  <span className="chat-type-badge">
                    Nhóm
                  </span>
                )}
              </p>
              <p className="chat-description">{chat.description}</p>
            </div>
          </ChatItemStyled>
        ))}
      </div>
    </div>
  );
}
