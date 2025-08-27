import React, { useContext } from 'react';
import { Avatar } from 'antd';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { useTheme } from '../../Context/ThemeProvider';
import useFirestore from '../../hooks/useFirestore';



const ConversationItemStyled = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  background-color: ${props => props.selected ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .conversation-info {
    margin-left: 12px;
    color: white;
    flex: 1;
  }

  .conversation-name {
    font-weight: 500;
    margin: 0;
  }

  .last-message {
    font-size: 12px;
    opacity: 0.7;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export default function DirectMessageList() {
  const { setSelectedConversationId, selectedConversationId, conversations } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const theme = useTheme();

  // Get all users for search functionality
  const allUsersCondition = React.useMemo(() => ({
    fieldName: 'uid',
    operator: '!=',
    compareValue: user.uid,
  }), [user.uid]);

  const allUsers = useFirestore('users', allUsersCondition);



  const getOtherParticipant = (conversation) => {
    const otherUid = conversation.participants.find(uid => uid !== user.uid);
    return allUsers.find(u => u.uid === otherUid) || { displayName: 'Unknown User', photoURL: '' };
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <h4 style={{ color: theme.colors.sidebarText, margin: '0 0 16px 16px', fontSize: '14px', fontWeight: 'bold' }}>Tin nhắn trực tiếp</h4>
      <div style={{ padding: '0 16px' }}>
        {conversations.map((conversation) => {
          const otherUser = getOtherParticipant(conversation);
          return (
            <ConversationItemStyled
              key={conversation.id}
              selected={selectedConversationId === conversation.id}
              onClick={() => setSelectedConversationId(conversation.id)}
            >
              <Avatar size="small" src={otherUser.photoURL}>
                {otherUser.photoURL ? '' : otherUser.displayName?.charAt(0)?.toUpperCase()}
              </Avatar>
              <div className="conversation-info">
                <p className="conversation-name">{otherUser.displayName}</p>
                <p className="last-message">{conversation.lastMessage || 'Chưa có tin nhắn'}</p>
              </div>
            </ConversationItemStyled>
          );
        })}
      </div>
    </div>
  );
}
