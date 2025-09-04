/**
 * React Hooks Type Definitions
 * 
 * TypeScript interfaces for custom React hooks used in SmurfChat
 * Provides type safety và intellisense cho hook usage
 * 
 * Created: September 4, 2025
 * Task: 4.2 - Add Proper TypeScript Definitions
 */

import { 
  User,
  Message,
  FirestoreCondition
} from './database.types';

// ================================
// FIRESTORE HOOKS
// ================================

/**
 * useFirestore hook return type
 */
export interface UseFirestoreResult<T> {
  /** Array of documents from Firestore query */
  documents: T[];
  /** Alias for documents (backward compatibility) */
  data: T[];
  /** Loading state indicator */
  loading: boolean;
  /** Error object if query failed */
  error: Error | null;
  /** Function to manually refresh data */
  refresh: () => void;
}

/**
 * useFirestore hook parameters
 */
export interface UseFirestoreOptions {
  /** Firestore collection name */
  collectionName: string;
  /** Where condition for filtering */
  condition?: FirestoreCondition | null;
  /** Field to order results by */
  orderByField?: string | null;
  /** Sort direction */
  orderDirection?: 'asc' | 'desc';
  /** Enable real-time updates */
  realTime?: boolean;
  /** Custom cache key */
  customKey?: string | null;
}

/**
 * usePaginatedFirestore hook return type
 */
export interface UsePaginatedFirestoreResult<T> {
  /** Array of paginated documents */
  data: T[];
  /** Loading state for initial load */
  loading: boolean;
  /** Loading state for pagination requests */
  loadingMore: boolean;
  /** Error object if query failed */
  error: Error | null;
  /** Whether more pages are available */
  hasMore: boolean;
  /** Load next page of data */
  loadMore: () => Promise<void>;
  /** Refresh entire dataset */
  refresh: () => Promise<void>;
  /** Reset to first page */
  reset: () => void;
  /** Current page metadata */
  pagination: {
    currentPage: number;
    totalPages: number | null;
    pageSize: number;
  };
}

/**
 * usePaginatedFirestore hook parameters
 */
export interface UsePaginatedFirestoreOptions {
  /** Firestore collection name */
  collectionName: string;
  /** Where condition for filtering */
  condition?: FirestoreCondition | null;
  /** Field to order results by */
  orderByField?: string | null;
  /** Sort direction */
  orderDirection?: 'asc' | 'desc';
  /** Number of items per page */
  pageSize?: number;
  /** Enable real-time updates */
  realTime?: boolean;
  /** Auto-load first page on mount */
  autoLoad?: boolean;
}

// ================================
// USER HOOKS
// ================================

/**
 * useUserSearch hook return type
 */
export interface UseUserSearchResult {
  /** Array of found users */
  users: User[];
  /** Search loading state */
  loading: boolean;
  /** Search error */
  error: Error | null;
  /** Current search query */
  query: string;
  /** Perform search with query */
  search: (searchQuery: string) => Promise<void>;
  /** Clear search results */
  clear: () => void;
  /** Search history */
  searchHistory: string[];
  /** Add query to search history */
  addToHistory: (query: string) => void;
}

/**
 * useUserSearch hook parameters
 */
export interface UseUserSearchOptions {
  /** Minimum query length before searching */
  minQueryLength?: number;
  /** Search result limit */
  limit?: number;
  /** Exclude current user from results */
  excludeCurrentUser?: boolean;
  /** Debounce delay in milliseconds */
  debounceDelay?: number;
  /** Auto-search on query change */
  autoSearch?: boolean;
}

/**
 * useOnlineStatus hook return type
 */
export interface UseOnlineStatusResult {
  /** Whether user is currently online */
  isOnline: boolean;
  /** Last seen timestamp */
  lastSeen: Date | null;
  /** Loading state */
  loading: boolean;
  /** Error if failed to get status */
  error: Error | null;
  /** Refresh status manually */
  refresh: () => Promise<void>;
}

// ================================
// MESSAGING HOOKS
// ================================

/**
 * useMessageHandler hook return type
 */
export interface UseMessageHandlerResult {
  /** Send a new message */
  sendMessage: (content: string, type?: string, attachments?: any[]) => Promise<void>;
  /** Edit existing message */
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  /** Delete message */
  deleteMessage: (messageId: string) => Promise<void>;
  /** Mark message as read */
  markAsRead: (messageId: string) => Promise<void>;
  /** React to message */
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  /** Remove reaction from message */
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  /** Reply to message */
  replyToMessage: (originalMessageId: string, content: string) => Promise<void>;
  /** Current loading states */
  loading: {
    sending: boolean;
    editing: boolean;
    deleting: boolean;
    reacting: boolean;
  };
  /** Error states */
  error: Error | null;
}

/**
 * useMessageHandler hook parameters
 */
export interface UseMessageHandlerOptions {
  /** Room ID for room messages */
  roomId?: string | null;
  /** Conversation ID for direct messages */
  conversationId?: string | null;
  /** Current user ID */
  currentUserId: string;
  /** Callback when message sent successfully */
  onMessageSent?: (message: Message) => void;
  /** Callback when message operation fails */
  onError?: (error: Error) => void;
}

// ================================
// BLOCKING HOOKS
// ================================

/**
 * useBlockStatus hook return type
 */
