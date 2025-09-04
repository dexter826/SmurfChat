/**
 * SmurfChat Database Type Definitions
 * 
 * Comprehensive TypeScript interfaces for all Firestore collections
 * Provides type safety và better developer experience
 * 
 * Created: September 4, 2025
 * Task: 4.2 - Add Proper TypeScript Definitions
 * 
 * Collections:
 * - users: User profiles và authentication data
 * - messages: Unified message collection (rooms + direct messages)
 * - rooms: Public chat rooms
 * - conversations: Direct message conversations
 * - events: Calendar events và reminders
 * - blocks: User blocking relationships
 * - friends: Friend relationships
 */

import { Timestamp } from 'firebase/firestore';

// ================================
// BASE TYPES & ENUMS
// ================================

export type FirestoreTimestamp = Timestamp;
export type DocumentId = string;
export type UserId = string;
export type RoomId = string;
export type ConversationId = string;
export type MessageId = string;
export type EventId = string;

export enum ChatType {
  ROOM = 'room',
  DIRECT = 'direct'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VOICE = 'voice',
  LOCATION = 'location',
  EVENT = 'event',
  VOTE = 'vote'
}

export enum EventStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum FriendStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export enum OnlineStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away'
}

// ================================
// USER COLLECTION
// ================================

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  phone?: string;
  searchKeywords: string[];
  onlineStatus: OnlineStatus;
  lastSeen: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  isActive: boolean;
  
  // Privacy settings
  privacy?: {
    showPhone: boolean;
    showEmail: boolean;
    allowFriendRequests: boolean;
  };
  
  // Notification preferences
  notifications?: {
    messages: boolean;
    friendRequests: boolean;
    events: boolean;
    mentions: boolean;
  };
}

// ================================
// MESSAGE COLLECTION (UNIFIED)
// ================================

export interface BaseMessage {
  id: MessageId;
  senderId: UserId;
  chatType: ChatType;
  messageType: MessageType;
  content: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  
  // Read tracking
  readByDetails: Record<UserId, FirestoreTimestamp>;
  
  // Edit tracking
  isEdited: boolean;
  editHistory?: Array<{
    content: string;
    editedAt: FirestoreTimestamp;
  }>;
  
  // Reply system
  replyTo?: {
    messageId: MessageId;
    senderId: UserId;
    content: string; // Preview of original message
  };
  
  // Reactions
  reactions?: Record<string, UserId[]>; // emoji -> user IDs
}

export interface RoomMessage extends BaseMessage {
  chatType: ChatType.ROOM;
  roomId: RoomId;
  
  // Room-specific features
  mentions?: UserId[];
  isPinned?: boolean;
  pinnedAt?: FirestoreTimestamp;
  pinnedBy?: UserId;
}

export interface DirectMessage extends BaseMessage {
  chatType: ChatType.DIRECT;
  conversationId: ConversationId;
  
  // Direct message specific
  isDelivered: boolean;
  deliveredAt?: FirestoreTimestamp;
}

export type Message = RoomMessage | DirectMessage;

// ================================
// MESSAGE ATTACHMENTS
// ================================

export interface ImageAttachment {
  messageType: MessageType.IMAGE;
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number; // bytes
  fileName: string;
}

export interface FileAttachment {
  messageType: MessageType.FILE;
  fileUrl: string;
  fileName: string;
  fileType: string; // MIME type
  size: number; // bytes
}

export interface VoiceAttachment {
  messageType: MessageType.VOICE;
  voiceUrl: string;
  duration: number; // seconds
  size: number; // bytes
}

export interface LocationAttachment {
  messageType: MessageType.LOCATION;
  latitude: number;
  longitude: number;
  address?: string;
  locationName?: string;
}

export interface EventAttachment {
  messageType: MessageType.EVENT;
  eventId: EventId;
  eventTitle: string;
  eventDate: FirestoreTimestamp;
}

export interface VoteAttachment {
  messageType: MessageType.VOTE;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: UserId[];
  }>;
  allowMultiple: boolean;
  expiresAt?: FirestoreTimestamp;
  isActive: boolean;
}

// ================================
// ROOM COLLECTION
// ================================

export interface Room {
  id: RoomId;
  name: string;
  description?: string;
  imageUrl?: string;
  createdBy: UserId;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  
  // Member management
  members: UserId[];
  admins: UserId[];
  
  // Room settings
  isPrivate: boolean;
  isArchived: boolean;
  maxMembers?: number;
  
