/**
 * Unified Message Schema - SmurfChat
 *
 * This file defines the standardized schema for all message types in the application.
 * All messages (room messages, direct messages, etc.) will use this unified structure.
 * Single collection 'messages' for all message types.
 *
 * ENCRYPTION SUPPORT: Messages can be stored in encrypted format for enhanced security.
 * When encrypted, the original content is encrypted and stored in encrypted* fields.
 *
 * Migration: Legacy collections 'unified', 'directMessages' have been migrated to 'messages'
 * Updated: September 24, 2025 (Added encryption support)
 */

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  VOICE: 'voice',
  LOCATION: 'location',
  SYSTEM: 'system' // For system notifications
};

// Chat Types
export const CHAT_TYPES = {
  ROOM: 'room',
  DIRECT: 'direct'
};

// Message Status
export const MESSAGE_STATUS = {
  SENT: 'sent',
  RECALLED: 'recalled'
};

// Encryption Status
export const ENCRYPTION_STATUS = {
  DISABLED: false,
  ENABLED: true
};

/**
 * Unified Message Document Schema
 * Collection: 'messages'
 *
 * ENCRYPTION SUPPORT:
 * - When isEncrypted: true, content is stored in encrypted* fields
 * - Original content is encrypted using user's master key
 * - Content hash is stored for integrity verification
 */
export const UNIFIED_MESSAGE_SCHEMA = {
  // Core fields
  id: "string", // Auto-generated document ID
  text: "string", // Message content (plain text when not encrypted)
  encryptedText: "string|null", // Encrypted message content (when isEncrypted: true)

  // Author info
  uid: "string", // User ID of sender
  displayName: "string", // Sender display name
  photoURL: "string|null", // Sender avatar

  // Chat context
  chatType: "string", // 'room' | 'direct' - CHAT_TYPES
  chatId: "string", // roomId for rooms, conversationId for direct messages

  // Message metadata
  messageType: "string", // MESSAGE_TYPES
  status: "string", // MESSAGE_STATUS (default: 'sent')

  // Encryption metadata
  isEncrypted: "boolean", // Default: false - whether message content is encrypted
  contentHash: "string|null", // SHA-256 hash of original content for integrity

  // File data (when messageType !== 'text')
  fileData: "object|null", // File information (plain when not encrypted)
  encryptedFileData: "string|null", // Encrypted file data (when isEncrypted: true)
  locationData: "object|null", // Location information (plain when not encrypted)
  encryptedLocationData: "string|null", // Encrypted location data (when isEncrypted: true)

  // Read status (OPTIMIZED: removed redundant readBy field)
  readByDetails: "object", // { userId: timestamp } for detailed read info

  // Recall functionality
  recalled: "boolean", // Default: false
  recalledAt: "timestamp|null",
  originalText: "string|null", // Backup of original text when recalled
  originalFileData: "object|null", // Backup of original file when recalled
  originalLocationData: "object|null", // Backup of original location when recalled

  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp|null"
};

/**
 * Migration Notes:
 *
 * LEGACY STRUCTURE (REMOVED):
 * - unified: { roomId?, conversationId?, type: 'room'|'direct', ... }
 * - directMessages: { conversationId, ... }
 *
 * CURRENT STRUCTURE:
 * - messages: { chatType: 'room'|'direct', chatId: roomId|conversationId, ... }
 *
 * ENCRYPTION SUPPORT:
 * - Added encrypted* fields for secure content storage
 * - isEncrypted flag indicates encryption status
 * - contentHash for integrity verification
 *
 * Benefits:
 * - Single collection for all messages
 * - Consistent schema across all message types
 * - Better query performance with proper indexes
 * - Simplified service functions
 * - End-to-end encryption support
 */

/**
 * Helper function to check if a message is encrypted
 *
 * @param {object} message - Message object
 * @returns {boolean} True if message is encrypted
 */
export const isMessageEncrypted = (message) => {
  return message && message.isEncrypted === true;
};

/**
 * Helper function to get the appropriate text field based on encryption status
 *
 * @param {object} message - Message object
 * @returns {string|null} Text content (decrypted if needed)
 */
export const getMessageText = (message) => {
  if (!message) return null;
  return isMessageEncrypted(message) ? message.encryptedText : message.text;
};

/**
 * Helper function to get the appropriate file data based on encryption status
 *
 * @param {object} message - Message object
 * @returns {object|string|null} File data (decrypted if needed)
 */
export const getMessageFileData = (message) => {
  if (!message) return null;
  return isMessageEncrypted(message) ? message.encryptedFileData : message.fileData;
};

/**
 * Helper function to get the appropriate location data based on encryption status
 *
 * @param {object} message - Message object
 * @returns {object|string|null} Location data (decrypted if needed)
 */
export const getMessageLocationData = (message) => {
  if (!message) return null;
  return isMessageEncrypted(message) ? message.encryptedLocationData : message.locationData;
};
