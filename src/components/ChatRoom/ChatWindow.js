import { UserAddOutlined, DeleteOutlined, MoreOutlined, CalendarOutlined, BarChartOutlined } from '@ant-design/icons';
import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Avatar, Form, Input, Alert, Dropdown, Menu, Popconfirm, Tooltip, message } from 'antd';
import Message from './Message';
import EventMessage from './EventMessage';
import VoteMessage from './VoteMessage';
import { AppContext } from '../../Context/AppProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { addDocument, parseTimeFromMessage, extractEventTitle, createEvent, dissolveRoom } from '../../firebase/services';
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
  const { selectedRoom, members, setIsAddRoomVisible, setIsCalendarVisible, setIsVoteModalVisible } = useContext(AppContext);
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

  const handleDissolveRoom = async () => {
    try {
      await dissolveRoom(selectedRoom.id);
      message.success('Nhóm đã được giải tán thành công!');
      // Clear selected room after dissolving
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error dissolving room:', error);
      message.error('Có lỗi xảy ra khi giải tán nhóm!');
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

  // Fetch events for this room
  const eventsCondition = React.useMemo(() => ({
    fieldName: 'roomId',
    operator: '==',
    compareValue: selectedRoom?.id,
  }), [selectedRoom?.id]);

  const events = useFirestore('events', eventsCondition);

  // Fetch votes for this room
  const votesCondition = React.useMemo(() => ({
    fieldName: 'roomId',
    operator: '==',
    compareValue: selectedRoom?.id,
  }), [selectedRoom?.id]);

  const allVotes = useFirestore('votes', votesCondition);
  const votes = React.useMemo(() => {
    return (allVotes || []).filter(vote => !vote.deleted);
  }, [allVotes]);

  // Combine messages and events, then sort by timestamp
  const combinedMessages = React.useMemo(() => {
    const messageItems = (messages || []).map(msg => ({
      ...msg,
      type: 'message',
      timestamp: msg.createdAt?.toDate?.() || new Date()
    }));

    const eventItems = (events || []).map(event => ({
      ...event,
      type: 'event',
      timestamp: event.createdAt?.toDate?.() || new Date()
    }));

    const voteItems = (votes || []).map(vote => ({
      ...vote,
      type: 'vote',
      timestamp: vote.createdAt?.toDate?.() || new Date()
    }));

    return [...messageItems, ...eventItems, ...voteItems]
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, events, votes]);

  useEffect(() => {
    // scroll to bottom after chat items changed
    if (messageListRef?.current) {
      messageListRef.current.scrollTop =
        messageListRef.current.scrollHeight + 50;
    }
  }, [combinedMessages]);

  const handleRemoveMember = async (memberIdToRemove) => {
    if (selectedRoom.id) {
      const roomRef = doc(db, 'rooms', selectedRoom.id);

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
              <Tooltip title="Mở lịch">
                <Button 
                  type="text" 
                  icon={<CalendarOutlined />}
                  onClick={() => setIsCalendarVisible(true)}
                />
              </Tooltip>
              <Tooltip title="Tạo vote">
                <Button 
                  type="text" 
                  icon={<BarChartOutlined />}
                  onClick={() => setIsVoteModalVisible(true)}
                />
              </Tooltip>
              <Button
                icon={<UserAddOutlined />}
                type='text'
                onClick={() => setIsAddRoomVisible(true)}
              >
                Mời
              </Button>
              <Dropdown overlay={membersMenu} trigger={['click']}>
                <Button icon={<MoreOutlined />} type='text'>
                  Thành viên ({members.length})
                </Button>
              </Dropdown>
              {isAdmin && (
                <Popconfirm
                  title="Bạn có chắc chắn muốn giải tán nhóm này?"
                  description="Hành động này không thể hoàn tác!"
                  onConfirm={handleDissolveRoom}
                  okText="Giải tán"
                  cancelText="Hủy"
                  okType="danger"
                >
                  <Button type='text' danger>
                    Giải tán nhóm
                  </Button>
                </Popconfirm>
              )}
            </ButtonGroupStyled>
          </HeaderStyled>
          <ContentStyled>
            <MessageListStyled ref={messageListRef}>
              {combinedMessages.map((item) => {
                if (item.type === 'event') {
                  return (
                    <EventMessage key={item.id} event={item} />
                  );
                } else if (item.type === 'vote') {
                  return (
                    <VoteMessage key={item.id} vote={item} />
                  );
                } else {
                  return (
                    <Message
                      key={item.id}
                      text={item.text}
                      photoURL={item.photoURL}
                      displayName={item.displayName}
                      createdAt={item.createdAt}
                      uid={item.uid}
                    />
                  );
                }
              })}
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
