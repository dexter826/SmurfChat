import React from 'react';
import { Avatar, Upload, message } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
import { useTheme } from '../../Context/ThemeProvider';
import { updateRoomAvatar } from '../../firebase/services';



const RoomItemStyled = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .room-avatar {
    margin-right: 12px;
    position: relative;
    
    .avatar-upload {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      
      &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
    }
  }
  
  .room-name {
    flex: 1;
    color: ${props => props.theme.colors.sidebarText};
    font-weight: 500;
  }
`;

export default function RoomList() {
  const { rooms, setSelectedRoomId } = React.useContext(AppContext);
  const theme = useTheme();

  const handleAvatarUpload = async (file, roomId) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Tạo URL tạm thời cho preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const avatarUrl = e.target.result;
        await updateRoomAvatar(roomId, avatarUrl);
        message.success('Đã cập nhật avatar phòng!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Lỗi khi upload avatar:', error);
      message.error('Không thể cập nhật avatar phòng');
    }
    return false; // Ngăn upload tự động
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <h4 style={{ color: theme.colors.sidebarText, margin: '0 0 16px 16px', fontSize: '14px', fontWeight: 'bold' }}>Danh sách các phòng</h4>
      <div style={{ padding: '0 16px' }}>
        {rooms.map((room) => (
          <RoomItemStyled key={room.id} onClick={() => setSelectedRoomId(room.id)} theme={theme}>
            <div className="room-avatar">
              <Avatar 
                size={40}
                src={room.avatar}
                style={{ backgroundColor: '#1890ff' }}
              >
                {room.avatar ? '' : room.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => handleAvatarUpload(file, room.id)}
                className="avatar-upload"
              >
                <div className="avatar-upload">
                  <CameraOutlined />
                </div>
              </Upload>
            </div>
            <div className="room-name">
              {room.name}
            </div>
          </RoomItemStyled>
        ))}
      </div>
    </div>
  );
}
