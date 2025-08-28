import React, { useContext } from 'react';
import { Row, Col, Button, Badge, List, Avatar } from 'antd';
import { LogoutOutlined, UserAddOutlined, CheckOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import UserInfo from './UserInfo';
import UnifiedChatList from './UnifiedChatList';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import useFirestore from '../../hooks/useFirestore';
import { acceptFriendRequest, declineFriendRequest, cancelFriendRequest, removeFriendship, createOrUpdateConversation } from '../../firebase/services';
import { useTheme } from '../../Context/ThemeProvider';
import styled from 'styled-components';


const SidebarStyled = styled.div`
  background: ${props => props.theme.colors.sidebar};
  color: ${props => props.theme.colors.sidebarText};
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  border-right: 1px solid ${props => props.theme.colors.border};
  
  .chat-lists {
    flex: 1;
    padding: 8px 0;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: ${props => props.theme.colors.surface};
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: ${props => props.theme.colors.border};
      border-radius: 3px;
      
      &:hover {
        background: ${props => props.theme.colors.primary};
      }
    }
  }
  .requests {
    padding: 8px 0 0;
    border-top: 1px solid ${props => props.theme.colors.border};
  }
  .friends {
    padding: 8px 0 0;
    border-top: 1px solid ${props => props.theme.colors.border};
  }
`;

const ActionButtonsStyled = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: ${props => props.theme.colors.sidebar};
  border-top: 1px solid ${props => props.theme.colors.border};
  
  .logout-button {
    background: transparent;
    border: 1px solid ${props => props.theme.colors.borderLight};
    color: ${props => props.theme.colors.sidebarText};
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${props => props.theme.colors.error};
      border-color: ${props => props.theme.colors.error};
      color: white;
    }
  }
`;

export default function Sidebar() {
  const { logout } = useContext(AuthContext);
  const { clearState, selectConversation, setChatType } = useContext(AppContext);
  const theme = useTheme();
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
    <SidebarStyled theme={theme}>
      <Row>
        <Col span={24}>
          <UserInfo />
        </Col>
        <Col span={24} style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
          <div className="chat-lists">
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px 8px' }}>
              <span style={{ flex: 1, fontWeight: 600 }}>Cuộc trò chuyện</span>
              <Badge count={incomingRequests.length} size="small">
                <span style={{ fontSize: 12, color: theme.colors.textMuted, marginRight: 4 }}>Lời mời</span>
              </Badge>
            </div>
            <UnifiedChatList />
            {incomingRequests.length > 0 && (
              <div className="requests">
                <div style={{ padding: '0 16px 8px', fontWeight: 600 }}>Lời mời kết bạn</div>
                <List
                  dataSource={incomingRequests}
                  renderItem={(req) => (
                    <List.Item
                      actions={[
                        <Button key="accept" type="link" icon={<CheckOutlined />} onClick={async () => {
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
                        }}>
                          Chấp nhận
                        </Button>,
                        <Button key="decline" type="link" danger icon={<CloseOutlined />} onClick={async () => { await declineFriendRequest(req.id, user.uid); }}>
                          Từ chối
                        </Button>
                      ]}
                      style={{ padding: '8px 16px' }}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={getUserById(req.from)?.photoURL} icon={<UserAddOutlined />} />}
                        title={<span>{getUserById(req.from)?.displayName || 'Một người dùng'}</span>}
                        description={<span>đã gửi lời mời kết bạn</span>}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}

            {outgoingRequests.length > 0 && (
              <div className="requests">
                <div style={{ padding: '0 16px 8px', fontWeight: 600 }}>Lời mời đã gửi</div>
                <List
                  dataSource={outgoingRequests}
                  renderItem={(req) => (
                    <List.Item
                      actions={[
                        <Button key="cancel" type="link" danger icon={<CloseOutlined />} onClick={async () => { await cancelFriendRequest(req.id, user.uid); }}>
                          Hủy lời mời
                        </Button>
                      ]}
                      style={{ padding: '8px 16px' }}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={getUserById(req.to)?.photoURL} icon={<UserOutlined />} />}
                        title={<span>{getUserById(req.to)?.displayName || 'Một người dùng'}</span>}
                        description={<span>đang chờ chấp nhận</span>}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}

            {friendEdges.length > 0 && (
              <div className="friends">
                <div style={{ padding: '0 16px 8px', fontWeight: 600 }}>Bạn bè</div>
                <List
                  dataSource={friendEdges}
                  renderItem={(edge) => {
                    const otherId = (edge.participants || []).find(id => id !== user.uid);
                    const other = getUserById(otherId) || {};
                    return (
                      <List.Item
                        actions={[
                          <Button key="remove" type="link" danger onClick={async () => { await removeFriendship(user.uid, otherId); }}>
                            Hủy kết bạn
                          </Button>
                        ]}
                        style={{ padding: '8px 16px' }}
                      >
                        <List.Item.Meta
                          avatar={<Avatar src={other.photoURL} icon={<UserOutlined />} />}
                          title={<span>{other.displayName || otherId}</span>}
                        />
                      </List.Item>
                    );
                  }}
                />
              </div>
            )}
          </div>
        </Col>
      </Row>
      <ActionButtonsStyled theme={theme}>
        <Button
          className="logout-button"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          style={{ width: '100%' }}
        >
          Đăng xuất
        </Button>
      </ActionButtonsStyled>
    </SidebarStyled>
  );
}
