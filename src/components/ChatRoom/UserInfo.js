import React, { useState } from 'react';
import { Button, Avatar, Typography, Tooltip, Switch } from 'antd';
import { PlusOutlined, CommentOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import styled from 'styled-components';

import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';
import { useTheme } from '../../Context/ThemeProvider';
import NewMessageModal from '../Modals/NewMessageModal';

const WrapperStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.sidebar};

  .user-section {
    display: flex;
    align-items: center;
    
    .ant-avatar {
      border: 2px solid ${props => props.theme.colors.primary};
    }
  }

  .username {
    color: ${props => props.theme.colors.sidebarText};
    margin-left: 12px;
    font-weight: 500;
    font-size: 14px;
  }
  
  .action-icons {
    display: flex;
    gap: 8px;
    align-items: center;
    
    .ant-btn {
      color: ${props => props.theme.colors.sidebarText};
      border: 1px solid ${props => props.theme.colors.borderLight};
      background: transparent;
      border-radius: 6px;
      transition: all 0.2s ease;
      
      &:hover {
        color: ${props => props.theme.colors.primary};
        border-color: ${props => props.theme.colors.primary};
        background: ${props => props.theme.colors.surfaceElevated};
      }
    }
    
    .theme-switch {
      margin-left: 8px;
      
      .ant-switch {
        background-color: ${props => props.theme.colors.border};
        
        &.ant-switch-checked {
          background-color: ${props => props.theme.colors.primary};
        }
      }
    }
  }
`;

export default function UserInfo() {
  const [isNewMessageModalVisible, setIsNewMessageModalVisible] = useState(false);
  
  const {
    user: { displayName, photoURL },
  } = React.useContext(AuthContext);
  const { 
    setIsAddRoomVisible
  } = React.useContext(AppContext);
  const { isDarkMode, toggleTheme, ...theme } = useTheme();

  const handleNewRoom = () => {
    setIsAddRoomVisible(true);
  };

  const handleNewMessage = () => {
    setIsNewMessageModalVisible(true);
  };

  return (
    <WrapperStyled theme={theme}>
      <div className="user-section">
        <Avatar src={photoURL} size={40}>
          {photoURL ? '' : displayName?.charAt(0)?.toUpperCase()}
        </Avatar>
        <Typography.Text className='username'>{displayName}</Typography.Text>
      </div>
      <div className="action-icons">
        <Tooltip title="Tạo phòng mới">
          <Button 
            size="small"
            icon={<PlusOutlined />}
            onClick={handleNewRoom}
          />
        </Tooltip>
        <Tooltip title="Tạo tin nhắn mới">
          <Button 
            size="small"
            icon={<CommentOutlined />}
            onClick={handleNewMessage}
          />
        </Tooltip>
        <div className="theme-switch">
          <Tooltip title={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}>
            <Switch
              checked={isDarkMode}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              size="small"
            />
          </Tooltip>
        </div>
      </div>
      
      <NewMessageModal 
        visible={isNewMessageModalVisible}
        onClose={() => setIsNewMessageModalVisible(false)}
      />
    </WrapperStyled>
  );
}