export interface UseBlockStatusResult {
  /** Whether current user is blocked by target */
  isBlocked: boolean;
  /** Whether users are mutually blocked */
  isMutuallyBlocked: boolean;
  /** Whether current user blocked target */
  hasBlocked: boolean;
  /** Loading state */
  loading: boolean;
  /** Error if check failed */
  error: Error | null;
  /** Block the target user */
  blockUser: (reason?: string) => Promise<void>;
  /** Unblock the target user */
  unblockUser: () => Promise<void>;
  /** Refresh block status */
  refresh: () => Promise<void>;
}

/**
 * useBlockStatus hook parameters
 */
export interface UseBlockStatusOptions {
  /** Current user ID */
  currentUserId: string;
  /** Target user ID to check */
  targetUserId: string;
  /** Auto-refresh interval in ms */
  refreshInterval?: number;
  /** Cache results for duration in ms */
  cacheTimeout?: number;
}

// ================================
// FILE UPLOAD HOOKS
// ================================

/**
 * useFileUpload hook return type
 */
export interface UseFileUploadResult {
  /** Upload single file */
  uploadFile: (file: File, path?: string) => Promise<string>;
  /** Upload multiple files */
  uploadFiles: (files: File[], basePath?: string) => Promise<string[]>;
  /** Upload progress for each file */
  progress: Record<string, number>;
  /** Upload states */
  uploading: Record<string, boolean>;
  /** Upload errors */
  errors: Record<string, Error | null>;
  /** Cancel specific upload */
  cancelUpload: (fileName: string) => void;
  /** Cancel all uploads */
  cancelAll: () => void;
  /** Clear completed uploads */
  clearCompleted: () => void;
}

/**
 * useFileUpload hook parameters
 */
export interface UseFileUploadOptions {
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Allowed file types */
  allowedTypes?: string[];
  /** Auto-upload on file selection */
  autoUpload?: boolean;
  /** Callback when upload completes */
  onUploadComplete?: (fileName: string, url: string) => void;
  /** Callback when upload fails */
  onUploadError?: (fileName: string, error: Error) => void;
  /** Callback for upload progress */
  onProgress?: (fileName: string, progress: number) => void;
}

// ================================
// NOTIFICATION HOOKS
// ================================

/**
 * useNotifications hook return type
 */
export interface UseNotificationsResult {
  /** Array of current notifications */
  notifications: Notification[];
  /** Unread notification count */
  unreadCount: number;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Mark notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all as read */
  markAllAsRead: () => Promise<void>;
  /** Delete notification */
  deleteNotification: (notificationId: string) => Promise<void>;
  /** Clear all notifications */
  clearAll: () => Promise<void>;
  /** Refresh notifications */
  refresh: () => Promise<void>;
}

/**
 * Custom notification type
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'message' | 'friend_request' | 'event' | 'mention' | 'system';
  isRead: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

// ================================
// UTILITY HOOKS
// ================================

/**
 * useDebounce hook return type
 */
export interface UseDebounceResult<T> {
  /** Debounced value */
  debouncedValue: T;
  /** Whether debounce is pending */
  isPending: boolean;
  /** Cancel pending debounce */
  cancel: () => void;
  /** Flush debounce immediately */
  flush: () => void;
}

/**
 * useLocalStorage hook return type
 */
export interface UseLocalStorageResult<T> {
  /** Current stored value */
  value: T;
  /** Set new value */
  setValue: (value: T | ((prev: T) => T)) => void;
  /** Remove value from storage */
  removeValue: () => void;
  /** Loading state for initial load */
  loading: boolean;
  /** Error if storage operation failed */
  error: Error | null;
}

/**
 * useInfiniteScroll hook return type
 */
export interface UseInfiniteScrollResult {
  /** Whether currently at bottom */
  isAtBottom: boolean;
  /** Whether currently at top */
  isAtTop: boolean;
  /** Scroll to bottom */
  scrollToBottom: (smooth?: boolean) => void;
  /** Scroll to top */
  scrollToTop: (smooth?: boolean) => void;
  /** Scroll to specific element */
  scrollToElement: (elementId: string, smooth?: boolean) => void;
}

/**
 * useInfiniteScroll hook parameters
 */
export interface UseInfiniteScrollOptions {
  /** Container element ref */
  containerRef: React.RefObject<HTMLElement>;
  /** Threshold for triggering load more (in pixels) */
  threshold?: number;
  /** Callback when reaching bottom */
  onLoadMore?: () => void;
  /** Callback when reaching top */
  onLoadPrevious?: () => void;
  /** Reverse scroll direction (for chat messages) */
  reverse?: boolean;
  /** Debounce scroll events */
  debounceMs?: number;
}

// ================================
// EMOJI HOOKS
// ================================

/**
 * useEmoji hook return type
 */
export interface UseEmojiResult {
  /** Available emoji categories */
  categories: EmojiCategory[];
  /** Recently used emojis */
  recentEmojis: string[];
  /** Search emojis by query */
  searchEmojis: (query: string) => string[];
  /** Add emoji to recent list */
  addToRecent: (emoji: string) => void;
  /** Clear recent emojis */
  clearRecent: () => void;
  /** Convert text with emoji codes to emojis */
  parseEmojis: (text: string) => string;
}

/**
 * Emoji category interface
 */
export interface EmojiCategory {
  id: string;
  name: string;
  emojis: string[];
}

// All hook types are exported for easy importing
// Example usage:
// import { UseFirestoreResult, UseMessageHandlerResult } from '../types/hooks.types';
