/**
 * Centralized Error Handling System
 * 
 * Provides standardized error handling across all Firebase services.
 * Eliminates inconsistent error messages and improves user experience.
 * 
 * Created for Task 3.1 - Centralize Error Handling
 * Author: Database Optimization Team
 * Date: September 4, 2025
 */

// Error Types for better categorization
export const ErrorTypes = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  AUTH_EMAIL_ALREADY_EXISTS: 'auth/email-already-in-use',
  AUTH_WEAK_PASSWORD: 'auth/weak-password',
  AUTH_UNAUTHORIZED: 'auth/unauthorized',
  
  // Database errors
  DB_DOCUMENT_NOT_FOUND: 'db/document-not-found',
  DB_PERMISSION_DENIED: 'db/permission-denied',
  DB_NETWORK_ERROR: 'db/network-error',
  DB_QUOTA_EXCEEDED: 'db/quota-exceeded',
  
  // Business logic errors
  BUSINESS_USER_BLOCKED: 'business/user-blocked',
  BUSINESS_SELF_ACTION: 'business/self-action',
  BUSINESS_ALREADY_EXISTS: 'business/already-exists',
  BUSINESS_NOT_FOUND: 'business/not-found',
  BUSINESS_INVALID_INPUT: 'business/invalid-input',
  BUSINESS_PERMISSION_DENIED: 'business/permission-denied',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'validation/required-field',
  VALIDATION_INVALID_FORMAT: 'validation/invalid-format',
  VALIDATION_TOO_LONG: 'validation/too-long',
  VALIDATION_TOO_SHORT: 'validation/too-short',
  
  // File/Storage errors
  STORAGE_FILE_TOO_LARGE: 'storage/file-too-large',
  STORAGE_INVALID_FILE_TYPE: 'storage/invalid-file-type',
  STORAGE_UPLOAD_FAILED: 'storage/upload-failed',
  
  // Generic errors
  UNKNOWN_ERROR: 'unknown/error',
  NETWORK_ERROR: 'network/error'
};

// Vietnamese error messages mapping
const ErrorMessages = {
  // Authentication
  [ErrorTypes.AUTH_INVALID_CREDENTIALS]: 'Email hoặc mật khẩu không chính xác',
  [ErrorTypes.AUTH_USER_NOT_FOUND]: 'Không tìm thấy tài khoản người dùng',
  [ErrorTypes.AUTH_EMAIL_ALREADY_EXISTS]: 'Email này đã được sử dụng',
  [ErrorTypes.AUTH_WEAK_PASSWORD]: 'Mật khẩu quá yếu (tối thiểu 6 ký tự)',
  [ErrorTypes.AUTH_UNAUTHORIZED]: 'Bạn không có quyền thực hiện hành động này',
  
  // Database
  [ErrorTypes.DB_DOCUMENT_NOT_FOUND]: 'Không tìm thấy dữ liệu yêu cầu',
  [ErrorTypes.DB_PERMISSION_DENIED]: 'Không có quyền truy cập dữ liệu',
  [ErrorTypes.DB_NETWORK_ERROR]: 'Lỗi kết nối mạng, vui lòng thử lại',
  [ErrorTypes.DB_QUOTA_EXCEEDED]: 'Đã vượt quá giới hạn sử dụng',
  
  // Business logic
  [ErrorTypes.BUSINESS_USER_BLOCKED]: 'Người dùng đã bị chặn',
  [ErrorTypes.BUSINESS_SELF_ACTION]: 'Không thể thực hiện hành động với chính mình',
  [ErrorTypes.BUSINESS_ALREADY_EXISTS]: 'Dữ liệu đã tồn tại',
  [ErrorTypes.BUSINESS_NOT_FOUND]: 'Không tìm thấy dữ liệu',
  [ErrorTypes.BUSINESS_INVALID_INPUT]: 'Dữ liệu đầu vào không hợp lệ',
  [ErrorTypes.BUSINESS_PERMISSION_DENIED]: 'Không có quyền thực hiện hành động này',
  
  // Validation
  [ErrorTypes.VALIDATION_REQUIRED_FIELD]: 'Trường này là bắt buộc',
  [ErrorTypes.VALIDATION_INVALID_FORMAT]: 'Định dạng không hợp lệ',
  [ErrorTypes.VALIDATION_TOO_LONG]: 'Nội dung quá dài',
  [ErrorTypes.VALIDATION_TOO_SHORT]: 'Nội dung quá ngắn',
  
  // Storage
  [ErrorTypes.STORAGE_FILE_TOO_LARGE]: 'File quá lớn (tối đa 10MB)',
  [ErrorTypes.STORAGE_INVALID_FILE_TYPE]: 'Loại file không được hỗ trợ',
  [ErrorTypes.STORAGE_UPLOAD_FAILED]: 'Lỗi khi tải file lên',
  
  // Generic
  [ErrorTypes.UNKNOWN_ERROR]: 'Có lỗi xảy ra, vui lòng thử lại',
  [ErrorTypes.NETWORK_ERROR]: 'Lỗi kết nối mạng'
};

