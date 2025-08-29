import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { addDocument, updateConversationLastMessage, updateLastSeen, setTypingStatus, areUsersFriends } from '../../firebase/services';
import useFirestore from '../../hooks/useFirestore';
import Message from './Message';
import { useUserOnlineStatus } from '../../hooks/useOnlineStatus';
import FileUpload from '../FileUpload/FileUpload';
import VoiceRecording from '../FileUpload/VoiceRecording';

export default function ConversationWindow() {
  const { selectedConversation } = useContext(AppContext);
  const {
    user: { uid, photoURL, displayName },
  } = useContext(AuthContext);
  const [inputValue, setInputValue] = useState('');
  const messageListRef = useRef();
  const inputRef = useRef();
  const [canChat, setCanChat] = useState(true);

  // Online status component
  const OnlineStatus = ({ userId }) => {
    const { isOnline } = useUserOnlineStatus(userId);
    return (
      <p className='m-0 text-xs text-slate-500'>
        {isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
      </p>
    );
  };


  const handleOnSubmit = async () => {
    if (!inputValue.trim() || !selectedConversation.id) return;

    addDocument('directMessages', {
      text: inputValue,
      uid,
      photoURL,
      conversationId: selectedConversation.id,
      displayName,
      messageType: 'text',
    });

    // Update conversation's last message
    if (selectedConversation.id) {
      try {
        await updateConversationLastMessage(selectedConversation.id, inputValue, uid);
      } catch (error) {
        console.error('Error updating conversation:', error);
      }
    }

    // reset
    setInputValue('');

    // focus to input again after submit
    if (inputRef?.current) {
      setTimeout(() => {
        inputRef.current.focus();
      });
    }
  };

  // Handle file upload
  const handleFileUploaded = async (fileData) => {
    if (!selectedConversation.id) return;

    const messageData = {
      uid,
      photoURL,
      displayName,
      messageType: fileData.messageType,
      fileData: fileData,
      text: '', // Empty text for file messages
      conversationId: selectedConversation.id,
    };

    addDocument('directMessages', messageData);

    // Update conversation's last message
    try {
      const lastMessageText = fileData.messageType === 'voice' ? '🎤 Tin nhắn thoại' : 
                             fileData.category === 'image' ? '🖼️ Hình ảnh' : 
                             `📎 ${fileData.name}`;
      await updateConversationLastMessage(selectedConversation.id, lastMessageText, uid);
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  // Handle location sharing
  const handleLocationShared = async (locationData) => {
    if (!selectedConversation.id) return;

    const messageData = {
      uid,
      photoURL,
      displayName,
      messageType: 'location',
      locationData: locationData,
      text: '', // Empty text for location messages
      conversationId: selectedConversation.id,
    };

    addDocument('directMessages', messageData);

    // Update conversation's last message
    try {
      await updateConversationLastMessage(selectedConversation.id, '📍 Vị trí được chia sẻ', uid);
    } catch (error) {
      console.error('Error updating conversation:', error);
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

  // Check friendship to enable/disable chat
  useEffect(() => {
    const check = async () => {
      try {
        const otherId = (selectedConversation.participants || []).find(id => id !== uid);
        if (!otherId) { setCanChat(true); return; }
        const ok = await areUsersFriends(uid, otherId);
        setCanChat(!!ok);
      } catch { setCanChat(true); }
    };
    if (selectedConversation && selectedConversation.participants) {
      check();
    }
  }, [selectedConversation, uid]);

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
    <div className="flex h-screen flex-col">
      {selectedConversation.id ? (
        <>
          <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
            <div className='flex items-center'>
              {otherParticipant?.photoURL ? (
                <img className="h-8 w-8 rounded-full" src={otherParticipant?.photoURL} alt="avatar" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skybrand-600 text-white">
                  {otherParticipant?.displayName?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className="ml-3">
                <p className='m-0 text-base font-semibold'>{otherParticipant?.displayName}</p>
                <OnlineStatus userId={otherParticipant?.uid} />
              </div>
            </div>
          </div>
          <div className="flex h-[calc(100%_-_56px)] flex-col justify-end p-3">
            <div ref={messageListRef} className="thin-scrollbar max-h-full overflow-y-auto">
              {messages.map((mes) => (
                <Message
                  key={mes.id}
                  id={mes.id}
                  text={mes.text}
                  photoURL={mes.photoURL}
                  displayName={mes.displayName}
                  createdAt={mes.createdAt}
                  uid={mes.uid}
                  messageType={mes.messageType || 'text'}
                  fileData={mes.fileData}
                  locationData={mes.locationData}
                  recalled={mes.recalled}
                  chatType="direct"
                />
              ))}
            </div>
            {(() => {
              const typingMap = selectedConversation?.typingStatus;
              const isOtherTyping = typingMap && Object.entries(typingMap).some(([k, v]) => k !== uid && v);
              return isOtherTyping ? (
                <div className="mt-1 mb-2 flex h-6 items-center text-xs text-slate-500 dark:text-slate-400">
                  Đang nhập
                  <span className="ml-2 inline-flex gap-1">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400"></span>
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]"></span>
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]"></span>
                  </span>
                </div>
              ) : null;
            })()}
            {!canChat && (
              <div className="my-2 rounded border border-skybrand-300 bg-skybrand-50 p-2 text-xs text-skybrand-700 dark:border-skybrand-700 dark:bg-skybrand-900/20 dark:text-skybrand-300">
                Hai bạn chưa là bạn bè. Hãy kết bạn để có thể nhắn tin.
              </div>
            )}
            <div className="flex items-center space-x-2 rounded border border-gray-200 p-1 dark:border-gray-700">
              {/* File Upload Component */}
              <FileUpload
                onFileUploaded={handleFileUploaded}
                onLocationShared={handleLocationShared}
                disabled={!canChat}
              />
              
              {/* Text Input */}
              <input
                ref={inputRef}
                className="flex-1 bg-transparent px-2 py-1 outline-none placeholder:text-slate-400"
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleOnSubmit(); } }}
                placeholder='Nhập tin nhắn...'
                autoComplete='off'
                value={inputValue}
                disabled={!canChat}
              />
              
              {/* Voice Recording Button */}
              <VoiceRecording
                onVoiceUploaded={handleFileUploaded}
                disabled={!canChat}
              />
              
              <button
                className={`rounded px-3 py-1 text-sm font-medium text-white ${canChat ? 'bg-skybrand-600 hover:bg-skybrand-700' : 'bg-slate-400'}`}
                onClick={handleOnSubmit}
                disabled={!canChat}
              >
                Gửi
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="m-2 rounded border border-skybrand-300 bg-skybrand-50 p-2 text-sm text-skybrand-700 dark:border-skybrand-700 dark:bg-skybrand-900/20 dark:text-skybrand-300">
          Hãy chọn cuộc trò chuyện
        </div>
      )}
    </div>
  );
}
