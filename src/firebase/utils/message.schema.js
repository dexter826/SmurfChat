/**
 * Unified Message Schema - SmurfChat
 * 
 * This file defines the standardized schema for all message types in the application.
 * All messages (room messages, direct messages, etc.) will use this unified structure.
 * Single collection 'messages' for all message types.
 * 
 * Migration: Legacy collections 'unified', 'directMessages' have been migrated to 'messages'
 * Created: September 4, 2025
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

/**
 * Unified Message Document Schema
 * Collection: 'messages'
 */
export const UNIFIED_MESSAGE_SCHEMA = {
  // Core fields
  id: "string", // Auto-generated document ID
  text: "string", // Message content
  
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
  
  // File data (when messageType !== 'text')
  fileData: "object|null", // File information
  locationData: "object|null", // Location information
  
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
 * Benefits:
 * - Single collection for all messages
 * - Consistent schema across all message types
 * - Better query performance with proper indexes
 * - Simplified service functions
 */
