import { UserAddOutlined, MoreOutlined, CalendarOutlined, BarChartOutlined } from '@ant-design/icons';
import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Avatar, Form, Input, Popconfirm, Tooltip, message } from 'antd';
import Message from './Message';
import EventMessage from './EventMessage';
import VoteMessage from './VoteMessage';
import RoomInfoModal from './RoomInfoModal';
import { AppContext } from '../../Context/AppProvider';
import { addDocument, parseTimeFromMessage, extractEventTitle, createEvent, dissolveRoom } from '../../firebase/services';
import { AuthContext } from '../../Context/AuthProvider';
import { useTheme } from '../../Context/ThemeProvider';
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

const WelcomeScreenStyled = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.colors.backgroundGradient};
  
  .welcome-content {
    text-align: center;
    max-width: 500px;
    padding: 40px;
  }
  
  .welcome-title {
    font-size: 32px;
    font-weight: bold;
    color: ${props => props.theme.colors.primary};
    margin-bottom: 16px;
  }
  
  .welcome-subtitle {
    font-size: 16px;
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: 32px;
  }
  
  .welcome-image {
    margin-bottom: 32px;
  }
`;

export default function ChatWindow() {
  const { 
    selectedRoom, 
    selectedConversation, 
    chatType, 
    setIsAddRoomVisible, 
    setIsCalendarVisible, 
    setIsVoteModalVisible 
  } = useContext(AppContext);
  const {
    user: { uid, photoURL, displayName },
  } = useContext(AuthContext);
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [form] = Form.useForm();
  const inputRef = useRef(null);
  const messageListRef = useRef(null);
  const [isRoomInfoVisible, setIsRoomInfoVisible] = useState(false);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleOnSubmit = async () => {
    if (!inputValue.trim()) return;

    if (chatType === 'room' && selectedRoom.id) {
      // Handle room message
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
    } else if (chatType === 'direct' && selectedConversation.id) {
      // Handle direct message
      addDocument('directMessages', {
        text: inputValue,
        uid,
        photoURL,
        conversationId: selectedConversation.id,
        displayName,
      });

      // Update conversation's last message
      try {
        const { updateConversationLastMessage } = await import('../../firebase/services');
        await updateConversationLastMessage(selectedConversation.id, inputValue, uid);
      } catch (error) {
        console.error('Error updating conversation:', error);
      }
    }

    form.resetFields(['message']);
    setInputValue('');

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

  // Conditions for fetching messages based on chat type
  const roomCondition = React.useMemo(
    () => ({
      fieldName: 'roomId',
      operator: '==',
      compareValue: selectedRoom.id,
    }),
    [selectedRoom.id]
  );

  const conversationCondition = React.useMemo(
    () => ({
      fieldName: 'conversationId',
      operator: '==',
      compareValue: selectedConversation.id,
    }),
    [selectedConversation.id]
  );

  const roomMessages = useFirestore('messages', chatType === 'room' ? roomCondition : null);
  const directMessages = useFirestore('directMessages', chatType === 'direct' ? conversationCondition : null);

  const messages = chatType === 'room' ? roomMessages : directMessages;

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

  // Combine messages and events, then sort by timestamp (only for room chats)
  const combinedMessages = React.useMemo(() => {
    const messageItems = (messages || []).map(msg => ({
      ...msg,
      type: 'message',
      timestamp: msg.createdAt?.toDate?.() || new Date()
    }));

    if (chatType === 'room') {
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
    }

    // For direct messages, only return message items
    return messageItems.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, events, votes, chatType]);

  useEffect(() => {
    // scroll to bottom after chat items changed
    if (messageListRef?.current) {
      messageListRef.current.scrollTop =
        messageListRef.current.scrollHeight + 50;
    }
  }, [combinedMessages]);


  const isAdmin = selectedRoom.admin === uid;

  // Determine if there's an active chat
  const hasActiveChat = (chatType === 'room' && selectedRoom.id) || (chatType === 'direct' && selectedConversation.id);

  return (
    <WrapperStyled>
      {hasActiveChat ? (
        <>
          <HeaderStyled>
            <div className='header__info'>
              {chatType === 'room' ? (
                <>
                  <p className='header__title'>{selectedRoom.name}</p>
                  <span className='header__description'>
                    {selectedRoom.description}
                  </span>
                </>
              ) : (
                <>
                  <Avatar size="default" src={selectedConversation.otherUser?.photoURL}>
                    {selectedConversation.otherUser?.photoURL ? '' : selectedConversation.otherUser?.displayName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <div style={{ marginLeft: '12px' }}>
                    <p className='header__title'>{selectedConversation.otherUser?.displayName}</p>
                    <span className='header__description'>Đang hoạt động</span>
                  </div>
                </>
              )}
            </div>
            {chatType === 'room' && (
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
                <Button 
                  icon={<MoreOutlined />} 
                  type='text'
                  onClick={() => setIsRoomInfoVisible(true)}
                >
                  Thông tin nhóm
                </Button>
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
            )}
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
        <WelcomeScreenStyled theme={theme}>
          <div className="welcome-content">
            <h1 className="welcome-title">Chào mừng đến với SmurfChat! 👋</h1>
            <p className="welcome-subtitle">Chọn một cuộc trò chuyện hoặc phòng để bắt đầu nhắn tin</p>
            <div className="welcome-image">
            <img 
                src="/welcome.png" 
                alt="SmurfChat Welcome"
                style={{ borderRadius: '12px', maxWidth: '200px', height: 'auto' }}
              />
            </div>
          </div>
        </WelcomeScreenStyled>
      )}
      
      {/* Room Info Modal */}
      <RoomInfoModal
        visible={isRoomInfoVisible}
        onClose={() => setIsRoomInfoVisible(false)}
        room={selectedRoom}
      />
    </WrapperStyled>
  );
}
