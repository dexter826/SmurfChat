/**
 * Firebase Services - Unified Export Point
 * 
 * This file serves as the single entry point for all Firebase services.
 * Consolidated from the old services.js pattern to avoid redundancy.
 * 
 * Architecture: Clean Service Exports
 * - Each service category has its own dedicated file
 * - Single source of truth for all service exports
 * - Optimized imports with proper tree-shaking
 * 
 * Last Refactored: August 30, 2025
 */

// Core Firebase utilities
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config';

// Authentication services
export * from './auth.service';

// Message services
export * from './message.service';

// Conversation services  
export * from './conversation.service';

// Room services
export * from './room.service';

// Event services
export * from './event.service';

// Vote services
export * from './vote.service';

// Friend services
export * from './friend.service';

// User services
export * from './user.service';

// Block services
export * from './block.service';

// Storage services (Supabase integration - to be migrated)
export * from './storage.service';

// Legacy compatibility - Generic addDocument function
export const addDocument = (collectionName, data) => {
  const docRef = collection(db, collectionName);
  return addDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};

/**
 * Services Architecture:
 * 
 * This modular service architecture provides the following benefits:
 * - Better code organization and maintainability
 * - Easier testing and debugging
 * - Clear separation of concerns
 * - Improved team collaboration
 * - Reduced file size and complexity
 * 
 * Available Services:
 * - auth.service: User authentication and authorization
 * - message.service: Message operations (CRUD, recall, read status)
 * - conversation.service: Direct message and conversation management
 * - room.service: Room/group chat management
 * - event.service: Event creation and management
 * - vote.service: Voting system functionality
 * - friend.service: Friend system and requests
 * - user.service: User settings and utility functions
 * - block.service: User blocking and unblocking functionality
 */
