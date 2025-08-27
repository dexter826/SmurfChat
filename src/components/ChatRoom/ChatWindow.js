import { UserAddOutlined, DeleteOutlined, MoreOutlined, CalendarOutlined } from '@ant-design/icons';
import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Avatar, Form, Input, Alert, Dropdown, Menu, Popconfirm, Tooltip, message } from 'antd';
import Message from './Message';
import { AppContext } from '../../Context/AppProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { addDocument, parseTimeFromMessage, extractEventTitle, createEvent } from '../../firebase/services';
import { AuthContext } from '../../Context/AuthProvider';
import useFirestore from '../../hooks/useFirestore';

const HeaderStyled = styled.div`
  display: flex;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  align-items: center;
  border-bottom: 1px solid rgb(230, 230, 230);

  .header {
    &__info {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    &__title {
      margin: 0;
      font-weight: bold;
    }

    &__description {
      font-size: 12px;
    }
  }
`;

const ButtonGroupStyled = styled.div`
  display: flex;
  align-items: center;
`;

const WrapperStyled = styled.div`
  height: 100vh;
`;

const ContentStyled = styled.div`
  height: calc(100% - 56px);
  display: flex;
  flex-direction: column;
  padding: 11px;
  justify-content: flex-end;
`;

const FormStyled = styled(Form)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 2px 2px 0;
  border: 1px solid rgb(230, 230, 230);
  border-radius: 2px;

  .ant-form-item {
    flex: 1;
    margin-bottom: 0;
  }
`;

const MessageListStyled = styled.div`
  max-height: 100%;
  overflow-y: auto;
`;

export default function ChatWindow() {
  const { selectedRoom, members, setIsInviteMemberVisible, selectedRoomId, setIsCalendarVisible } =
    useContext(AppContext);
  const {
    user: { uid, photoURL, displayName },
  } = useContext(AuthContext);
  const [inputValue, setInputValue] = useState('');
  const [form] = Form.useForm();
  const inputRef = useRef(null);
  const messageListRef = useRef(null);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleOnSubmit = async () => {
    // Check if message contains time information for event creation
    const detectedTime = parseTimeFromMessage(inputValue);
    
    addDocument('messages', {
      text: inputValue,
      uid,
      photoURL,
      roomId: selectedRoom.id,
      displayName,
      hasTimeInfo: !!detectedTime,
    });

    // Show event creation suggestion if time is detected
    if (detectedTime) {
      const eventTitle = extractEventTitle(inputValue);
      message.info({
        content: (
          <div>
            <p>Phát hiện thời gian trong tin nhắn! Bạn có muốn tạo sự kiện?</p>
            <Button 
              size="small" 
              type="primary" 
              icon={<CalendarOutlined />}
              onClick={() => handleCreateEventFromMessage(eventTitle, detectedTime)}
            >
              Tạo sự kiện
            </Button>
          </div>
        ),
        duration: 8,
        key: 'event-suggestion',
      });
    }

    form.resetFields(['message']);

    // focus to input again after submit
    if (inputRef?.current) {
      setTimeout(() => {
        inputRef.current.focus();
      });
    }
  };

  const handleCreateEventFromMessage = async (title, datetime) => {
    try {
      const eventData = {
        title,
        description: `Được tạo từ tin nhắn: "${inputValue}"`,
        datetime,
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        createdBy: uid,
        createdByName: displayName,
        participants: selectedRoom.members,
        reminderMinutes: 15,
        status: 'active',
        type: 'meeting'
      };

      await createEvent(eventData);
      message.success('Sự kiện đã được tạo thành công!');
    } catch (error) {
      console.error('Error creating event from message:', error);
      message.error('Có lỗi xảy ra khi tạo sự kiện!');
    }
  };

  const condition = React.useMemo(
    () => ({
      fieldName: 'roomId',
      operator: '==',
      compareValue: selectedRoom.id,
    }),
    [selectedRoom.id]
  );

  const messages = useFirestore('messages', condition);

  useEffect(() => {
    // scroll to bottom after message changed
    if (messageListRef?.current) {
      messageListRef.current.scrollTop =
        messageListRef.current.scrollHeight + 50;
    }
  }, [messages]);

  const handleRemoveMember = async (memberIdToRemove) => {
    if (selectedRoomId) {
      const roomRef = doc(db, 'rooms', selectedRoomId);

      // Get the current members array and filter out the member to be removed
      const updatedMembers = selectedRoom.members.filter(
        (memberUid) => memberUid !== memberIdToRemove
      );

      // Update the document in Firestore
      await updateDoc(roomRef, {
        members: updatedMembers,
      });
    }
  };

  const isAdmin = selectedRoom.admin === uid;

  const membersMenu = (
    <Menu>
      {members.map((member) => (
        <Menu.Item key={member.uid}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Avatar size='small' src={member.photoURL}>
                {member.photoURL ? '' : member.displayName?.charAt(0)?.toUpperCase()}
              </Avatar>
              {` ${member.displayName}`}
            </div>
            {isAdmin && member.uid !== uid && (
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
                />
              </Popconfirm>
            )}
          </div>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <WrapperStyled>
      {selectedRoom.id ? (
        <>
          <HeaderStyled>
            <div className='header__info'>
              <p className='header__title'>{selectedRoom.name}</p>
              <span className='header__description'>
                {selectedRoom.description}
              </span>
            </div>
            <ButtonGroupStyled>
              <Tooltip title="Xem lịch phòng">
                <Button
                  icon={<CalendarOutlined />}
                  type='text'
                  onClick={() => setIsCalendarVisible(true)}
                >
                  Lịch
                </Button>
              </Tooltip>
              <Button
                icon={<UserAddOutlined />}
                type='text'
                onClick={() => setIsInviteMemberVisible(true)}
              >
                Mời
              </Button>
              <Dropdown overlay={membersMenu} trigger={['click']}>
                <Button icon={<MoreOutlined />} type='text'>
                  Thành viên ({members.length})
                </Button>
              </Dropdown>
            </ButtonGroupStyled>
          </HeaderStyled>
          <ContentStyled>
            <MessageListStyled ref={messageListRef}>
              {messages.map((mes) => (
                <Message
                  key={mes.id}
                  text={mes.text}
                  photoURL={mes.photoURL}
                  displayName={mes.displayName}
                  createdAt={mes.createdAt}
                />
              ))}
            </MessageListStyled>
            <FormStyled form={form}>
              <Form.Item name='message'>
                <Input
                  ref={inputRef}
                  onChange={handleInputChange}
                  onPressEnter={handleOnSubmit}
                  placeholder='Nhập tin nhắn...'
                  bordered={false}
                  autoComplete='off'
                />
              </Form.Item>
              <Button type='primary' onClick={handleOnSubmit}>
                Gửi
              </Button>
            </FormStyled>
          </ContentStyled>
        </>
      ) : (
        <Alert
          message='Hãy chọn phòng'
          type='info'
          showIcon
          style={{ margin: 5 }}
          closable
        />
      )}
    </WrapperStyled>
  );
}
