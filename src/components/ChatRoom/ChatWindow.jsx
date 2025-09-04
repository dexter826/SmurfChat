import { FaCalendar, FaChartBar } from 'react-icons/fa';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { updateLastSeen, setTypingStatus, markMessageAsRead } from '../../firebase/services';
import useFirestore from '../../hooks/useFirestore';
import usePaginatedFirestore from '../../hooks/usePaginatedFirestore';
import InfiniteScrollContainer from '../Common/InfiniteScrollContainer';
import Message from './Message';
import { useUserOnlineStatus } from '../../hooks/useOnlineStatus';
import EventMessage from './EventMessage';
import VoteMessage from './VoteMessage';
import RoomInfoModal from './RoomInfoModal';
import FileUpload from '../FileUpload/FileUpload';
import VoiceRecording from '../FileUpload/VoiceRecording';
import EmojiPickerComponent from './EmojiPicker';
import { QuickReactions } from './EmojiText';
import { useMessageHandler } from '../../hooks/useMessageHandler';

export default function ChatWindow() {
  const {
    selectedRoom,
    selectedConversation,
    chatType,
    setIsInviteMemberVisible,
    setIsCalendarVisible,
    setIsVoteModalVisible,
    members
  } = useContext(AppContext);
  const {
    user: { uid },
  } = useContext(AuthContext);
  
  // Get current chat data based on chat type
  const currentChatData = chatType === 'room' ? selectedRoom : selectedConversation;
  
  // Use the new message handler hook
  const {
    inputValue,
    setInputValue,
    showQuickReactions,
    inputRef,
    handleTextMessage,
    handleFileMessage,
    handleLocationMessage,
    handleEmojiClick,
    toggleQuickReactions,
  } = useMessageHandler(chatType, currentChatData);
  
  const messageListRef = useRef();
  const [isRoomInfoVisible, setIsRoomInfoVisible] = useState(false);

  // Online status component for conversations
  const ConversationOnlineStatus = ({ userId, typingStatus, currentUserId }) => {
    const { isOnline } = useUserOnlineStatus(userId);
    const isTyping = typingStatus && Object.entries(typingStatus)
      .some(([k, v]) => k !== currentUserId && v);
    
    return (
      <span className='text-xs text-slate-500 dark:text-slate-400'>
        {isTyping ? 'Đang nhập...' : (isOnline ? 'Đang hoạt động' : 'Không hoạt động')}
      </span>
    );
  };


  const handleOnSubmit = async () => {
    await handleTextMessage();
  };

  // Handle file upload
  const handleFileUploaded = async (fileData) => {
    await handleFileMessage(fileData);
  };

  // Handle location sharing
  const handleLocationShared = async (locationData) => {
    await handleLocationMessage(locationData);
  };

  // Unified messages condition based on chat type
  const messagesCondition = React.useMemo(() => {
    if (chatType === 'room' && selectedRoom?.id) {
      return {
        fieldName: 'chatId',
        operator: '==',
        compareValue: selectedRoom.id,
      };
    } else if (chatType === 'direct' && selectedConversation?.id) {
      return {
        fieldName: 'chatId',
        operator: '==',
        compareValue: selectedConversation.id,
      };
    }
    return null;
  }, [chatType, selectedRoom?.id, selectedConversation?.id]);

  // Use paginated firestore for messages
  const {
    documents: messages,
    loading: messagesLoading,
    hasMore,
    loadMore,
    refresh: refreshMessages
  } = usePaginatedFirestore(
    'messages',
    messagesCondition,
    'createdAt',
    'desc', // newest first
    30, // page size
    true // real-time
  );

  // Still use regular useFirestore for events and votes since they're usually smaller datasets
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
  const votes = allVotes;

  // Combine messages and events, then sort by timestamp (only for room chats)
  const combinedMessages = React.useMemo(() => {
    // Convert messages to items with timestamps (reverse since paginated data comes desc)
    const messageItems = [...messages].reverse().map(msg => ({
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
    // scroll to bottom after chat items changed (only for new messages)
    if (messageListRef?.current && combinedMessages.length > 0) {
      // Only scroll if we're not loading more (to prevent scroll jumping)
      if (!messagesLoading) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight + 50;
      }
    }
  }, [combinedMessages, messagesLoading]);

  // (moved) Notification handled globally in AppProvider

  // Mark messages as read when viewing an active chat
  useEffect(() => {
    const markSeen = async () => {
      try {
        if (chatType === 'room' && selectedRoom.id) {
          await updateLastSeen(selectedRoom.id, uid, false);
          
          // Mark all unread messages in this room as read
          const unreadMessages = messages.filter(msg => {
            const readByDetails = msg.readByDetails || {};
            return msg.uid !== uid && // Not sent by current user
                   !readByDetails[uid]; // Not already read by current user
          });
          
          for (const message of unreadMessages) {
            try {
              await markMessageAsRead(message.id, uid, 'messages', 'room');
            } catch (err) {
              console.error('Error marking message as read:', err);
            }
          }
        } else if (chatType === 'direct' && selectedConversation.id) {
          await updateLastSeen(selectedConversation.id, uid, true);
          
          // Mark all unread direct messages as read
          const unreadMessages = messages.filter(msg => {
            const readByDetails = msg.readByDetails || {};
            return msg.uid !== uid && // Not sent by current user
                   !readByDetails[uid]; // Not already read by current user
          });
          
          for (const message of unreadMessages) {
            try {
              await markMessageAsRead(message.id, uid, 'messages', 'direct');
            } catch (err) {
              console.error('Error marking direct message as read:', err);
            }
          }
        }
      } catch (e) {
        console.error('Error updating last seen:', e);
      }
    };
    if ((chatType === 'room' && selectedRoom.id) || (chatType === 'direct' && selectedConversation.id)) {
      markSeen();
    }
  }, [chatType, selectedRoom.id, selectedConversation.id, combinedMessages, uid, messages]);

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


  // Determine if there's an active chat
  const hasActiveChat = (chatType === 'room' && selectedRoom.id) || (chatType === 'direct' && selectedConversation.id);

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-900">
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
                    <ConversationOnlineStatus 
                      userId={selectedConversation.otherUser?.uid}
                      typingStatus={selectedConversation.typingStatus}
                      currentUserId={uid}
                    />
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
                  <FaCalendar />
                </button>
                <button
                  title="Tạo vote"
                  className="rounded-md border border-gray-300 p-1 text-slate-700 hover:bg-slate-100 dark:border-gray-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setIsVoteModalVisible(true)}
                >
                  <FaChartBar />
                </button>
                <button
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 dark:border-gray-700 dark:text-slate-200"
                  onClick={() => setIsInviteMemberVisible(true)}
                >
                  Mời
                </button>
                <button
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm font-medium text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 dark:border-gray-700 dark:text-slate-200"
                  onClick={() => setIsRoomInfoVisible(true)}
                >
                  Thông tin nhóm
                </button>
              </div>
            )}
          </div>
          <div className="flex h-[calc(100%_-_56px)] flex-col justify-end p-3">
            <InfiniteScrollContainer
              hasMore={hasMore}
              loading={messagesLoading}
              loadMore={loadMore}
              reverse={true} // Load older messages on top scroll
              className="max-h-full"
              style={{ display: 'flex', flexDirection: 'column-reverse' }}
            >
              <div ref={messageListRef}>
                {combinedMessages.map((item, index) => {
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
                        id={item.id}
                      text={item.text}
                      photoURL={item.photoURL}
                      displayName={item.displayName}
                      createdAt={item.createdAt}
                      uid={item.uid}
                      messageType={item.messageType}
                      fileData={item.fileData}
                      locationData={item.locationData}
                      messageStatus={item.messageStatus || 'sent'}
                      readBy={item.readBy || []}
                      readByDetails={item.readByDetails || {}}
                      recalled={item.recalled}
                      chatType={chatType}
                      isLatestFromSender={index === combinedMessages.length - 1} // Only the very last message
                      members={members || []} // Pass room members with full user info for avatar display
                    />
                  );
                }
              })}
              </div>
            </InfiniteScrollContainer>
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

            {/* Quick Reactions */}
            {showQuickReactions && (
              <div className="mb-2">
                <QuickReactions 
                  onEmojiClick={handleEmojiClick}
                  disabled={false}
                />
              </div>
            )}

            <div className="flex items-center space-x-2 rounded border border-gray-200 p-1 dark:border-gray-700">
              {/* File Upload Component */}
              <FileUpload
                onFileUploaded={handleFileUploaded}
                onLocationShared={handleLocationShared}
                disabled={false}
              />
              
              {/* Emoji Picker */}
              <EmojiPickerComponent
                onEmojiClick={handleEmojiClick}
                disabled={false}
              />

              {/* Quick Reactions Toggle */}
              <button
                type="button"
                onClick={toggleQuickReactions}
                className="flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-skybrand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-skybrand-400 transition-colors duration-200"
                title={showQuickReactions ? "Ẩn emoji nhanh" : "Hiện emoji nhanh"}
              >
                <span className="text-sm">⚡</span>
              </button>
              
              {/* Text Input */}
              <input
                ref={inputRef}
                className="flex-1 bg-transparent px-2 py-1 outline-none placeholder:text-slate-400"
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleOnSubmit(); } }}
                placeholder='Nhập tin nhắn...'
                autoComplete='off'
                value={inputValue}
              />
              
              {/* Voice Recording Button */}
              <VoiceRecording
                onVoiceUploaded={handleFileUploaded}
                disabled={false}
              />
              
              <button
                className="rounded bg-skybrand-600 px-3 py-1 text-sm font-medium text-white hover:bg-skybrand-700"
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
