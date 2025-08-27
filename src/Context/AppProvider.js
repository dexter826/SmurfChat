import React, { useState, useEffect } from 'react';
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
        clearState,
        selectRoom,
        selectConversation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
