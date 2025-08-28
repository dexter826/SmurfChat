import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Avatar, Form, Input, Alert } from 'antd';
import Message from './Message';
import { AppContext } from '../../Context/AppProvider';
import { addDocument, updateConversationLastMessage, updateLastSeen, setTypingStatus } from '../../firebase/services';
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
      align-items: center;
    }

    &__title {
      margin: 0 0 0 12px;
      font-weight: bold;
    }

    &__status {
      font-size: 12px;
      color: #666;
      margin: 0 0 0 12px;
    }
  }
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

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  height: 24px;
  margin: 6px 0 8px;
  color: #8c8c8c;
  font-size: 12px;

  .dots {
    display: inline-block;
    margin-left: 6px;
  }

  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin: 0 2px;
    background: #bfbfbf;
    border-radius: 50%;
    animation: typingBlink 1.4s infinite ease-in-out both;
  }

  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes typingBlink {
    0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
`;

export default function ConversationWindow() {
  const { selectedConversation } = useContext(AppContext);
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
    if (!inputValue.trim() || !selectedConversation.id) return;

    addDocument('directMessages', {
      text: inputValue,
      uid,
      photoURL,
      conversationId: selectedConversation.id,
      displayName,
    });

    // Update conversation's last message
    if (selectedConversation.id) {
      try {
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

  const condition = React.useMemo(
    () => ({
      fieldName: 'conversationId',
      operator: '==',
      compareValue: selectedConversation.id,
    }),
    [selectedConversation.id]
  );

  const messages = useFirestore('directMessages', condition);

  useEffect(() => {
    // scroll to bottom after message changed
    if (messageListRef?.current) {
      messageListRef.current.scrollTop =
        messageListRef.current.scrollHeight + 50;
    }
  }, [messages]);

  // Mark conversation as read when messages change and this conversation is open
  useEffect(() => {
    const markSeen = async () => {
      try {
        if (selectedConversation.id) {
          await updateLastSeen(selectedConversation.id, uid, true);
        }
      } catch (e) {
        console.error('Error updating last seen:', e);
      }
    };
    if (selectedConversation.id) {
      markSeen();
    }
  }, [selectedConversation.id, uid, messages]);

  // Update typing status (self)
  useEffect(() => {
    const isTyping = !!inputValue.trim();
    const chatId = selectedConversation.id;
    if (!chatId) return;

    const updateTyping = async () => {
      try {
        await setTypingStatus(chatId, uid, isTyping, true);
      } catch (e) {
        console.error('Error setting typing status:', e);
      }
    };

    updateTyping();
    const t = setTimeout(() => {
      setTypingStatus(chatId, uid, false, true).catch(() => { });
    }, 3000);
    return () => clearTimeout(t);
  }, [inputValue, selectedConversation.id, uid]);

  // Get other participant info
  const otherParticipant = React.useMemo(() => {
    if (!selectedConversation.participants) return null;
    return selectedConversation.otherUser || { displayName: 'Unknown User', photoURL: '' };
  }, [selectedConversation]);

  return (
    <WrapperStyled>
      {selectedConversation.id ? (
        <>
          <HeaderStyled>
            <div className='header__info'>
              <Avatar size="default" src={otherParticipant?.photoURL}>
                {otherParticipant?.photoURL ? '' : otherParticipant?.displayName?.charAt(0)?.toUpperCase()}
              </Avatar>
              <div>
                <p className='header__title'>{otherParticipant?.displayName}</p>
                <p className='header__status'>Đang hoạt động</p>
              </div>
            </div>
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
                  uid={mes.uid}
                />
              ))}
            </MessageListStyled>
            {inputValue && (
              <TypingIndicator>
                Đang nhập
                <span className="dots">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
              </TypingIndicator>
            )}
            <FormStyled form={form}>
              <Form.Item name='message'>
                <Input
                  ref={inputRef}
                  value={inputValue}
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
          message='Hãy chọn cuộc trò chuyện'
          type='info'
          showIcon
          style={{ margin: 5 }}
          closable
        />
      )}
    </WrapperStyled>
  );
}
