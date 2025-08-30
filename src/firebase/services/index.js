// Services index file - Re-export all services for backward compatibility
// This ensures existing imports continue to work while we refactor

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
 */
