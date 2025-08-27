import React from 'react';
import { Button, Avatar, Typography, Space, Tooltip } from 'antd';
import { PlusOutlined, CommentOutlined } from '@ant-design/icons';
import styled from 'styled-components';

import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';

const WrapperStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(82, 38, 83);

  .username {
    color: white;
    margin-left: 5px;
  }
  
  .action-icons {
    .ant-btn {
      color: white;
      border-color: rgba(255, 255, 255, 0.3);
      margin-left: 4px;
      
      &:hover {
        color: #1890ff;
        border-color: #1890ff;
      }
    }
  }
`;

export default function UserInfo() {
  const {
    user: { displayName, photoURL },
  } = React.useContext(AuthContext);
  const { 
    setIsAddRoomVisible,
    setChatType,
    setSelectedRoomId
  } = React.useContext(AppContext);

  const handleNewRoom = () => {
    setIsAddRoomVisible(true);
  };

  const handleNewMessage = () => {
    setChatType('direct');
    setSelectedRoomId('');
  };


  return (
    <WrapperStyled>
      <div>
        <Avatar src={photoURL}>
          {photoURL ? '' : displayName?.charAt(0)?.toUpperCase()}
        </Avatar>
        <Typography.Text className='username'>{displayName}</Typography.Text>
      </div>
      <div className="action-icons">
        <Space>
          <Tooltip title="Tạo phòng mới">
            <Button 
              ghost
              size="small"
              icon={<PlusOutlined />}
              onClick={handleNewRoom}
            />
          </Tooltip>
          <Tooltip title="Tạo tin nhắn mới">
            <Button 
              ghost
              size="small"
              icon={<CommentOutlined />}
              onClick={handleNewMessage}
            />
          </Tooltip>
        </Space>
      </div>
    </WrapperStyled>
  );
}
