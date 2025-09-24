export type {
  // Basic types
  FirestoreTimestamp,
  DocumentId,
  UserId,
  RoomId,
  ConversationId,
  MessageId,
  VoteId,
  
  // Main entities
  User,
  BaseMessage,
  Message,
  RoomMessage,
  DirectMessage,
  Room,
  Conversation,
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
} from './database.types';

// Export enums
export {
  ChatType,
  MessageType,
  FriendStatus
} from './database.types';

export type {
  // Service interfaces
  AuthService,
  UserService,
  MessageService,
  RoomService,
  ConversationService,
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

export {
  // Validation functions
  validateCreateUser,
  validateCreateRoom,
  validateCreateMessage,
  
  // Type guards
  isUser,
  isRoom,
  isMessage,
  
  // Helper functions
  isValidEmail,
  sanitizeString,
  isStringTooLong,
  isStringTooShort
} from './validation.utils';

// Export default validation utilities object
export { default as ValidationUtils } from './validation.utils';

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

export type MaybePromise<T> = T | Promise<T>;

export type Result<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

export type FieldValidation = {
  isValid: boolean;
  error?: string;
  touched: boolean;
  dirty: boolean;
};

export type FormState<T> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
};

type Brand<K, T> = K & { __brand: T };

export type Email = Brand<string, 'Email'>;

export type Phone = Brand<string, 'Phone'>;

export type Url = Brand<string, 'Url'>;

export type ISODateString = Brand<string, 'ISODateString'>;

export const DEFAULT_PAGINATION = {
  pageSize: 30,
  maxPages: 100,
  prefetchThreshold: 5
} as const;

export const DEFAULT_VALIDATION = {
  minPasswordLength: 6,
  maxPasswordLength: 100,
  minDisplayNameLength: 2,
  maxDisplayNameLength: 50,
  maxMessageLength: 5000,
  maxRoomNameLength: 100,
} as const;

export const UPLOAD_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxImageSize: 5 * 1024 * 1024,  // 5MB
  maxVoiceSize: 25 * 1024 * 1024, // 25MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedFileTypes: ['application/pdf', 'text/plain', 'application/msword'],
  allowedVoiceTypes: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg']
} as const;

export const TYPES_VERSION = '1.0.0' as const;

export const TYPES_UPDATED = '2025-09-04' as const;

export const SCHEMA_VERSION = '2.0.0' as const;