// Enhanced Error class with metadata
export class SmurfChatError extends Error {
  constructor(type, message = null, originalError = null, metadata = {}) {
    const errorMessage = message || ErrorMessages[type] || ErrorMessages[ErrorTypes.UNKNOWN_ERROR];
    super(errorMessage);
    
    this.name = 'SmurfChatError';
    this.type = type;
    this.originalError = originalError;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
  
  // Convert to plain object for logging
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      originalError: this.originalError?.message,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// Error handling utilities
export const handleFirebaseError = (error, context = '') => {
  console.error(`[${context}] Firebase Error:`, error);
  
  // Map Firebase error codes to our error types
  const firebaseErrorMap = {
    'auth/invalid-email': ErrorTypes.AUTH_INVALID_CREDENTIALS,
    'auth/user-disabled': ErrorTypes.AUTH_UNAUTHORIZED,
    'auth/user-not-found': ErrorTypes.AUTH_USER_NOT_FOUND,
    'auth/wrong-password': ErrorTypes.AUTH_INVALID_CREDENTIALS,
    'auth/email-already-in-use': ErrorTypes.AUTH_EMAIL_ALREADY_EXISTS,
    'auth/weak-password': ErrorTypes.AUTH_WEAK_PASSWORD,
    'permission-denied': ErrorTypes.DB_PERMISSION_DENIED,
    'not-found': ErrorTypes.DB_DOCUMENT_NOT_FOUND,
    'unavailable': ErrorTypes.DB_NETWORK_ERROR,
    'resource-exhausted': ErrorTypes.DB_QUOTA_EXCEEDED
  };
  
  const errorType = firebaseErrorMap[error.code] || ErrorTypes.UNKNOWN_ERROR;
  return new SmurfChatError(errorType, null, error, { context });
};

// Generic error handler with logging
export const handleServiceError = (error, operation, metadata = {}) => {
  const context = `Service: ${operation}`;
  console.error(`[${context}]`, error);
  
  // If it's already a SmurfChatError, return it
  if (error instanceof SmurfChatError) {
    return error;
  }
  
  // If it's a Firebase error
  if (error.code) {
    return handleFirebaseError(error, context);
  }
  
  // For custom business logic errors
  if (error.message && typeof error.message === 'string') {
    // Try to match common error patterns
    const businessErrorPatterns = {
      'không thể.*chính mình': ErrorTypes.BUSINESS_SELF_ACTION,
      'đã.*chặn': ErrorTypes.BUSINESS_USER_BLOCKED,
      'đã.*tồn tại': ErrorTypes.BUSINESS_ALREADY_EXISTS,
      'không.*tồn tại': ErrorTypes.BUSINESS_NOT_FOUND,
      'không.*quyền': ErrorTypes.BUSINESS_PERMISSION_DENIED
    };
    
    for (const [pattern, type] of Object.entries(businessErrorPatterns)) {
      if (new RegExp(pattern, 'i').test(error.message)) {
        return new SmurfChatError(type, error.message, error, metadata);
      }
    }
  }
  
  // Default unknown error
  return new SmurfChatError(ErrorTypes.UNKNOWN_ERROR, null, error, metadata);
};

// Success logger for consistency
export const logSuccess = (operation, metadata = {}) => {
  console.log(`✅ [${operation}] Success:`, metadata);
};

// Validation helpers
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    throw new SmurfChatError(
      ErrorTypes.VALIDATION_REQUIRED_FIELD, 
      `${fieldName} là bắt buộc`
    );
  }
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new SmurfChatError(ErrorTypes.VALIDATION_INVALID_FORMAT, 'Email không hợp lệ');
  }
};

export const validateLength = (value, min, max, fieldName) => {
  if (value.length < min) {
    throw new SmurfChatError(
      ErrorTypes.VALIDATION_TOO_SHORT, 
      `${fieldName} phải có ít nhất ${min} ký tự`
    );
  }
  if (value.length > max) {
    throw new SmurfChatError(
      ErrorTypes.VALIDATION_TOO_LONG, 
      `${fieldName} không được vượt quá ${max} ký tự`
    );
  }
};

// File validation helpers
export const validateFileSize = (file, maxSizeInMB = 10) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new SmurfChatError(
      ErrorTypes.STORAGE_FILE_TOO_LARGE, 
      `File quá lớn (tối đa ${maxSizeInMB}MB)`
    );
  }
};

export const validateFileType = (file, allowedTypes = []) => {
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new SmurfChatError(
      ErrorTypes.STORAGE_INVALID_FILE_TYPE,
      `Chỉ hỗ trợ các loại file: ${allowedTypes.join(', ')}`
    );
  }
};

// Business logic helpers
export const validateUserAction = (currentUserId, targetUserId, actionName = 'hành động') => {
  if (currentUserId === targetUserId) {
    throw new SmurfChatError(
      ErrorTypes.BUSINESS_SELF_ACTION,
      `Không thể ${actionName} với chính mình`
    );
  }
};

// Export helper function for backward compatibility
export const createError = (type, message, originalError, metadata) => {
  return new SmurfChatError(type, message, originalError, metadata);
};

const ErrorUtils = {
  ErrorTypes,
  SmurfChatError,
  handleFirebaseError,
  handleServiceError,
  logSuccess,
  validateRequired,
  validateEmail,
  validateLength,
  validateFileSize,
  validateFileType,
  validateUserAction,
  createError
};

export default ErrorUtils;
