/**
 * SmurfChat TypeScript Definitions - Index
 * 
 * Cen  // Creation data interfaces
  CreateUserData,
  CreateRoomData,
  CreateMessageData,
  CreateEventData,
  CreateVoteDataexport file for all TypeScript definitions
 * Simplifies imports across the application
 * 
 * Created: September 4, 2025
 * Task: 4.2 - Add Proper TypeScript Definitions
 * 
 * Usage Examples:
 * 
 * // Import database types
 * import { User, Message, Room, ChatType } from '../types';
 * 
 * // Import service types
 * import { AuthService, MessageService } from '../types';
 * 
 * // Import hook types
 * import { UseFirestoreResult, UseMessageHandlerResult } from '../types';
 * 
 * // Import validation utilities
 * import { validateCreateUser, isUser } from '../types';
 */

// ================================
// RE-EXPORT DATABASE TYPES
// ================================

export type {
  // Basic types
  FirestoreTimestamp,
  DocumentId,
  UserId,
  RoomId,
  ConversationId,
  MessageId,
  EventId,
  VoteId,
  
  // Main entities
  User,
  BaseMessage,
  Message,
  RoomMessage,
  DirectMessage,
  Room,
  Conversation,
  Event,
  Vote,
  Block,
  Friend,
  
  // Utility types
  ApiResponse,
  PaginatedResult,
  FileUpload,
  UploadProgress,
  FirestoreCondition,
  QueryOptions,
  ValidationResult,
  
  // Creation interfaces
  CreateUserData,
  CreateRoomData,
  CreateMessageData,
  CreateEventData
} from './database.types';

// Export enums
export {
  ChatType,
  MessageType,
  EventStatus,
  FriendStatus
} from './database.types';

// ================================
// RE-EXPORT SERVICE TYPES
// ================================

export type {
  // Service interfaces
  AuthService,
  UserService,
  MessageService,
  RoomService,
  ConversationService,
  EventService,
  FriendService,
  BlockService,
  FileUploadService,
  
  // Composite interfaces
  DatabaseServices,
  
  // Context types
  AuthContextType,
  UserContextType,
  ThemeContextType
} from './service.types';

// ================================
// RE-EXPORT HOOK TYPES
// ================================

export type {
  // Firestore hooks
  UseFirestoreResult,
  UseFirestoreOptions,
  UsePaginatedFirestoreResult,
  UsePaginatedFirestoreOptions,
  
  // User hooks
  UseUserSearchResult,
  UseUserSearchOptions,
  UseOnlineStatusResult,
  
  // Messaging hooks
  UseMessageHandlerResult,
  UseMessageHandlerOptions,
  
  // Block hooks
  UseBlockStatusResult,
  UseBlockStatusOptions,
  
  // Emoji hooks
  UseEmojiResult,
  EmojiCategory
} from './hooks.types';

// ================================
// RE-EXPORT VALIDATION UTILITIES
// ================================

export {
  // Validation functions
  validateCreateUser,
  validateCreateRoom,
  validateCreateMessage,
  validateCreateEvent,
  
  // Type guards
  isUser,
  isRoom,
  isMessage,
  isEvent,
  
  // Helper functions
  isValidEmail,
  sanitizeString,
  isStringTooLong,
  isStringTooShort
} from './validation.utils';

// Export default validation utilities object
export { default as ValidationUtils } from './validation.utils';

// ================================
// ADDITIONAL UTILITY TYPES
// ================================

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract function parameter types
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Extract function return type
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

/**
 * Create a type with properties that can be either T or Promise<T>
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Create a type that represents either success or error state
 */
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Create a type for async operation states
 */
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Create a type for form field validation
 */
export type FieldValidation = {
  isValid: boolean;
  error?: string;
  touched: boolean;
  dirty: boolean;
};

/**
 * Create a type for form state
 */
export type FormState<T> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
};

// ================================
// BRANDED TYPES FOR EXTRA SAFETY
// ================================

/**
 * Brand type to create distinct string types
 */
type Brand<K, T> = K & { __brand: T };

/**
 * Email branded string type
 */
export type Email = Brand<string, 'Email'>;

/**
 * Phone branded string type  
 */
export type Phone = Brand<string, 'Phone'>;

/**
 * URL branded string type
 */
export type Url = Brand<string, 'Url'>;

/**
 * ISO Date string branded type
 */
export type ISODateString = Brand<string, 'ISODateString'>;

// ================================
// CONSTANTS AND DEFAULTS
// ================================

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  pageSize: 30,
  maxPages: 100,
  prefetchThreshold: 5
} as const;

/**
 * Default validation settings
 */
export const DEFAULT_VALIDATION = {
  minPasswordLength: 6,
  maxPasswordLength: 100,
  minDisplayNameLength: 2,
  maxDisplayNameLength: 50,
  maxMessageLength: 5000,
  maxRoomNameLength: 100,
  maxEventTitleLength: 200
} as const;

/**
 * File upload constraints
 */
export const UPLOAD_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxImageSize: 5 * 1024 * 1024,  // 5MB
  maxVoiceSize: 25 * 1024 * 1024, // 25MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedFileTypes: ['application/pdf', 'text/plain', 'application/msword'],
  allowedVoiceTypes: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg']
} as const;

// ================================
// VERSION AND METADATA
// ================================

/**
 * TypeScript definitions version
 */
export const TYPES_VERSION = '1.0.0' as const;

/**
 * Last updated timestamp
 */
export const TYPES_UPDATED = '2025-09-04' as const;

/**
 * Supported database schema version
 */
export const SCHEMA_VERSION = '2.0.0' as const;
