import React, { useState, useContext } from 'react';
import { Modal, Input, List, Avatar, Empty, message } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { createOrUpdateConversation } from '../../firebase/services';

const ModalContentStyled = styled.div`
  .search-input {
    margin-bottom: 16px;
  }
  
  .user-list {
    max-height: 300px;
    overflow-y: auto;
    
    .ant-list-item {
      cursor: pointer;
      padding: 12px;
      border-radius: 8px;
      transition: background-color 0.2s;
      
      &:hover {
        background-color: #f5f5f5;
      }
    }
    
    .user-info {
      display: flex;
      align-items: center;
      
      .user-details {
        margin-left: 12px;
        
        .display-name {
          font-weight: 500;
          color: #262626;
        }
        
        .email {
          color: #8c8c8c;
          font-size: 12px;
        }
      }
    }
  }
  
  .empty-state {
    padding: 40px 0;
    text-align: center;
    color: #8c8c8c;
  }
`;

export default function NewMessageModal({ visible, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { allUsers, setSelectedConversationId, setChatType } = useContext(AppContext);
  const { user } = useContext(AuthContext);

  // Filter users based on search term, excluding current user
  const filteredUsers = allUsers?.filter(u => {
    if (u.uid === user.uid) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleUserSelect = async (selectedUser) => {
    try {
      setLoading(true);
      
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
      
      message.success(`Đã tạo cuộc trò chuyện với ${selectedUser.displayName}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      message.error('Không thể tạo cuộc trò chuyện. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
    setSearchTerm('');
  };

  return (
    <Modal
      title="Tạo tin nhắn mới"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
    >
      <ModalContentStyled>
        <Input
          className="search-input"
          placeholder="Tìm kiếm người dùng..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />

        {searchTerm ? (
          filteredUsers.length > 0 ? (
            <List
              className="user-list"
              dataSource={filteredUsers}
              renderItem={(user) => (
                <List.Item
                  onClick={() => handleUserSelect(user)}
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  <div className="user-info">
                    <Avatar 
                      size={40} 
                      src={user.photoURL}
                      icon={!user.photoURL && <UserOutlined />}
                    >
                      {!user.photoURL && user.displayName?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <div className="user-details">
                      <div className="display-name">{user.displayName}</div>
                      <div className="email">{user.email}</div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          ) : (
            <div className="empty-state">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không tìm thấy người dùng nào"
              />
            </div>
          )
        ) : (
          <div className="empty-state">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nhập tên hoặc email để tìm kiếm người dùng"
            />
          </div>
        )}
      </ModalContentStyled>
    </Modal>
  );
}
