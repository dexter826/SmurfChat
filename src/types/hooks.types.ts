/**
 * React Hooks Type Definitions
 * TypeScript interfaces for custom React hooks
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
  /** Delete message */
  deleteMessage: (messageId: string) => Promise<void>;
  /** Mark message as read */
  markAsRead: (messageId: string) => Promise<void>;
  /** React to message */
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  /** Remove reaction from message */
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  /** Current loading states */
  loading: {
    sending: boolean;
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
// EMOJI HOOKS (IMPLEMENTED)
// ================================

/**
 * useEmoji hook return type
 */
export interface UseEmojiResult {
  /** Recently used emojis */
  recentEmojis: string[];
  /** Add emoji to recent list */
  addToRecent: (emoji: string) => void;
  /** Check if text contains emoji */
  hasEmoji: (text: string) => boolean;
  /** Extract emojis from text */
  extractEmojis: (text: string) => string[];
  /** Parse text with emoji codes to parts */
  parseEmojiText: (text: string) => Array<{type: 'text' | 'emoji', content: string}>;
  /** Quick reaction emojis */
  QUICK_REACTIONS: string[];
  /** Available emoji categories */
  EMOJI_CATEGORIES: EmojiCategory[];
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
