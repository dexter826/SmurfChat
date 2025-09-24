import {
  User, 
  Room, 
  Message, 
  Conversation, 
  Block, 
  Friend,
  UserId,
  RoomId,
  ConversationId,
  MessageId,
  ApiResponse,
  PaginatedResult,
  CreateUserData,
  CreateRoomData,
  CreateMessageData,
  ChatType
} from './database.types';

export interface AuthService {
  signUp(email: string, password: string, userData: CreateUserData): Promise<ApiResponse<User>>;
  signIn(email: string, password: string): Promise<ApiResponse<User>>;
  signOut(): Promise<ApiResponse<void>>;
  updateProfile(userId: UserId, updates: Partial<User>): Promise<ApiResponse<User>>;
}

export interface UserService {
  createUser(userData: CreateUserData): Promise<ApiResponse<User>>;
  getUserById(userId: UserId): Promise<ApiResponse<User>>;
  updateUser(userId: UserId, updates: Partial<User>): Promise<ApiResponse<User>>;
  searchUsers(query: string, limit?: number): Promise<ApiResponse<User[]>>;
  updateOnlineStatus(userId: UserId, isOnline: boolean): Promise<ApiResponse<void>>;
  getUsersByIds(userIds: UserId[]): Promise<ApiResponse<User[]>>;
}

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

export interface RoomService {
  createRoom(roomData: CreateRoomData, creatorId: UserId): Promise<ApiResponse<Room>>;
  getRoom(roomId: RoomId): Promise<ApiResponse<Room>>;
  updateRoom(roomId: RoomId, updates: Partial<Room>, userId: UserId): Promise<ApiResponse<Room>>;
  deleteRoom(roomId: RoomId, userId: UserId): Promise<ApiResponse<void>>;
  joinRoom(roomId: RoomId, userId: UserId): Promise<ApiResponse<void>>;
  leaveRoom(roomId: RoomId, userId: UserId): Promise<ApiResponse<void>>;
  addMember(roomId: RoomId, memberId: UserId, addedBy: UserId): Promise<ApiResponse<void>>;
  getUserRooms(userId: UserId): Promise<ApiResponse<Room[]>>;
}

export interface ConversationService {
  getOrCreateConversation(participant1: UserId, participant2: UserId): Promise<ApiResponse<Conversation>>;
  getConversation(conversationId: ConversationId): Promise<ApiResponse<Conversation>>;
  getUserConversations(userId: UserId): Promise<ApiResponse<Conversation[]>>;
  getOtherParticipant(conversation: Conversation, currentUserId: UserId): UserId;
}


export interface FriendService {
  sendFriendRequest(requesterId: UserId, addresseeId: UserId): Promise<ApiResponse<Friend>>;
  respondToFriendRequest(friendId: string, response: 'accepted' | 'rejected'): Promise<ApiResponse<Friend>>;
  getFriend(friendId: string): Promise<ApiResponse<Friend>>;
  getUserFriends(userId: UserId): Promise<ApiResponse<User[]>>;
  getPendingFriendRequests(userId: UserId): Promise<ApiResponse<Friend[]>>;
  getSentFriendRequests(userId: UserId): Promise<ApiResponse<Friend[]>>;
  removeFriend(friendId: string, userId: UserId): Promise<ApiResponse<void>>;
  blockUser(blockerId: UserId, blockedId: UserId): Promise<ApiResponse<void>>;
  unblockUser(blockerId: UserId, blockedId: UserId): Promise<ApiResponse<void>>;
}

export interface BlockService {
  blockUser(blockerId: UserId, blockedId: UserId): Promise<ApiResponse<Block>>;
  unblockUser(blockerId: UserId, blockedId: UserId): Promise<ApiResponse<void>>;
  getBlockedUsers(userId: UserId): Promise<ApiResponse<User[]>>;
  isUserBlocked(checkerId: UserId, targetId: UserId): Promise<ApiResponse<boolean>>;
  areMutuallyBlocked(userId1: UserId, userId2: UserId): Promise<ApiResponse<boolean>>;
}

export interface FileUploadService {
  uploadImage(file: File, path: string): Promise<ApiResponse<{
    url: string;
    metadata: {
      size: number;
      type: string;
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

export interface DatabaseServices {
  auth: AuthService;
  user: UserService;
  message: MessageService;
  room: RoomService;
  conversation: ConversationService;
  friend: FriendService;
  block: BlockService;
  fileUpload: FileUploadService;
}

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
