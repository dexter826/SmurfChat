import React, { useState, useEffect, useRef } from 'react';
import useFirestore from '../hooks/useFirestore';
import { AuthContext } from './AuthProvider';
import { useAlert } from './AlertProvider';
import { createOrUpdateConversation } from '../firebase/services';
import reminderService from '../components/Notifications/ReminderService';

export const AppContext = React.createContext();

export default function AppProvider({ children }) {
  const [isAddRoomVisible, setIsAddRoomVisible] = useState(false);
  const [isInviteMemberVisible, setIsInviteMemberVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [chatType, setChatType] = useState('room'); // 'room' or 'direct'
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isVoteModalVisible, setIsVoteModalVisible] = useState(false);
  const [isNewMessageVisible, setIsNewMessageVisible] = useState(false);
  const [isAddFriendVisible, setIsAddFriendVisible] = useState(false);
  const [isUserProfileVisible, setIsUserProfileVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isBlockedUsersVisible, setIsBlockedUsersVisible] = useState(false);

  const {
    user: { uid },
  } = React.useContext(AuthContext);
  
  const alertProvider = useAlert();

  // Set alert provider for reminder service
  React.useEffect(() => {
    reminderService.setAlertProvider(alertProvider);
  }, [alertProvider]);

  const roomsCondition = React.useMemo(() => {
    return {
      fieldName: 'members',
      operator: 'array-contains',
      compareValue: uid,
    };
  }, [uid]);

  const rooms = useFirestore('rooms', roomsCondition, 'lastMessageAt', 'desc');

  const selectedRoom = React.useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || {},
    [rooms, selectedRoomId]
  );

  const usersCondition = React.useMemo(() => {
    return {
      fieldName: 'uid',
      operator: 'in',
      compareValue: selectedRoom.members,
    };
  }, [selectedRoom.members]);

  const members = useFirestore('users', usersCondition);

  // Conversations for direct messaging
  const conversationsCondition = React.useMemo(() => {
    return {
      fieldName: 'participants',
      operator: 'array-contains',
      compareValue: uid,
    };
  }, [uid]);

  const conversations = useFirestore('conversations', conversationsCondition, 'lastMessageAt', 'desc');

  // Events for reminder system
  const eventsCondition = React.useMemo(() => ({
    fieldName: 'participants',
    operator: 'array-contains',
    compareValue: uid,
  }), [uid]);

  const userEvents = useFirestore('events', eventsCondition, 'eventDate', 'asc');

  // Update reminder service when events change
  useEffect(() => {
    if (userEvents.length > 0) {
      reminderService.updateReminders(userEvents);

      // Show daily agenda on first load
      const hasShownAgenda = sessionStorage.getItem('dailyAgendaShown');
      if (!hasShownAgenda) {
        setTimeout(() => {
          reminderService.showDailyAgenda(userEvents);
          sessionStorage.setItem('dailyAgendaShown', 'true');
        }, 2000);
      }
    }
  }, [userEvents]);

  // Keep reminder service per-chat mutes in sync for rooms
  useEffect(() => {
    const mutedRoomIds = rooms
      .filter(r => r.mutedBy && r.mutedBy[uid])
      .map(r => r.id);
    reminderService.setMutedChats(mutedRoomIds);
  }, [rooms, uid]);

  // Get all users for conversation lookup
  const allUsersCondition = React.useMemo(() => ({
    fieldName: 'uid',
    operator: '!=',
    compareValue: uid,
  }), [uid]);

  const allUsers = useFirestore('users', allUsersCondition);

  const selectedConversation = React.useMemo(() => {
    if (!selectedConversationId) return {};

    // Handle new conversation creation
    if (selectedConversationId.startsWith('new_')) {
      const otherUserId = selectedConversationId.replace('new_', '');
      const otherUser = allUsers.find(u => u.uid === otherUserId);

      // Create new conversation
      const newConversationId = [uid, otherUserId].sort().join('_');

      // Check if conversation already exists
      const existingConversation = conversations.find(conv =>
        conv.participants.includes(otherUserId) && conv.participants.includes(uid)
      );

      if (existingConversation) {
        setSelectedConversationId(existingConversation.id);
        return {
          ...existingConversation,
          otherUser
        };
      }

      // Create new conversation in Firestore
      try {
        createOrUpdateConversation({
          id: newConversationId,
          participants: [uid, otherUserId],
          createdAt: new Date(),
          lastMessage: '',
          lastMessageAt: null,
        });
      } catch (err) {
        console.error('Error creating conversation in AppProvider:', err);
        // Silent fail in AppProvider to prevent app crash
      }

      return {
        id: newConversationId,
        participants: [uid, otherUserId],
        otherUser,
        createdAt: new Date(),
        lastMessage: '',
        lastMessageAt: null,
      };
    }

    const conversation = conversations.find((conv) => conv.id === selectedConversationId) || {};
    if (conversation.participants) {
      const otherUserId = conversation.participants.find(participantId => participantId !== uid);
      const otherUser = allUsers.find(u => u.uid === otherUserId);
      return {
        ...conversation,
        otherUser
      };
    }
    return conversation;
  }, [conversations, selectedConversationId, uid, allUsers]);

  // =====================
  // Global notifications for new, unread messages
  // =====================
  const notifiedConversationsRef = useRef({});
  const notifiedRoomsRef = useRef({});
  const audioRef = useRef(null);
  const originalTitleRef = useRef(document.title);
  const titleIntervalRef = useRef(null);
  const [, setUnreadCount] = useState(0);
  const isInitialLoadRef = useRef(true); // Track if this is initial page load

  useEffect(() => {
    // Preload custom sound
    try {
      const a = new Audio('/sounds/incoming.mp3');
      a.preload = 'auto';
      audioRef.current = a;
    } catch { }

    // Store original title
    originalTitleRef.current = document.title;
    
    // Mark as not initial load after a short delay
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 2000); // Wait 2 seconds before enabling notifications
  }, []);

  const playNotificationSound = React.useCallback(async () => {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.currentTime = 0;
        await audio.play();
        return;
      } catch { }
    }
  }, []);

  const updateTabTitle = React.useCallback((count) => {
    if (count > 0) {
      document.title = `(${count}) ${originalTitleRef.current}`;
      
      // Start blinking effect
      if (!titleIntervalRef.current) {
        let isOriginal = true;
        titleIntervalRef.current = setInterval(() => {
          if (isOriginal) {
            document.title = `🔴 (${count}) ${originalTitleRef.current}`;
          } else {
            document.title = `(${count}) ${originalTitleRef.current}`;
          }
          isOriginal = !isOriginal;
        }, 1000);
      }
    } else {
      document.title = originalTitleRef.current;
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
      }
    }
  }, []);

  // Calculate total unread count
  useEffect(() => {
    // Skip during initial load to prevent showing notification badges on reload
    if (isInitialLoadRef.current) return;
    
    let totalUnread = 0;
    
    // Count unread conversations (excluding currently open conversation)
    conversations.forEach((conv) => {
      if (!conv) return;
      
      // Skip currently selected conversation
      if (chatType === 'direct' && selectedConversationId === conv.id) return;
      
      const lastAt = conv.lastMessageAt;
      const lastSeen = conv.lastSeen?.[uid];
      const lastAtDate = lastAt?.toDate ? lastAt.toDate() : (lastAt ? new Date(lastAt) : null);
      const lastSeenDate = lastSeen?.toDate ? lastSeen.toDate() : (lastSeen ? new Date(lastSeen) : null);
      const isUnread = !!(lastAtDate && (!lastSeenDate || lastAtDate > lastSeenDate));
      if (isUnread) totalUnread++;
    });
    
    // Count unread rooms (excluding currently open room)
    rooms.forEach((room) => {
      if (!room || room.deleted) return;
      
      // Skip currently selected room
      if (chatType === 'room' && selectedRoomId === room.id) return;
      
      const lastAt = room.lastMessageAt;
      const lastSeen = room.lastSeen?.[uid];
      const lastAtDate = lastAt?.toDate ? lastAt.toDate() : (lastAt ? new Date(lastAt) : null);
      const lastSeenDate = lastSeen?.toDate ? lastSeen.toDate() : (lastSeen ? new Date(lastSeen) : null);
      const isUnread = !!(lastAtDate && (!lastSeenDate || lastAtDate > lastSeenDate));
      if (isUnread) totalUnread++;
    });
    
    setUnreadCount(totalUnread);
    updateTabTitle(totalUnread);
  }, [conversations, rooms, uid, updateTabTitle, chatType, selectedConversationId, selectedRoomId]);

  // Clean up title interval on unmount
  useEffect(() => {
    return () => {
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
      }
      document.title = originalTitleRef.current;
    };
  }, []);

  // Reset tab title when user focuses back to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // When user comes back to tab, recalculate unread count to reset title appropriately
        setTimeout(() => {
          let totalUnread = 0;
          
          // Count unread conversations (excluding currently open conversation)
          conversations.forEach((conv) => {
            if (!conv) return;
            if (chatType === 'direct' && selectedConversationId === conv.id) return;
            
            const lastAt = conv.lastMessageAt;
            const lastSeen = conv.lastSeen?.[uid];
            const lastAtDate = lastAt?.toDate ? lastAt.toDate() : (lastAt ? new Date(lastAt) : null);
            const lastSeenDate = lastSeen?.toDate ? lastSeen.toDate() : (lastSeen ? new Date(lastSeen) : null);
            const isUnread = !!(lastAtDate && (!lastSeenDate || lastAtDate > lastSeenDate));
            if (isUnread) totalUnread++;
          });
          
          // Count unread rooms (excluding currently open room)
          rooms.forEach((room) => {
            if (!room || room.deleted) return;
            if (chatType === 'room' && selectedRoomId === room.id) return;
            
            const lastAt = room.lastMessageAt;
            const lastSeen = room.lastSeen?.[uid];
            const lastAtDate = lastAt?.toDate ? lastAt.toDate() : (lastAt ? new Date(lastAt) : null);
            const lastSeenDate = lastSeen?.toDate ? lastSeen.toDate() : (lastSeen ? new Date(lastSeen) : null);
            const isUnread = !!(lastAtDate && (!lastSeenDate || lastAtDate > lastSeenDate));
            if (isUnread) totalUnread++;
          });
          
          setUnreadCount(totalUnread);
          updateTabTitle(totalUnread);
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [conversations, rooms, uid, updateTabTitle, chatType, selectedConversationId, selectedRoomId]);

  // Notify for direct messages (any conversation, not only selected)
  useEffect(() => {
    if (!Array.isArray(conversations) || isInitialLoadRef.current) return; // Skip notifications during initial load
    
    conversations.forEach((conv) => {
      if (!conv) return;
      const lastAt = conv.lastMessageAt;
      const updatedBy = conv.updatedBy;
      const lastSeen = conv.lastSeen?.[uid];
      const lastAtDate = lastAt?.toDate ? lastAt.toDate() : (lastAt ? new Date(lastAt) : null);
      const lastSeenDate = lastSeen?.toDate ? lastSeen.toDate() : (lastSeen ? new Date(lastSeen) : null);

      // Only notify if:
      // 1. There's a valid lastAtDate
      // 2. Message is from someone else (not current user)
      // 3. Message is newer than what we've already notified for
      // 4. Message is unread (lastAt > lastSeen)
      // 5. Chat is not muted
      // 6. We haven't already notified for this exact timestamp
      const isFromOther = updatedBy && updatedBy !== uid;
      const isUnread = !!(lastAtDate && (!lastSeenDate || lastAtDate > lastSeenDate));
      const isMuted = !!(conv.mutedBy && conv.mutedBy[uid]);
      const hasNotifiedForThisMessage = notifiedConversationsRef.current[conv.id] && 
        lastAtDate && notifiedConversationsRef.current[conv.id].getTime() === lastAtDate.getTime();
      
      const shouldNotify = lastAtDate && isFromOther && isUnread && !isMuted && !hasNotifiedForThisMessage &&
        (!notifiedConversationsRef.current[conv.id] || lastAtDate > notifiedConversationsRef.current[conv.id]) &&
        // Don't notify if user is currently viewing this conversation
        (chatType !== 'direct' || selectedConversationId !== conv.id);
      
      if (shouldNotify) {
        notifiedConversationsRef.current[conv.id] = lastAtDate;
        playNotificationSound();
      }
    });
  }, [conversations, uid, playNotificationSound, chatType, selectedConversationId]);

  // Optional: Notify for rooms as well using lastMessageAt/lastSeen
  useEffect(() => {
    if (!Array.isArray(rooms) || isInitialLoadRef.current) return; // Skip notifications during initial load
    
    rooms.forEach((room) => {
      if (!room || room.deleted) return;
      const lastAt = room.lastMessageAt;
      const updatedBy = room.updatedBy;
      const lastSeen = room.lastSeen?.[uid];
      const lastAtDate = lastAt?.toDate ? lastAt.toDate() : (lastAt ? new Date(lastAt) : null);
      const lastSeenDate = lastSeen?.toDate ? lastSeen.toDate() : (lastSeen ? new Date(lastSeen) : null);

      // Same improved logic for rooms
      const isFromOther = updatedBy && updatedBy !== uid;
      const isUnread = !!(lastAtDate && (!lastSeenDate || lastAtDate > lastSeenDate));
      const isMuted = !!(room.mutedBy && room.mutedBy[uid]);
      const hasNotifiedForThisMessage = notifiedRoomsRef.current[room.id] && 
        lastAtDate && notifiedRoomsRef.current[room.id].getTime() === lastAtDate.getTime();
      
      const shouldNotify = lastAtDate && isFromOther && isUnread && !isMuted && !hasNotifiedForThisMessage &&
        (!notifiedRoomsRef.current[room.id] || lastAtDate > notifiedRoomsRef.current[room.id]) &&
        // Don't notify if user is currently viewing this room
        (chatType !== 'room' || selectedRoomId !== room.id);
      
      if (shouldNotify) {
        notifiedRoomsRef.current[room.id] = lastAtDate;
        playNotificationSound();
      }
    });
  }, [rooms, uid, playNotificationSound, chatType, selectedRoomId]);

  const clearState = () => {
    setSelectedRoomId('');
    setSelectedConversationId('');
    setIsAddRoomVisible(false);
    setIsInviteMemberVisible(false);
    setIsUserProfileVisible(false);
    setSelectedUser(null);
    setChatType('room');
  };

  // Helper functions to properly switch between chat types
  const selectRoom = (roomId) => {
    setSelectedConversationId(''); // Clear conversation selection
    setSelectedRoomId(roomId);
    setChatType('room');
  };

  const selectConversation = (conversationId) => {
    setSelectedRoomId(''); // Clear room selection
    setSelectedConversationId(conversationId);
    setChatType('direct');
  };

  return (
    <AppContext.Provider
      value={{
        rooms,
        members,
        selectedRoom,
        isAddRoomVisible,
        setIsAddRoomVisible,
        selectedRoomId,
        setSelectedRoomId,
        isInviteMemberVisible,
        setIsInviteMemberVisible,
        conversations,
        selectedConversation,
        selectedConversationId,
        setSelectedConversationId,
        chatType,
        setChatType,
        isCalendarVisible,
        setIsCalendarVisible,
        isVoteModalVisible,
        setIsVoteModalVisible,
        isNewMessageVisible,
        setIsNewMessageVisible,
        isAddFriendVisible,
        setIsAddFriendVisible,
        isUserProfileVisible,
        setIsUserProfileVisible,
        selectedUser,
        setSelectedUser,
        isBlockedUsersVisible,
        setIsBlockedUsersVisible,
        userEvents,
        allUsers,
        clearState,
        selectRoom,
        selectConversation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
