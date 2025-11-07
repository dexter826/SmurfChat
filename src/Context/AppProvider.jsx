import React, { useState, useEffect, useRef } from "react";
import useOptimizedFirestore from "../hooks/useOptimizedFirestore";
import { AuthContext } from "./AuthProvider";
import { createOrUpdateConversation } from "../firebase/services";
import { UserProvider, useUsers } from "./UserContext";
import listenerManager from "../firebase/utils/listener.manager";
import queryBuilder from "../firebase/utils/query.builder";

export const AppContext = React.createContext();

function AppProviderInner({ children }) {
  const { getUserById, getOtherParticipant } = useUsers();
  const [isAddRoomVisible, setIsAddRoomVisible] = useState(false);
  const [isInviteMemberVisible, setIsInviteMemberVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [chatType, setChatType] = useState("room");
  const [isVoteModalVisible, setIsVoteModalVisible] = useState(false);
  const [isNewMessageVisible, setIsNewMessageVisible] = useState(false);
  const [isAddFriendVisible, setIsAddFriendVisible] = useState(false);
  const [isUserProfileVisible, setIsUserProfileVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isBlockedUsersVisible, setIsBlockedUsersVisible] = useState(false);
  const [isArchivedChatsVisible, setIsArchivedChatsVisible] = useState(false);
  const [archivedChatsRefreshTrigger, setArchivedChatsRefreshTrigger] =
    useState(0);
  const [preSelectedMembers, setPreSelectedMembers] = useState([]);

  const {
    user: { uid },
  } = React.useContext(AuthContext);

  const roomsCondition = React.useMemo(() => {
    return {
      fieldName: "members",
      operator: "array-contains",
      compareValue: uid,
    };
  }, [uid]);

  const { documents: rooms } = useOptimizedFirestore(
    "rooms",
    roomsCondition,
    "lastMessageAt",
    "desc"
  );

  const selectedRoom = React.useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || {},
    [rooms, selectedRoomId]
  );

  const usersCondition = React.useMemo(() => {
    return {
      fieldName: "uid",
      operator: "in",
      compareValue: selectedRoom.members,
    };
  }, [selectedRoom.members]);

  const { documents: members } = useOptimizedFirestore("users", usersCondition);

  const conversationsCondition = React.useMemo(() => {
    return {
      fieldName: "participants",
      operator: "array-contains",
      compareValue: uid,
    };
  }, [uid]);

  const { documents: conversations } = useOptimizedFirestore(
    "conversations",
    conversationsCondition,
    "lastMessageAt",
    "desc"
  );

  const selectedConversation = React.useMemo(() => {
    if (!selectedConversationId) return {};

    if (selectedConversationId.startsWith("new_")) {
      const otherUserId = selectedConversationId.replace("new_", "");
      const otherUser = getUserById(otherUserId);
      const newConversationId = [uid, otherUserId].sort().join("_");
      const existingConversation = conversations.find(
        (conv) =>
          conv.participants.includes(otherUserId) &&
          conv.participants.includes(uid)
      );

      if (existingConversation) {
        setSelectedConversationId(existingConversation.id);
        return {
          ...existingConversation,
          otherUser,
        };
      }

      try {
        createOrUpdateConversation({
          id: newConversationId,
          participants: [uid, otherUserId],
          createdAt: new Date(),
          lastMessage: "",
          lastMessageAt: null,
        });
      } catch (err) {
        console.error("Error creating conversation in AppProvider:", err);
      }

      return {
        id: newConversationId,
        participants: [uid, otherUserId],
        otherUser,
        createdAt: new Date(),
        lastMessage: "",
        lastMessageAt: null,
      };
    }

    const conversation =
      conversations.find((conv) => conv.id === selectedConversationId) || {};
    if (conversation.participants) {
      const otherUser = getOtherParticipant(conversation);
      return {
        ...conversation,
        otherUser,
      };
    }
    return conversation;
  }, [
    conversations,
    selectedConversationId,
    uid,
    getUserById,
    getOtherParticipant,
  ]);

  const notifiedConversationsRef = useRef({});
  const notifiedRoomsRef = useRef({});
  const notifiedMessageIdsRef = useRef(new Set());
  const audioRef = useRef(null);
  const originalTitleRef = useRef(document.title);
  const titleIntervalRef = useRef(null);
  const [, setUnreadCount] = useState(0);
  const isInitialLoadRef = useRef(true);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    try {
      const a = new Audio("/sounds/incoming.mp3");
      a.preload = "auto";
      audioRef.current = a;
    } catch {}

    originalTitleRef.current = document.title;

    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 2000);
  }, []);

  const playNotificationSound = React.useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.currentTime = 0;
          await audio.play();
        } catch (error) {
          console.warn("Audio play blocked:", error);
        }
      }
    }, 300);
  }, []);

  const updateTabTitle = React.useCallback((count) => {
    if (count > 0) {
      document.title = `(${count}) ${originalTitleRef.current}`;
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

  useEffect(() => {
    if (isInitialLoadRef.current) return;

    let totalUnread = 0;

    conversations.forEach((conv) => {
      if (!conv) return;
      if (chatType === "direct" && selectedConversationId === conv.id) return;

      const lastAt = conv.lastMessageAt;
      const lastSeen = conv.lastSeen?.[uid];
      const lastAtDate = lastAt?.toDate
        ? lastAt.toDate()
        : lastAt
        ? new Date(lastAt)
        : null;
      const lastSeenDate = lastSeen?.toDate
        ? lastSeen.toDate()
        : lastSeen
        ? new Date(lastSeen)
        : null;
      const isUnread = !!(
        lastAtDate &&
        (!lastSeenDate || lastAtDate > lastSeenDate)
      );
      if (isUnread) totalUnread++;
    });

    rooms.forEach((room) => {
      if (!room || room.deleted) return;
      if (chatType === "room" && selectedRoomId === room.id) return;

      const lastAt = room.lastMessageAt;
      const lastSeen = room.lastSeen?.[uid];
      const lastAtDate = lastAt?.toDate
        ? lastAt.toDate()
        : lastAt
        ? new Date(lastAt)
        : null;
      const lastSeenDate = lastSeen?.toDate
        ? lastSeen.toDate()
        : lastSeen
        ? new Date(lastSeen)
        : null;
      const isUnread = !!(
        lastAtDate &&
        (!lastSeenDate || lastAtDate > lastSeenDate)
      );
      if (isUnread) totalUnread++;
    });

    setUnreadCount(totalUnread);
    updateTabTitle(totalUnread);
  }, [
    conversations,
    rooms,
    uid,
    updateTabTitle,
    chatType,
    selectedConversationId,
    selectedRoomId,
  ]);

  useEffect(() => {
    return () => {
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
      }
      document.title = originalTitleRef.current;
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          let totalUnread = 0;

          conversations.forEach((conv) => {
            if (!conv) return;
            if (chatType === "direct" && selectedConversationId === conv.id)
              return;

            const lastAt = conv.lastMessageAt;
            const lastSeen = conv.lastSeen?.[uid];
            const lastAtDate = lastAt?.toDate
              ? lastAt.toDate()
              : lastAt
              ? new Date(lastAt)
              : null;
            const lastSeenDate = lastSeen?.toDate
              ? lastSeen.toDate()
              : lastSeen
              ? new Date(lastSeen)
              : null;
            const isUnread = !!(
              lastAtDate &&
              (!lastSeenDate || lastAtDate > lastSeenDate)
            );
            if (isUnread) totalUnread++;
          });

          rooms.forEach((room) => {
            if (!room || room.deleted) return;
            if (chatType === "room" && selectedRoomId === room.id) return;

            const lastAt = room.lastMessageAt;
            const lastSeen = room.lastSeen?.[uid];
            const lastAtDate = lastAt?.toDate
              ? lastAt.toDate()
              : lastAt
              ? new Date(lastAt)
              : null;
            const lastSeenDate = lastSeen?.toDate
              ? lastSeen.toDate()
              : lastSeen
              ? new Date(lastSeen)
              : null;
            const isUnread = !!(
              lastAtDate &&
              (!lastSeenDate || lastAtDate > lastSeenDate)
            );
            if (isUnread) totalUnread++;
          });

          setUnreadCount(totalUnread);
          updateTabTitle(totalUnread);
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    conversations,
    rooms,
    uid,
    updateTabTitle,
    chatType,
    selectedConversationId,
    selectedRoomId,
  ]);

  useEffect(() => {
    if (isInitialLoadRef.current || !uid) return;

    const setupChangeListeners = async () => {
      const conversationsKey = queryBuilder.generateKey(
        "conversations",
        conversationsCondition,
        "lastMessageAt",
        "desc"
      );

      const conversationsQuery = await queryBuilder.buildQuery(
        "conversations",
        conversationsCondition,
        "lastMessageAt",
        "desc"
      );

      const unsubConversations = await listenerManager.subscribe(
        conversationsKey,
        conversationsQuery,
        (changes) => {
          changes.forEach((change) => {
            if (change.type === "modified") {
              const conv = change.doc;
              const lastAt = conv.lastMessageAt;
              const updatedBy = conv.updatedBy;
              const lastSeen = conv.lastSeen?.[uid];

              const lastAtDate = lastAt?.toDate
                ? lastAt.toDate()
                : lastAt
                ? new Date(lastAt)
                : null;
              const lastSeenDate = lastSeen?.toDate
                ? lastSeen.toDate()
                : lastSeen
                ? new Date(lastSeen)
                : null;

              const isUnread = !!(
                lastAtDate &&
                (!lastSeenDate || lastAtDate > lastSeenDate)
              );
              const isMuted = !!(conv.mutedBy && conv.mutedBy[uid]);
              const isFromOther = updatedBy && updatedBy !== uid;
              const isCurrentChat =
                chatType === "direct" && selectedConversationId === conv.id;

              const messageKey = `${conv.id}_${lastAtDate?.getTime()}`;
              const hasNotified = notifiedMessageIdsRef.current.has(messageKey);

              const shouldNotify =
                lastAtDate &&
                isFromOther &&
                isUnread &&
                !isMuted &&
                !hasNotified &&
                !isCurrentChat;

              if (shouldNotify) {
                if (process.env.NODE_ENV === "development") {
                  console.log("🔔 Notification (conversation):", {
                    conversationId: conv.id,
                    messageKey,
                    updatedBy,
                  });
                }

                notifiedMessageIdsRef.current.add(messageKey);
                notifiedConversationsRef.current[conv.id] = lastAtDate;
                playNotificationSound();

                if (notifiedMessageIdsRef.current.size > 100) {
                  const arr = Array.from(notifiedMessageIdsRef.current);
                  notifiedMessageIdsRef.current = new Set(arr.slice(-100));
                }
              }
            }
          });
        },
        { onChanges: true }
      );

      const roomsKey = queryBuilder.generateKey(
        "rooms",
        roomsCondition,
        "lastMessageAt",
        "desc"
      );

      const roomsQuery = await queryBuilder.buildQuery(
        "rooms",
        roomsCondition,
        "lastMessageAt",
        "desc"
      );

      const unsubRooms = await listenerManager.subscribe(
        roomsKey,
        roomsQuery,
        (changes) => {
          changes.forEach((change) => {
            if (change.type === "modified") {
              const room = change.doc;
              if (room.deleted) return;

              const lastAt = room.lastMessageAt;
              const updatedBy = room.updatedBy;
              const lastSeen = room.lastSeen?.[uid];

              const lastAtDate = lastAt?.toDate
                ? lastAt.toDate()
                : lastAt
                ? new Date(lastAt)
                : null;
              const lastSeenDate = lastSeen?.toDate
                ? lastSeen.toDate()
                : lastSeen
                ? new Date(lastSeen)
                : null;

              const isUnread = !!(
                lastAtDate &&
                (!lastSeenDate || lastAtDate > lastSeenDate)
              );
              const isMuted = !!(room.mutedBy && room.mutedBy[uid]);
              const isFromOther = updatedBy && updatedBy !== uid;
              const isCurrentChat =
                chatType === "room" && selectedRoomId === room.id;

              const messageKey = `${room.id}_${lastAtDate?.getTime()}`;
              const hasNotified = notifiedMessageIdsRef.current.has(messageKey);

              const shouldNotify =
                lastAtDate &&
                isFromOther &&
                isUnread &&
                !isMuted &&
                !hasNotified &&
                !isCurrentChat;

              if (shouldNotify) {
                if (process.env.NODE_ENV === "development") {
                  console.log("🔔 Notification (room):", {
                    roomId: room.id,
                    messageKey,
                    updatedBy,
                  });
                }

                notifiedMessageIdsRef.current.add(messageKey);
                notifiedRoomsRef.current[room.id] = lastAtDate;
                playNotificationSound();

                if (room.lastMessage && room.lastMessage.includes("@")) {
                  const senderName = room.updatedBy || "Someone";
                  const mentionTitle = `👤 ${senderName} đã mention bạn`;
                  document.title = mentionTitle;
                  setTimeout(() => {
                    document.title = originalTitleRef.current;
                  }, 5000);
                }

                if (notifiedMessageIdsRef.current.size > 100) {
                  const arr = Array.from(notifiedMessageIdsRef.current);
                  notifiedMessageIdsRef.current = new Set(arr.slice(-100));
                }
              }
            }
          });
        },
        { onChanges: true }
      );

      return () => {
        unsubConversations();
        unsubRooms();
      };
    };

    const cleanup = setupChangeListeners();

    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [
    uid,
    roomsCondition,
    conversationsCondition,
    chatType,
    selectedRoomId,
    selectedConversationId,
    playNotificationSound,
  ]);

  const clearState = () => {
    setSelectedRoomId("");
    setSelectedConversationId("");
    setIsAddRoomVisible(false);
    setIsInviteMemberVisible(false);
    setIsUserProfileVisible(false);
    setSelectedUser(null);
    setPreSelectedMembers([]);
    setChatType("room");
  };

  const selectRoom = (roomId) => {
    setSelectedConversationId("");
    setSelectedRoomId(roomId);
    setChatType("room");
  };

  const selectConversation = (conversationId) => {
    setSelectedRoomId("");
    setSelectedConversationId(conversationId);
    setChatType("direct");
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
        isArchivedChatsVisible,
        setIsArchivedChatsVisible,
        archivedChatsRefreshTrigger,
        setArchivedChatsRefreshTrigger,
        preSelectedMembers,
        setPreSelectedMembers,
        clearState,
        selectRoom,
        selectConversation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export default function AppProvider({ children }) {
  return (
    <UserProvider>
      <AppProviderInner>{children}</AppProviderInner>
    </UserProvider>
  );
}
