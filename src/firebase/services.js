/**
 * Firebase Services - Main Export File
 * 
 * This file serves as the main entry point for all Firebase services.
 * It maintains backward compatibility by re-exporting functions from
 * modular service files.
 * 
 * Architecture: Modular Services Pattern
 * - Each service category has its own file (auth, message, room, etc.)
 * - This file re-exports everything for seamless migration
 * - No breaking changes for existing imports
 * 
 * Last Refactored: August 2025
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { 
  uploadFile, 
  uploadImage, 
  uploadVoiceRecording, 
  captureAndUploadPhoto, 
  shareLocation, 
  deleteFile, 
  getFileCategory, 
  formatFileSize 
} from '../supabase/storage';

// Re-export authentication services for backward compatibility
export { registerWithEmailAndPassword, loginWithEmailAndPassword, logoutUser } from './services/auth.service';

// Re-export message services for backward compatibility
export { deleteMessage, recallMessage, canRecallMessage, markMessageAsRead } from './services/message.service';

// Re-export conversation services for backward compatibility
export { 
  createOrUpdateConversation, 
  updateConversationLastMessage, 
  updateRoomLastMessage, 
  deleteConversation, 
  togglePinChat 
} from './services/conversation.service';

// Re-export room services for backward compatibility
export { 
  leaveRoom, 
  transferRoomAdmin, 
  updateRoomAvatar, 
  dissolveRoom 
} from './services/room.service';

// Re-export event services for backward compatibility
export { 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  extractEventTitle 
} from './services/event.service';

// Re-export vote services for backward compatibility
export { 
  createVote, 
  castVote, 
  deleteVote 
} from './services/vote.service';

// Re-export friend services for backward compatibility
export { 
  sendFriendRequest, 
  cancelFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest, 
  removeFriendship, 
  areUsersFriends, 
  getPendingFriendRequest 
} from './services/friend.service';

// Re-export user services for backward compatibility
export { 
  generateKeywords, 
  updateUserSettings, 
  updateLastSeen, 
  setTypingStatus 
} from './services/user.service';

export const addDocument = (collectionName, data) => {
  const docRef = collection(db, collectionName);

  addDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// ==============================
// File Upload Services - Now using Supabase Storage
// ==============================

// Re-export Supabase storage functions for backward compatibility
export { 
  uploadFile, 
  uploadImage, 
  uploadVoiceRecording, 
  captureAndUploadPhoto, 
  shareLocation, 
  deleteFile, 
  getFileCategory, 
  formatFileSize 
};
