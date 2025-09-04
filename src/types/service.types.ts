/**
 * Service Function Type Definitions
 * 
 * TypeScript definitions for service layer functions
 * Provides type safety for Firebase service operations
 * 
 * Created: September 4, 2025
 * Task: 4.2 - Add Proper TypeScript Definitions
 */

import { 
  User, 
  Room, 
  Message, 
  Conversation, 
  Event, 
  Block, 
  Friend,
  UserId,
  RoomId,
  ConversationId,
  MessageId,
  EventId,
  ApiResponse,
  PaginatedResult,
  CreateUserData,
  CreateRoomData,
  CreateMessageData,
  CreateEventData,
  ChatType,
  MessageType,
  FriendStatus
} from './database.types';

// ================================
// AUTH SERVICE TYPES
// ================================

export interface AuthService {
  signUp(email: string, password: string, userData: CreateUserData): Promise<ApiResponse<User>>;
  signIn(email: string, password: string): Promise<ApiResponse<User>>;
  signOut(): Promise<ApiResponse<void>>;
  resetPassword(email: string): Promise<ApiResponse<void>>;
  updateProfile(userId: UserId, updates: Partial<User>): Promise<ApiResponse<User>>;
  deleteAccount(userId: UserId): Promise<ApiResponse<void>>;
}

// ================================
// USER SERVICE TYPES
// ================================

export interface UserService {
  createUser(userData: CreateUserData): Promise<ApiResponse<User>>;
  getUserById(userId: UserId): Promise<ApiResponse<User>>;
  updateUser(userId: UserId, updates: Partial<User>): Promise<ApiResponse<User>>;
  deleteUser(userId: UserId): Promise<ApiResponse<void>>;
  searchUsers(query: string, limit?: number): Promise<ApiResponse<User[]>>;
  updateOnlineStatus(userId: UserId, isOnline: boolean): Promise<ApiResponse<void>>;
  getUsersByIds(userIds: UserId[]): Promise<ApiResponse<User[]>>;
}

// ================================
// MESSAGE SERVICE TYPES
// ================================

export interface MessageService {
  sendMessage(messageData: CreateMessageData): Promise<ApiResponse<Message>>;
  getMessage(messageId: MessageId): Promise<ApiResponse<Message>>;
  updateMessage(messageId: MessageId, updates: Partial<Message>): Promise<ApiResponse<Message>>;
  deleteMessage(messageId: MessageId, userId: UserId): Promise<ApiResponse<void>>;
  markMessageAsRead(messageId: MessageId, userId: UserId): Promise<ApiResponse<void>>;
  getMessages(params: {
    chatType: ChatType;
    roomId?: RoomId;
    conversationId?: ConversationId;
    limit?: number;
    startAfter?: any;
  }): Promise<ApiResponse<PaginatedResult<Message>>>;
  getUnreadCount(userId: UserId, targetId: RoomId | ConversationId, chatType: ChatType): Promise<ApiResponse<number>>;
  reactToMessage(messageId: MessageId, userId: UserId, emoji: string): Promise<ApiResponse<void>>;
  removeReaction(messageId: MessageId, userId: UserId, emoji: string): Promise<ApiResponse<void>>;
}

// ================================
// ROOM SERVICE TYPES
// ================================

export interface RoomService {
  createRoom(roomData: CreateRoomData, creatorId: UserId): Promise<ApiResponse<Room>>;
  getRoom(roomId: RoomId): Promise<ApiResponse<Room>>;
  updateRoom(roomId: RoomId, updates: Partial<Room>, userId: UserId): Promise<ApiResponse<Room>>;
  deleteRoom(roomId: RoomId, userId: UserId): Promise<ApiResponse<void>>;
  joinRoom(roomId: RoomId, userId: UserId): Promise<ApiResponse<void>>;
  leaveRoom(roomId: RoomId, userId: UserId): Promise<ApiResponse<void>>;
  addMember(roomId: RoomId, memberId: UserId, addedBy: UserId): Promise<ApiResponse<void>>;
  removeMember(roomId: RoomId, memberId: UserId, removedBy: UserId): Promise<ApiResponse<void>>;
  addAdmin(roomId: RoomId, memberId: UserId, addedBy: UserId): Promise<ApiResponse<void>>;
  removeAdmin(roomId: RoomId, memberId: UserId, removedBy: UserId): Promise<ApiResponse<void>>;
  getUserRooms(userId: UserId): Promise<ApiResponse<Room[]>>;
  searchRooms(query: string, limit?: number): Promise<ApiResponse<Room[]>>;
}

