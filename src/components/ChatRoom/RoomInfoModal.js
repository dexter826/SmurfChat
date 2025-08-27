import React, { useState, useContext } from 'react';
import { Modal, Avatar, List, Button, Upload, message, Popconfirm, Select } from 'antd';
import { CameraOutlined, DeleteOutlined, LogoutOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { updateRoomAvatar, dissolveRoom, leaveRoom, transferRoomAdmin } from '../../firebase/services';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const { Option } = Select;

const ModalContentStyled = styled.div`
  .room-header {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
    
    .avatar-container {
      position: relative;
      margin-right: 16px;
      
      .avatar-upload {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        border-radius: 50%;
        
        &:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
      }
    }
    
    .room-info {
      flex: 1;
      
      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: bold;
      }
      
      p {
        margin: 4px 0 0 0;
        color: #666;
      }
    }
  }
  
  .members-section {
    margin-bottom: 24px;
    
    h4 {
      margin-bottom: 16px;
      font-weight: bold;
    }
  }
  
  .member-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    
    .member-info {
      display: flex;
      align-items: center;
      
      .member-name {
        margin-left: 12px;
        font-weight: 500;
      }
      
      .admin-badge {
        margin-left: 8px;
        background: #1890ff;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
      }
    }
  }
  
  .actions-section {
    border-top: 1px solid #f0f0f0;
    padding-top: 16px;
    
    .action-button {
      margin-right: 8px;
      margin-bottom: 8px;
    }
  }
  
  .admin-transfer {
    margin-bottom: 16px;
    
    .transfer-label {
      margin-bottom: 8px;
      font-weight: 500;
    }
  }
`;

export default function RoomInfoModal({ visible, onClose, room }) {
  const { members, clearState } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);

  const isAdmin = room?.admin === user?.uid;
  const isCurrentUserAdmin = room?.admin === user?.uid;

  const handleAvatarUpload = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const avatarUrl = e.target.result;
        await updateRoomAvatar(room.id, avatarUrl);
        message.success('Đã cập nhật avatar nhóm!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Lỗi khi upload avatar:', error);
      message.error('Không thể cập nhật avatar nhóm');
    }
    return false;
  };

  const handleRemoveMember = async (memberIdToRemove) => {
    if (room.id) {
      const roomRef = doc(db, 'rooms', room.id);
      const updatedMembers = room.members.filter(
        (memberUid) => memberUid !== memberIdToRemove
      );

      await updateDoc(roomRef, {
        members: updatedMembers,
      });
      
      message.success('Đã xóa thành viên khỏi nhóm!');
    }
  };

  const handleDissolveRoom = async () => {
    try {
      await dissolveRoom(room.id);
      message.success('Nhóm đã được giải tán thành công!');
      onClose();
      clearState();
    } catch (error) {
      console.error('Error dissolving room:', error);
      message.error('Có lỗi xảy ra khi giải tán nhóm!');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      if (isCurrentUserAdmin && room.members.length > 1) {
        // Admin cần chọn người kế nhiệm
        if (!selectedNewAdmin) {
          message.error('Vui lòng chọn admin mới trước khi rời nhóm!');
          return;
        }
        await transferRoomAdmin(room.id, selectedNewAdmin);
      }
      
      await leaveRoom(room.id, user.uid);
      message.success('Đã rời nhóm thành công!');
      onClose();
      clearState();
    } catch (error) {
      console.error('Error leaving room:', error);
      message.error('Có lỗi xảy ra khi rời nhóm!');
    }
  };

  const availableAdmins = members.filter(member => member.uid !== user.uid);

  return (
    <Modal
      title="Thông tin nhóm"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <ModalContentStyled>
        <div className="room-header">
          <div className="avatar-container">
            <Avatar 
              size={64}
              src={room?.avatar}
              style={{ backgroundColor: '#1890ff' }}
            >
              {room?.avatar ? '' : room?.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleAvatarUpload}
              className="avatar-upload"
            >
              <div className="avatar-upload">
                <CameraOutlined />
              </div>
            </Upload>
          </div>
          <div className="room-info">
            <h3>{room?.name}</h3>
            <p>{room?.description}</p>
            <p>{members?.length} thành viên</p>
          </div>
        </div>

        <div className="members-section">
          <h4>Thành viên</h4>
          <List
            dataSource={members}
            renderItem={(member) => (
              <div className="member-item">
                <div className="member-info">
                  <Avatar size="small" src={member.photoURL}>
                    {member.photoURL ? '' : member.displayName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <span className="member-name">{member.displayName}</span>
                  {member.uid === room?.admin && (
                    <span className="admin-badge">Admin</span>
                  )}
                </div>
                {isAdmin && member.uid !== user.uid && (
                  <Popconfirm
                    title="Bạn chắc chắn muốn xóa thành viên này?"
                    onConfirm={() => handleRemoveMember(member.uid)}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                    />
                  </Popconfirm>
                )}
              </div>
            )}
          />
        </div>

        <div className="actions-section">
          {isCurrentUserAdmin && room.members.length > 1 && (
            <div className="admin-transfer">
              <div className="transfer-label">
                Chọn admin mới trước khi rời nhóm:
              </div>
              <Select
                placeholder="Chọn admin mới"
                style={{ width: '100%', marginBottom: 16 }}
                value={selectedNewAdmin}
                onChange={setSelectedNewAdmin}
              >
                {availableAdmins.map(member => (
                  <Option key={member.uid} value={member.uid}>
                    <Avatar size="small" src={member.photoURL} style={{ marginRight: 8 }}>
                      {member.photoURL ? '' : member.displayName?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    {member.displayName}
                  </Option>
                ))}
              </Select>
            </div>
          )}

          {isAdmin ? (
            <Popconfirm
              title="Bạn có chắc chắn muốn giải tán nhóm này?"
              description="Hành động này không thể hoàn tác!"
              onConfirm={handleDissolveRoom}
              okText="Giải tán"
              cancelText="Hủy"
              okType="danger"
            >
              <Button 
                type="primary" 
                danger 
                icon={<DeleteOutlined />}
                className="action-button"
              >
                Giải tán nhóm
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title={isCurrentUserAdmin ? 
                "Bạn có chắc chắn muốn rời nhóm? Vui lòng chọn admin mới trước." : 
                "Bạn có chắc chắn muốn rời nhóm?"
              }
              onConfirm={handleLeaveRoom}
              okText="Rời nhóm"
              cancelText="Hủy"
              okType="danger"
              disabled={isCurrentUserAdmin && !selectedNewAdmin}
            >
              <Button 
                type="default" 
                danger 
                icon={<LogoutOutlined />}
                className="action-button"
              >
                Rời nhóm
              </Button>
            </Popconfirm>
          )}
        </div>
      </ModalContentStyled>
    </Modal>
  );
}
