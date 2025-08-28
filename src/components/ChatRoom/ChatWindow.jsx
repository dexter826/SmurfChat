import { CalendarOutlined, BarChartOutlined } from '@ant-design/icons';
import React, { useContext, useEffect, useRef, useState } from 'react';
import Message from './Message';
import EventMessage from './EventMessage';
import VoteMessage from './VoteMessage';
import RoomInfoModal from './RoomInfoModal';
import { AppContext } from '../../Context/AppProvider';
import { addDocument, parseTimeFromMessage, extractEventTitle, createEvent, dissolveRoom, updateRoomLastMessage, updateLastSeen, setTypingStatus } from '../../firebase/services';
import { AuthContext } from '../../Context/AuthProvider';
import useFirestore from '../../hooks/useFirestore';
import { useTheme } from '../../Context/ThemeProvider';

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
  const [form] = [null];
  const inputRef = useRef(null);
  const messageListRef = useRef(null);
  const [isRoomInfoVisible, setIsRoomInfoVisible] = useState(false);
  const lastNotifiedMessageIdRef = useRef(null);

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

      // Update room's last message for sorting and unread
      try {
        await updateRoomLastMessage(selectedRoom.id, inputValue, uid);
      } catch (error) {
        console.error('Error updating room last message:', error);
      }

      // Suggest creating an event if time detected
      if (detectedTime) {
        const eventTitle = extractEventTitle(inputValue);
        const ok = window.confirm('Phát hiện thời gian trong tin nhắn. Tạo sự kiện?');
        if (ok) {
          await handleCreateEventFromMessage(eventTitle, detectedTime);
        }
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

    // reset input
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
      try { window.alert('Sự kiện đã được tạo thành công!'); } catch { }
    } catch (error) {
      console.error('Error creating event from message:', error);
      try { window.alert('Có lỗi xảy ra khi tạo sự kiện!'); } catch { }
    }
  };

  const handleDissolveRoom = async () => {
    try {
      await dissolveRoom(selectedRoom.id);
      try { window.alert('Nhóm đã được giải tán thành công!'); } catch { }
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (error) {
      console.error('Error dissolving room:', error);
      try { window.alert('Có lỗi xảy ra khi giải tán nhóm!'); } catch { }
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

  // (moved) Notification handled globally in AppProvider

  // Mark messages as read when viewing an active chat
  useEffect(() => {
    const markSeen = async () => {
      try {
        if (chatType === 'room' && selectedRoom.id) {
          await updateLastSeen(selectedRoom.id, uid, false);
        } else if (chatType === 'direct' && selectedConversation.id) {
          await updateLastSeen(selectedConversation.id, uid, true);
        }
      } catch (e) {
        console.error('Error updating last seen:', e);
      }
    };
    if ((chatType === 'room' && selectedRoom.id) || (chatType === 'direct' && selectedConversation.id)) {
      markSeen();
    }
  }, [chatType, selectedRoom.id, selectedConversation.id, combinedMessages, uid]);

  // Update typing status (self)
  useEffect(() => {
    const isTyping = !!inputValue.trim();
    const chatId = chatType === 'room' ? selectedRoom.id : selectedConversation.id;
    const isConversation = chatType === 'direct';
    if (!chatId) return;

    const updateTyping = async () => {
      try {
        await setTypingStatus(chatId, uid, isTyping, isConversation);
      } catch (e) {
        console.error('Error setting typing status:', e);
      }
    };

    updateTyping();

    // Auto clear typing after idle 3s
    const t = setTimeout(() => {
      setTypingStatus(chatId, uid, false, isConversation).catch(() => { });
    }, 3000);
    return () => clearTimeout(t);
  }, [inputValue, chatType, selectedRoom.id, selectedConversation.id, uid]);


  const isAdmin = selectedRoom.admin === uid;

  // Determine if there's an active chat
  const hasActiveChat = (chatType === 'room' && selectedRoom.id) || (chatType === 'direct' && selectedConversation.id);

  return (
    <div className="flex h-screen flex-col">
      {hasActiveChat ? (
        <>
          <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
            <div className='flex flex-col justify-center'>
              {chatType === 'room' ? (
                <>
                  <p className='m-0 text-base font-semibold'>{selectedRoom.name}</p>
                  <span className='text-xs text-slate-500 dark:text-slate-400'>
                    {selectedRoom.description}
                  </span>
                </>
              ) : (
                <>
                  {selectedConversation.otherUser?.photoURL ? (
                    <img className="h-8 w-8 rounded-full" src={selectedConversation.otherUser?.photoURL} alt="avatar" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skybrand-600 text-white">
                      {selectedConversation.otherUser?.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div style={{ marginLeft: '12px' }}>
                    <p className='m-0 text-base font-semibold'>{selectedConversation.otherUser?.displayName}</p>
                    <span className='text-xs text-slate-500 dark:text-slate-400'>
                      {selectedConversation.typingStatus && Object.entries(selectedConversation.typingStatus)
                        .some(([k, v]) => k !== uid && v) ? 'Đang nhập...' : 'Đang hoạt động'}
                    </span>
                  </div>
                </>
              )}
            </div>
            {chatType === 'room' && (
              <div className="flex items-center gap-2">
                <button
                  title="Mở lịch"
                  className="rounded-md border border-gray-300 p-1 text-slate-700 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setIsCalendarVisible(true)}
                >
                  <CalendarOutlined />
                </button>
                <button
                  title="Tạo vote"
                  className="rounded-md border border-gray-300 p-1 text-slate-700 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setIsVoteModalVisible(true)}
                >
                  <BarChartOutlined />
                </button>
                <button
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 dark:border-gray-700 dark:text-slate-200"
                  onClick={() => setIsAddRoomVisible(true)}
                >
                  Mời
                </button>
                <button
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 dark:border-gray-700 dark:text-slate-200"
                  onClick={() => setIsRoomInfoVisible(true)}
                >
                  Thông tin nhóm
                </button>
                {isAdmin && (
                  <button
                    className="rounded-md border border-rose-300 px-2 py-1 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    onClick={() => { if (window.confirm('Giải tán nhóm này? Hành động không thể hoàn tác.')) handleDissolveRoom(); }}
                  >
                    Giải tán nhóm
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex h-[calc(100%_-_56px)] flex-col justify-end p-3">
            <div ref={messageListRef} className="thin-scrollbar max-h-full overflow-y-auto">
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
            </div>
            {(() => {
              const typingMap = chatType === 'direct' ? selectedConversation?.typingStatus : selectedRoom?.typingStatus;
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
            <div className="flex items-center justify-between rounded border border-gray-200 p-1 dark:border-gray-700">
              <input
                ref={inputRef}
                className="w-full bg-transparent px-2 py-1 outline-none placeholder:text-slate-400"
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleOnSubmit(); } }}
                placeholder='Nhập tin nhắn...'
                autoComplete='off'
                value={inputValue}
              />
              <button
                className="ml-2 rounded bg-skybrand-600 px-3 py-1 text-sm font-medium text-white hover:bg-skybrand-700"
                onClick={handleOnSubmit}
              >
                Gửi
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-sky-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-md p-10 text-center">
            <h1 className="mb-4 text-3xl font-bold text-skybrand-600">Chào mừng đến với SmurfChat! 👋</h1>
            <p className="mb-8 text-sm text-slate-600 dark:text-slate-300">Chọn một cuộc trò chuyện hoặc phòng để bắt đầu nhắn tin</p>
            <div className="mb-8">
              <img
                src="/welcome.png"
                alt="SmurfChat Welcome"
                className="mx-auto h-auto max-w-[200px] rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Room Info Modal */}
      <RoomInfoModal
        visible={isRoomInfoVisible}
        onClose={() => setIsRoomInfoVisible(false)}
        room={selectedRoom}
      />
    </div>
  );
}