// ================================
// CONVERSATION SERVICE TYPES
// ================================

export interface ConversationService {
  getOrCreateConversation(participant1: UserId, participant2: UserId): Promise<ApiResponse<Conversation>>;
  getConversation(conversationId: ConversationId): Promise<ApiResponse<Conversation>>;
  getUserConversations(userId: UserId): Promise<ApiResponse<Conversation[]>>;
  updateConversationReadStatus(conversationId: ConversationId, userId: UserId): Promise<ApiResponse<void>>;
  archiveConversation(conversationId: ConversationId, userId: UserId): Promise<ApiResponse<void>>;
  deleteConversation(conversationId: ConversationId, userId: UserId): Promise<ApiResponse<void>>;
  getOtherParticipant(conversation: Conversation, currentUserId: UserId): UserId;
}

// ================================
// EVENT SERVICE TYPES
// ================================

export interface EventService {
  createEvent(eventData: CreateEventData, creatorId: UserId): Promise<ApiResponse<Event>>;
  getEvent(eventId: EventId): Promise<ApiResponse<Event>>;
  updateEvent(eventId: EventId, updates: Partial<Event>, userId: UserId): Promise<ApiResponse<Event>>;
  deleteEvent(eventId: EventId, userId: UserId): Promise<ApiResponse<void>>;
  respondToEvent(eventId: EventId, userId: UserId, response: 'going' | 'maybe' | 'not_going'): Promise<ApiResponse<void>>;
  getUserEvents(userId: UserId, startDate?: Date, endDate?: Date): Promise<ApiResponse<Event[]>>;
  getUpcomingEvents(userId: UserId, limit?: number): Promise<ApiResponse<Event[]>>;
  inviteToEvent(eventId: EventId, inviteeId: UserId, invitedBy: UserId): Promise<ApiResponse<void>>;
  removeFromEvent(eventId: EventId, participantId: UserId, removedBy: UserId): Promise<ApiResponse<void>>;
}

// ================================
// FRIEND SERVICE TYPES
// ================================

export interface FriendService {
  sendFriendRequest(requesterId: UserId, addresseeId: UserId, message?: string): Promise<ApiResponse<Friend>>;
  respondToFriendRequest(friendId: string, response: 'accepted' | 'rejected'): Promise<ApiResponse<Friend>>;
  getFriend(friendId: string): Promise<ApiResponse<Friend>>;
  getUserFriends(userId: UserId): Promise<ApiResponse<User[]>>;
  getPendingFriendRequests(userId: UserId): Promise<ApiResponse<Friend[]>>;
  getSentFriendRequests(userId: UserId): Promise<ApiResponse<Friend[]>>;
  removeFriend(friendId: string, userId: UserId): Promise<ApiResponse<void>>;
  blockUser(blockerId: UserId, blockedId: UserId, reason?: string): Promise<ApiResponse<void>>;
  unblockUser(blockerId: UserId, blockedId: UserId): Promise<ApiResponse<void>>;
  areFriends(userId1: UserId, userId2: UserId): Promise<ApiResponse<boolean>>;
  getFriendStatus(userId1: UserId, userId2: UserId): Promise<ApiResponse<FriendStatus | null>>;
}

// ================================
// BLOCK SERVICE TYPES
// ================================

export interface BlockService {
  blockUser(blockerId: UserId, blockedId: UserId, reason?: string): Promise<ApiResponse<Block>>;
  unblockUser(blockerId: UserId, blockedId: UserId): Promise<ApiResponse<void>>;
  getBlock(blockerId: UserId, blockedId: UserId): Promise<ApiResponse<Block | null>>;
  getUserBlocks(userId: UserId): Promise<ApiResponse<Block[]>>;
  getBlockedUsers(userId: UserId): Promise<ApiResponse<User[]>>;
  isUserBlocked(checkerId: UserId, targetId: UserId): Promise<ApiResponse<boolean>>;
  areMutuallyBlocked(userId1: UserId, userId2: UserId): Promise<ApiResponse<boolean>>;
}

