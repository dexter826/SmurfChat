/**
 * TypeScript Validation Utilities
 * 
 * Type-safe validation functions for database operations
 * Complements existing error.utils.js với TypeScript support
 * 
 * Created: September 4, 2025
 * Task: 4.2 - Add Proper TypeScript Definitions
 */

import { 
  User, 
  Room, 
  Message, 
  Event, 
  CreateUserData, 
  CreateRoomData, 
  CreateMessageData, 
  CreateEventData,
  ValidationResult,
  ChatType,
  MessageType
} from './database.types';

// ================================
// VALIDATION FUNCTIONS
// ================================

/**
 * Validate user creation data
 */
export function validateCreateUser(data: Partial<CreateUserData>): ValidationResult {
  const errors: string[] = [];
  
  if (!data.email) {
    errors.push('Email là bắt buộc');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email không hợp lệ');
  }
  
  if (!data.displayName) {
    errors.push('Tên hiển thị là bắt buộc');
  } else if (data.displayName.length < 2) {
    errors.push('Tên hiển thị phải có ít nhất 2 ký tự');
  } else if (data.displayName.length > 50) {
    errors.push('Tên hiển thị không được vượt quá 50 ký tự');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate room creation data
 */
export function validateCreateRoom(data: Partial<CreateRoomData>): ValidationResult {
  const errors: string[] = [];
  
  if (!data.name) {
    errors.push('Tên phòng là bắt buộc');
  } else if (data.name.length < 3) {
    errors.push('Tên phòng phải có ít nhất 3 ký tự');
  } else if (data.name.length > 100) {
    errors.push('Tên phòng không được vượt quá 100 ký tự');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate message creation data
 */
export function validateCreateMessage(data: Partial<CreateMessageData>): ValidationResult {
  const errors: string[] = [];
  
  if (!data.content) {
    errors.push('Nội dung tin nhắn là bắt buộc');
  } else if (data.content.length > 5000) {
    errors.push('Tin nhắn không được vượt quá 5000 ký tự');
  }
  
  if (!data.messageType) {
    errors.push('Loại tin nhắn là bắt buộc');
  } else if (!Object.values(MessageType).includes(data.messageType)) {
    errors.push('Loại tin nhắn không hợp lệ');
  }
  
  if (!data.chatType) {
    errors.push('Loại chat là bắt buộc');
  } else if (!Object.values(ChatType).includes(data.chatType)) {
    errors.push('Loại chat không hợp lệ');
  }
  
  // Validate target based on chat type
  if (data.chatType === ChatType.ROOM && !data.roomId) {
    errors.push('Room ID là bắt buộc cho tin nhắn phòng');
  }
  
  if (data.chatType === ChatType.DIRECT && !data.conversationId) {
    errors.push('Conversation ID là bắt buộc cho tin nhắn riêng');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate event creation data
 */
export function validateCreateEvent(data: Partial<CreateEventData>): ValidationResult {
  const errors: string[] = [];
  
  if (!data.title) {
    errors.push('Tiêu đề sự kiện là bắt buộc');
  } else if (data.title.length < 3) {
    errors.push('Tiêu đề sự kiện phải có ít nhất 3 ký tự');
  } else if (data.title.length > 200) {
    errors.push('Tiêu đề sự kiện không được vượt quá 200 ký tự');
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('Mô tả sự kiện không được vượt quá 1000 ký tự');
  }
  
  if (!data.startDate) {
    errors.push('Ngày bắt đầu là bắt buộc');
  } else if (data.startDate < new Date()) {
    errors.push('Ngày bắt đầu không thể ở quá khứ');
  }
  
  if (!data.participants || data.participants.length === 0) {
    errors.push('Sự kiện phải có ít nhất 1 người tham gia');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ================================
// TYPE GUARDS
// ================================

/**
 * Type guard cho User objects
 */
export function isUser(obj: any): obj is User {
  return obj && 
    typeof obj.uid === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.displayName === 'string' &&
    Array.isArray(obj.keywords) &&
    obj.createdAt &&
    obj.lastSeen;
}

/**
 * Type guard cho Room objects
 */
export function isRoom(obj: any): obj is Room {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.createdBy === 'string' &&
    Array.isArray(obj.members) &&
    Array.isArray(obj.admins) &&
    obj.createdAt;
}

/**
 * Type guard cho Message objects
 */
export function isMessage(obj: any): obj is Message {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.senderId === 'string' &&
    typeof obj.content === 'string' &&
    Object.values(ChatType).includes(obj.chatType) &&
    Object.values(MessageType).includes(obj.messageType) &&
    obj.createdAt &&
    typeof obj.readByDetails === 'object';
}

/**
 * Type guard cho Event objects
 */
export function isEvent(obj: any): obj is Event {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.createdBy === 'string' &&
    obj.startDate &&
    Array.isArray(obj.participants) &&
    typeof obj.isAllDay === 'boolean';
}

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Check if email is valid format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string input
 */
export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Check if string is too long
 */
export function isStringTooLong(str: string, maxLength: number): boolean {
  return str.length > maxLength;
}

/**
 * Check if string is too short
 */
export function isStringTooShort(str: string, minLength: number): boolean {
  return str.length < minLength;
}

// ================================
// EXPORT ALL VALIDATION FUNCTIONS
// ================================

const validationUtils = {
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
};

export default validationUtils;
