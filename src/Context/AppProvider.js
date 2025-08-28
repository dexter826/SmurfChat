import React, { useState, useEffect, useRef } from 'react';
import useFirestore from '../hooks/useFirestore';
import { AuthContext } from './AuthProvider';
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

  const {
    user: { uid },
  } = React.useContext(AuthContext);

  const roomsCondition = React.useMemo(() => {
    return {
      fieldName: 'members',
      operator: 'array-contains',
      compareValue: uid,
    };
  }, [uid]);

  const allRooms = useFirestore('rooms', roomsCondition);

  // Filter out dissolved rooms
  const rooms = React.useMemo(() => {
    return allRooms.filter(room => !room.dissolved);
  }, [allRooms]);

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

  const conversations = useFirestore('conversations', conversationsCondition);

  // Events for reminder system
  const eventsCondition = React.useMemo(() => ({
    fieldName: 'participants',
    operator: 'array-contains',
    compareValue: uid,
  }), [uid]);

  const userEvents = useFirestore('events', eventsCondition);

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
      createOrUpdateConversation({
        id: newConversationId,
        participants: [uid, otherUserId],
        createdAt: new Date(),
        lastMessage: '',
        lastMessageAt: null,
      });

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

  useEffect(() => {
    // Preload custom sound
    try {
      const a = new Audio('/sounds/incoming.mp3');
      a.preload = 'auto';
      audioRef.current = a;
    } catch { }

    // Request Notification permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => { });
      }
    }
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

  const showBrowserNotification = React.useCallback((title, body, icon) => {
    if (!('Notification' in window)) return;
    const notify = () => {
      try {
        const n = new Notification(title, { body, icon });
        setTimeout(() => n.close(), 4000);
      } catch { }
    };
    if (Notification.permission === 'granted') notify();
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') notify();
      });
    }
  }, []);

  // Notify for direct messages (any conversation, not only selected)
  useEffect(() => {
    if (!Array.isArray(conversations)) return;
    conversations.forEach((conv) => {
      if (!conv || conv.deleted) return;
      const lastAt = conv.lastMessageAt;
      const updatedBy = conv.updatedBy;
      const lastSeen = conv.lastSeen?.[uid];
      const lastAtDate = lastAt?.toDate ? lastAt.toDate() : (lastAt ? new Date(lastAt) : null);
      const lastSeenDate = lastSeen?.toDate ? lastSeen.toDate() : (lastSeen ? new Date(lastSeen) : null);

      // Must be a newer message, sent by someone else, and unread
      const isNew = !!lastAtDate && (!notifiedConversationsRef.current[conv.id] || lastAtDate > notifiedConversationsRef.current[conv.id]);
      const isFromOther = updatedBy && updatedBy !== uid;
      const isUnread = !!(lastAtDate && (!lastSeenDate || lastAtDate > lastSeenDate));
      if (isNew && isFromOther && isUnread) {
        notifiedConversationsRef.current[conv.id] = lastAtDate;
        const otherUserId = conv.participants?.find((p) => p !== uid);
        const otherUser = allUsers.find((u) => u.uid === otherUserId);
        const title = otherUser?.displayName || 'Tin nhắn mới';
        const body = conv.lastMessage || 'Bạn có tin nhắn mới';
        const icon = otherUser?.photoURL || '/favicon.ico';
        playNotificationSound();
        showBrowserNotification(title, body, icon);
      }
    });
  }, [conversations, uid, allUsers, playNotificationSound, showBrowserNotification]);

  // Optional: Notify for rooms as well using lastMessageAt/lastSeen
  useEffect(() => {
    if (!Array.isArray(rooms)) return;
    rooms.forEach((room) => {
      if (!room || room.deleted) return;
      const lastAt = room.lastMessageAt;
      const updatedBy = room.updatedBy;
      const lastSeen = room.lastSeen?.[uid];
      const lastAtDate = lastAt?.toDate ? lastAt.toDate() : (lastAt ? new Date(lastAt) : null);
      const lastSeenDate = lastSeen?.toDate ? lastSeen.toDate() : (lastSeen ? new Date(lastSeen) : null);

      const isNew = !!lastAtDate && (!notifiedRoomsRef.current[room.id] || lastAtDate > notifiedRoomsRef.current[room.id]);
      const isFromOther = updatedBy && updatedBy !== uid;
      const isUnread = !!(lastAtDate && (!lastSeenDate || lastAtDate > lastSeenDate));
      if (isNew && isFromOther && isUnread) {
        notifiedRoomsRef.current[room.id] = lastAtDate;
        const title = room.name || 'Tin nhắn mới';
        const body = room.lastMessage || 'Bạn có tin nhắn mới';
        const icon = room.avatar || '/favicon.ico';
        playNotificationSound();
        showBrowserNotification(title, body, icon);
      }
    });
  }, [rooms, uid, playNotificationSound, showBrowserNotification]);

  const clearState = () => {
    setSelectedRoomId('');
    setSelectedConversationId('');
    setIsAddRoomVisible(false);
    setIsInviteMemberVisible(false);
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
