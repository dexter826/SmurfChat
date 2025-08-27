import React, { useContext } from 'react';
import { Row, Col, Tabs, Button } from 'antd';
import { MessageOutlined, TeamOutlined, LogoutOutlined } from '@ant-design/icons';
import UserInfo from './UserInfo';
import RoomList from './RoomList';
import DirectMessageList from './DirectMessageList';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import styled from 'styled-components';

const { TabPane } = Tabs;

const SidebarStyled = styled.div`
  background: #3f0e40;
  color: white;
  height: 100vh;
  display: flex;
  flex-direction: column;

  .ant-tabs {
    flex: 1;
    
    .ant-tabs-tab {
      color: white !important;
      
      &.ant-tabs-tab-active {
        .ant-tabs-tab-btn {
          color: #1890ff !important;
        }
      }
    }
    
    .ant-tabs-ink-bar {
      background: #1890ff;
    }
    
    .ant-tabs-content-holder {
      padding: 0;
      flex: 1;
    }
  }
`;

const ActionButtonsStyled = styled.div`
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  .action-button {
    width: 100%;
    margin-bottom: 8px;
    color: white;
    border-color: rgba(255, 255, 255, 0.3);
    
    &:hover {
      color: #1890ff;
      border-color: #1890ff;
    }
  }
  
  .logout-button {
    background: rgba(255, 77, 79, 0.1);
    border-color: #ff4d4f;
    color: #ff4d4f;
    
    &:hover {
      background: #ff4d4f;
      color: white;
    }
  }
`;

export default function Sidebar() {
  const { 
    chatType, 
    setChatType, 
    setSelectedRoomId, 
    setSelectedConversationId
  } = useContext(AppContext);
  const { clearState } = useContext(AuthContext);

  const handleTabChange = (activeKey) => {
    setChatType(activeKey);
    if (activeKey === 'room') {
      setSelectedConversationId('');
    } else {
      setSelectedRoomId('');
    }
  };

  const handleLogout = () => {
    clearState();
  };

  return (
    <SidebarStyled>
      <Row>
        <Col span={24}>
          <UserInfo />
        </Col>
        <Col span={24} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Tabs 
            activeKey={chatType} 
            onChange={handleTabChange}
            size="small"
            centered
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <TabPane 
              tab={
                <span>
                  <TeamOutlined />
                  Phòng
                </span>
              } 
              key="room"
            >
              <RoomList />
            </TabPane>
            <TabPane 
              tab={
                <span>
                  <MessageOutlined />
                  Tin nhắn
                </span>
              } 
              key="direct"
            >
              <DirectMessageList />
            </TabPane>
          </Tabs>
        </Col>
        <Col span={24}>
          <ActionButtonsStyled>
            <Button 
              className="logout-button"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              ghost
              style={{ width: '100%' }}
            >
              Đăng xuất
            </Button>
          </ActionButtonsStyled>
        </Col>
      </Row>
    </SidebarStyled>
  );
}
