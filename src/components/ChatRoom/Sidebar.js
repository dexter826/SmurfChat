import React, { useContext } from 'react';
import { Row, Col, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import UserInfo from './UserInfo';
import UnifiedChatList from './UnifiedChatList';
import { AuthContext } from '../../Context/AuthProvider';
import styled from 'styled-components';


const SidebarStyled = styled.div`
  background: #3f0e40;
  color: white;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  
  .chat-lists {
    flex: 1;
    padding: 16px 0;
    overflow-y: auto;
  }
`;

const ActionButtonsStyled = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: #3f0e40;
  
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
  const { clearState } = useContext(AuthContext);


  const handleLogout = () => {
    clearState();
  };

  return (
    <SidebarStyled>
      <Row>
        <Col span={24}>
          <UserInfo />
        </Col>
        <Col span={24} style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
          <div className="chat-lists">
            <UnifiedChatList />
          </div>
        </Col>
      </Row>
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
    </SidebarStyled>
  );
}
