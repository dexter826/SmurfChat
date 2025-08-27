import React, { useContext, useState } from 'react';
import { Collapse, Button, Input, Avatar } from 'antd';
import styled from 'styled-components';
import { MessageOutlined } from '@ant-design/icons';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import useFirestore from '../../hooks/useFirestore';

const { Panel } = Collapse;
const { Search } = Input;

const PanelStyled = styled(Panel)`
  &&& {
    .ant-collapse-header,
    p {
      color: white;
    }

    .ant-collapse-content-box {
      padding: 0 16px;
    }

    .search-user {
      margin-bottom: 16px;
    }
  }
`;

const UserItemStyled = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .user-info {
    margin-left: 12px;
    color: white;
  }

  .user-name {
    font-weight: 500;
    margin: 0;
  }

  .user-status {
    font-size: 12px;
    opacity: 0.7;
    margin: 0;
  }
`;

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
  const [searchValue, setSearchValue] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Get all users for search functionality
  const allUsersCondition = React.useMemo(() => ({
    fieldName: 'uid',
    operator: '!=',
    compareValue: user.uid,
  }), [user.uid]);

  const allUsers = useFirestore('users', allUsersCondition);

  // Filter users based on search
  const filteredUsers = React.useMemo(() => {
    if (!searchValue) return [];
    return allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(searchValue.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [allUsers, searchValue]);

  const handleStartConversation = (otherUser) => {
    // Create or find existing conversation
    const existingConversation = conversations.find(conv => 
      conv.participants.includes(otherUser.uid) && conv.participants.includes(user.uid)
    );

    if (existingConversation) {
      setSelectedConversationId(existingConversation.id);
    } else {
      // Will be handled by AppProvider to create new conversation
      setSelectedConversationId(`new_${otherUser.uid}`);
    }
    
    setShowUserSearch(false);
    setSearchValue('');
  };

  const getOtherParticipant = (conversation) => {
    const otherUid = conversation.participants.find(uid => uid !== user.uid);
    return allUsers.find(u => u.uid === otherUid) || { displayName: 'Unknown User', photoURL: '' };
  };

  return (
    <Collapse ghost defaultActiveKey={['1']}>
      <PanelStyled header='Tin nhắn trực tiếp' key='1'>
        {!showUserSearch ? (
          <>
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
            <Button
              type='text'
              icon={<MessageOutlined />}
              style={{ color: 'white', padding: 0, marginTop: 8 }}
              onClick={() => setShowUserSearch(true)}
            >
              Tin nhắn mới
            </Button>
          </>
        ) : (
          <div>
            <Search
              placeholder="Tìm kiếm người dùng..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="search-user"
              style={{ marginBottom: 16 }}
            />
            {filteredUsers.map((user) => (
              <UserItemStyled
                key={user.uid}
                onClick={() => handleStartConversation(user)}
              >
                <Avatar size="small" src={user.photoURL}>
                  {user.photoURL ? '' : user.displayName?.charAt(0)?.toUpperCase()}
                </Avatar>
                <div className="user-info">
                  <p className="user-name">{user.displayName}</p>
                  <p className="user-status">Nhấn để bắt đầu trò chuyện</p>
                </div>
              </UserItemStyled>
            ))}
            <Button
              type='text'
              style={{ color: 'white', padding: 0, marginTop: 8 }}
              onClick={() => {
                setShowUserSearch(false);
                setSearchValue('');
              }}
            >
              Quay lại
            </Button>
          </div>
        )}
      </PanelStyled>
    </Collapse>
  );
}
