/**
 * SmurfChat Database Types
 * TypeScript interfaces for Firestore collections
 * Created: September 4, 2025
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

export type VoteId = string;

export enum ChatType {
  ROOM = 'room',
  DIRECT = 'direct'
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VOICE = 'voice',
  LOCATION = 'location'
}


export enum FriendStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

// ================================
// USER COLLECTION
// ================================

export interface User {
  uid: UserId;
  email: string;
  displayName: string;
  photoURL?: string;
  keywords: string[];
  isOnline: boolean;
  lastSeen: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
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
  
  // Reactions
  reactions?: Record<string, UserId[]>; // emoji -> user IDs
}

export interface RoomMessage extends BaseMessage {
  chatType: ChatType.ROOM;
  roomId: RoomId;
}

export interface DirectMessage extends BaseMessage {
  chatType: ChatType.DIRECT;
  conversationId: ConversationId;
}

export type Message = RoomMessage | DirectMessage;

// ================================
// ROOM COLLECTION
// ================================

export interface Room {
  id: RoomId;
  name: string;
  createdBy: UserId;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  
  // Member management
  members: UserId[];
  admins: UserId[];
  
  // Last activity
  lastMessage?: {
    content: string;
    senderId: UserId;
    createdAt: FirestoreTimestamp;
    messageType: MessageType;
  };
  
  lastActivity: FirestoreTimestamp;
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
  
  // Read status per participant
  readStatus: Record<UserId, {
    lastReadAt: FirestoreTimestamp;
    unreadCount: number;
  }>;
}


// ================================
// BLOCK COLLECTION
// ================================

export interface Block {
  id: string;
  blockerId: UserId; // User who initiated the block
  blockedId: UserId; // User being blocked
  createdAt: FirestoreTimestamp;
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
}

// ================================
// FRIEND REQUEST COLLECTION
// ================================

export interface FriendRequest {
  id: string;
  fromUserId: UserId;
  toUserId: UserId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

// ================================
// VOTE COLLECTION
// ================================

export interface Vote {
  id: VoteId;
  title: string;
  description?: string;
  createdBy: UserId;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  
  // Vote options
  options: string[];
  
  // Vote data
  votes: Record<UserId, number>; // userId -> optionIndex
  voteCounts: number[]; // count for each option
  
  // Associated chat
  roomId?: RoomId;
  conversationId?: ConversationId;
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
}

export interface CreateRoomData {
  name: string;
}

export interface CreateMessageData {
  content: string;
  messageType: MessageType;
  chatType: ChatType;
  roomId?: RoomId;
  conversationId?: ConversationId;
}


export interface CreateVoteData {
  title: string;
  description?: string;
  options: string[];
}

// ================================
// BLOCKED USER COLLECTION
// ================================

export interface BlockedUser {
  id: string;
  blockerUserId: UserId;
  blockedUserId: UserId;
  createdAt: FirestoreTimestamp;
}