// ================================
// FILE UPLOAD SERVICE TYPES
// ================================

export interface FileUploadService {
  uploadImage(file: File, path: string): Promise<ApiResponse<{
    url: string;
    thumbnailUrl?: string;
    metadata: {
      size: number;
      type: string;
      width?: number;
      height?: number;
    };
  }>>;
  
  uploadFile(file: File, path: string): Promise<ApiResponse<{
    url: string;
    metadata: {
      size: number;
      type: string;
      name: string;
    };
  }>>;
  
  uploadVoice(blob: Blob, path: string): Promise<ApiResponse<{
    url: string;
    metadata: {
      size: number;
      duration: number;
    };
  }>>;
  
  deleteFile(url: string): Promise<ApiResponse<void>>;
}

// ================================
// NOTIFICATION SERVICE TYPES
// ================================

export interface NotificationService {
  sendNotification(params: {
    userId: UserId;
    title: string;
    body: string;
    data?: Record<string, any>;
    type: 'message' | 'friend_request' | 'event' | 'mention';
  }): Promise<ApiResponse<void>>;
  
  updateNotificationToken(userId: UserId, token: string): Promise<ApiResponse<void>>;
  
  getNotificationSettings(userId: UserId): Promise<ApiResponse<{
    messages: boolean;
    friendRequests: boolean;
    events: boolean;
    mentions: boolean;
  }>>;
  
  updateNotificationSettings(userId: UserId, settings: {
    messages?: boolean;
    friendRequests?: boolean;
    events?: boolean;
    mentions?: boolean;
  }): Promise<ApiResponse<void>>;
}

// ================================
// UTILITY SERVICE TYPES
// ================================

export interface UtilityService {
  generateKeywords(text: string): string[];
  validateEmail(email: string): boolean;
  validatePhone(phone: string): boolean;
  sanitizeInput(input: string): string;
  formatDate(date: Date): string;
  formatTime(date: Date): string;
  calculateAge(birthDate: Date): number;
  generateId(): string;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
}

// ================================
// COMPOSITE SERVICE INTERFACES
// ================================

export interface DatabaseServices {
  auth: AuthService;
  user: UserService;
  message: MessageService;
  room: RoomService;
  conversation: ConversationService;
  event: EventService;
  friend: FriendService;
  block: BlockService;
  fileUpload: FileUploadService;
  notification: NotificationService;
  utility: UtilityService;
}

// ================================
// HOOKS TYPES
// ================================

export interface UseFirestoreResult<T> {
  data: T[];
  documents: T[]; // Backward compatibility
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export interface UsePaginatedFirestoreResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseUserSearchResult {
  users: User[];
  loading: boolean;
  error: Error | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export interface UseBlockStatusResult {
  isBlocked: boolean;
  isMutuallyBlocked: boolean;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export interface UseOnlineStatusResult {
  isOnline: boolean;
  lastSeen: Date | null;
  loading: boolean;
  error: Error | null;
}

// ================================
// CONTEXT TYPES
// ================================

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: CreateUserData) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export interface UserContextType {
  users: Map<UserId, User>;
  loading: boolean;
  error: Error | null;
  getUserById: (userId: UserId) => User | null;
  getOtherParticipant: (conversation: Conversation, currentUserId: UserId) => User | null;
  refresh: () => Promise<void>;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
}

// ================================
// COMPONENT PROPS TYPES
// ================================

export interface MessageProps {
  message: Message;
  currentUser: User;
  showSender?: boolean;
  showTime?: boolean;
  compact?: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (messageId: MessageId, emoji: string) => void;
}

export interface ChatWindowProps {
  room?: Room;
  conversation?: Conversation;
  currentUser: User;
  onSendMessage: (content: string, type: MessageType) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

export interface UserListProps {
  users: User[];
  currentUser: User;
  showOnlineStatus?: boolean;
  showActions?: boolean;
  onUserClick?: (user: User) => void;
  onInvite?: (user: User) => void;
  onBlock?: (user: User) => void;
  onRemove?: (user: User) => void;
}

// All types are exported inline above for easy importing
// Example usage:
// import { AuthService, MessageService, UseFirestoreResult } from '../types/service.types';
