/**
 * Storage Services - Supabase Integration
 * 
 * This service handles file upload operations using Supabase Storage.
 * Separated from main Firebase services for better organization.
 * 
 * Note: This should be migrated to Firebase Storage in the future
 * to eliminate dual database dependencies (Priority 1.1)
 */

// Re-export Supabase storage functions
export { 
  uploadFile, 
  uploadImage, 
  uploadVoiceRecording, 
  captureAndUploadPhoto, 
  shareLocation, 
  deleteFile, 
  getFileCategory, 
  formatFileSize 
} from '../../supabase/storage';
