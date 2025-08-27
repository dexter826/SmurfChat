import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Avatar, Form, Input, Alert } from 'antd';
import Message from './Message';
import { AppContext } from '../../Context/AppProvider';
import { addDocument, updateConversationLastMessage } from '../../firebase/services';
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