  // Last activity
  lastMessage?: {
    content: string;
    senderId: UserId;
    createdAt: FirestoreTimestamp;
    messageType: MessageType;
  };
  
  lastActivity: FirestoreTimestamp;
  
  // Room features
  features?: {
    allowFileUpload: boolean;
    allowVoiceMessages: boolean;
    allowPolls: boolean;
    allowEvents: boolean;
  };
}

// ================================
// CONVERSATION COLLECTION
// ================================

export interface Conversation {
  id: ConversationId;
  participants: [UserId, UserId]; // Always exactly 2 participants
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  
  // Last activity
  lastMessage?: {
    content: string;
    senderId: UserId;
    createdAt: FirestoreTimestamp;
    messageType: MessageType;
  };
  
  lastActivity: FirestoreTimestamp;
  
  // Conversation state
  isArchived: boolean;
  isDeleted: boolean;
  
  // Read status per participant
  readStatus: Record<UserId, {
    lastReadAt: FirestoreTimestamp;
    unreadCount: number;
  }>;
}

// ================================
// EVENT COLLECTION
// ================================

export interface Event {
  id: EventId;
  title: string;
  description?: string;
  createdBy: UserId;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  
  // Event timing
  startDate: FirestoreTimestamp;
  endDate?: FirestoreTimestamp;
  isAllDay: boolean;
  
  // Event details
  location?: string;
  status: EventStatus;
  
  // Participants
  participants: Array<{
    userId: UserId;
    status: 'going' | 'maybe' | 'not_going' | 'invited';
    respondedAt?: FirestoreTimestamp;
  }>;
  
  // Reminders
  reminders?: Array<{
    minutes: number; // minutes before event
    isActive: boolean;
  }>;
  
  // Associated chat
  roomId?: RoomId;
  conversationId?: ConversationId;
  
  // Recurrence
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // every X days/weeks/etc
    endDate?: FirestoreTimestamp;
    exceptions?: FirestoreTimestamp[]; // specific dates to skip
  };
}

// ================================
// BLOCK COLLECTION
// ================================

export interface Block {
  id: string;
  blockerId: UserId; // User who initiated the block
  blockedId: UserId; // User being blocked
  createdAt: FirestoreTimestamp;
  reason?: string;
  
  // Block type
  isTemporary?: boolean;
  expiresAt?: FirestoreTimestamp;
  
  // Block scope
  blockMessages: boolean;
  blockCalls: boolean;
  blockProfile: boolean;
}

// ================================
// FRIEND COLLECTION
// ================================

export interface Friend {
  id: string;
  requesterId: UserId; // User who sent friend request
  addresseeId: UserId; // User who received request
  status: FriendStatus;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  
  // Additional data
  message?: string; // Optional message with friend request
  
  // Response data
  respondedAt?: FirestoreTimestamp;
  
  // Relationship metadata
  closeFriend?: boolean; // For priority notifications
  nickname?: string; // Custom name for this friend
}

// ================================
// UTILITY TYPES
// ================================

// For API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

// For pagination
export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  cursor?: any;
  total?: number;
}

// For search results
export interface SearchResult<T> {
  results: T[];
  totalCount: number;
  searchQuery: string;
  searchTime: number; // ms
}

// For real-time updates
export interface RealtimeUpdate<T> {
  type: 'added' | 'modified' | 'removed';
  document: T;
  oldDocument?: T; // For modified events
}

// For file uploads
export interface FileUpload {
  file: File;
  uploadPath: string;
  metadata?: Record<string, any>;
}

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

// ================================
// QUERY BUILDERS & CONDITIONS
// ================================

export interface FirestoreCondition {
  fieldName: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
  compareValue: any;
}

export interface QueryOptions {
  condition?: FirestoreCondition;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  startAfter?: any;
  realTime?: boolean;
}

// ================================
// VALIDATION SCHEMAS
// ================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  field?: string;
}

export interface CreateUserData {
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  isPrivate: boolean;
  maxMembers?: number;
}

export interface CreateMessageData {
  content: string;
  messageType: MessageType;
  chatType: ChatType;
  roomId?: RoomId;
  conversationId?: ConversationId;
  replyTo?: MessageId;
}

export interface CreateEventData {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
  location?: string;
  participants: UserId[];
}

// ================================
// TYPE DEFINITIONS COMPLETE
// ================================

// All types are exported inline above
// Import như sau:
// import { User, Message, Room, ChatType } from '../types/database.types';
