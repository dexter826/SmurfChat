import React, { useContext } from 'react';
import { Row, Col, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import UserInfo from './UserInfo';
import UnifiedChatList from './UnifiedChatList';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
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
  const { clearState } = useContext(AppContext);
  const theme = useTheme();

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
            <UnifiedChatList />
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
