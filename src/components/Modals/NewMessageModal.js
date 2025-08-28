import React, { useState, useContext } from 'react';
import { Modal, Input, List, Avatar, Empty, message, Tag, Button, Space } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { createOrUpdateConversation, areUsersFriends, getPendingFriendRequest, sendFriendRequest, acceptFriendRequest, declineFriendRequest, cancelFriendRequest } from '../../firebase/services';
import useFirestore from '../../hooks/useFirestore';

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

        message.success(`Đã tạo cuộc trò chuyện với ${selectedUser.displayName}`);
        return;
      }
      message.info('Hai bạn chưa là bạn bè. Hãy gửi lời mời kết bạn trước.');
    } catch (error) {
      console.error('Error creating conversation:', error);
      message.error('Không thể thực hiện thao tác. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (toUser) => {
    try {
      setLoading(true);
      const pending = await getPendingFriendRequest(user.uid, toUser.uid);
      if (pending && pending.status === 'pending') {
        message.info('Bạn đã gửi lời mời trước đó.');
        return;
      }
      await sendFriendRequest(user.uid, toUser.uid);
      message.success('Đã gửi lời mời kết bạn.');
    } catch (e) {
      console.error(e);
      message.error('Gửi lời mời thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (reqId) => {
    try {
      setLoading(true);
      await cancelFriendRequest(reqId, user.uid);
      message.success('Đã hủy lời mời.');
    } catch (e) {
      console.error(e);
      message.error('Hủy lời mời thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const acceptIncoming = async (reqId) => {
    try {
      setLoading(true);
      await acceptFriendRequest(reqId, user.uid);
      message.success('Đã chấp nhận lời mời.');
    } catch (e) {
      console.error(e);
      message.error('Không thể chấp nhận lời mời.');
    } finally {
      setLoading(false);
    }
  };

  const declineIncoming = async (reqId) => {
    try {
      setLoading(true);
      await declineFriendRequest(reqId, user.uid);
      message.success('Đã từ chối lời mời.');
    } catch (e) {
      console.error(e);
      message.error('Không thể từ chối lời mời.');
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
              renderItem={(u) => {
                const rel = getRelation(u.uid);
                return (
                  <List.Item
                    actions={[
                      rel.type === 'friend' ? (
                        <Button key="chat" type="link" onClick={() => openChatWith(u)}>Chat</Button>
                      ) : rel.type === 'outgoing' ? (
                        <Button key="cancel" type="link" danger onClick={() => cancelRequest(rel.requestId)}>Hủy lời mời</Button>
                      ) : rel.type === 'incoming' ? (
                        <Space key="act">
                          <Button type="link" onClick={() => acceptIncoming(rel.requestId)}>Chấp nhận</Button>
                          <Button type="link" danger onClick={() => declineIncoming(rel.requestId)}>Từ chối</Button>
                        </Space>
                      ) : (
                        <Button key="send" type="link" onClick={() => sendRequest(u)}>Kết bạn</Button>
                      )
                    ]}
                    style={{ opacity: loading ? 0.6 : 1 }}
                  >
                    <div className="user-info">
                      <Avatar
                        size={40}
                        src={u.photoURL}
                        icon={!u.photoURL && <UserOutlined />}
                      >
                        {!u.photoURL && u.displayName?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <div className="user-details">
                        <div className="display-name">
                          {u.displayName}
                          {rel.type === 'friend' && <Tag color="green" style={{ marginLeft: 8 }}>Bạn bè</Tag>}
                          {rel.type === 'outgoing' && <Tag color="blue" style={{ marginLeft: 8 }}>Đã gửi</Tag>}
                          {rel.type === 'incoming' && <Tag color="orange" style={{ marginLeft: 8 }}>Chờ bạn</Tag>}
                        </div>
                        <div className="email">
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
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
