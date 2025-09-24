export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  VOICE: 'voice',
  LOCATION: 'location',
  SYSTEM: 'system'
};

export const CHAT_TYPES = {
  ROOM: 'room',
  DIRECT: 'direct'
};

export const MESSAGE_STATUS = {
  SENT: 'sent',
  RECALLED: 'recalled'
};

export const ENCRYPTION_STATUS = {
  DISABLED: false,
  ENABLED: true
};

export const UNIFIED_MESSAGE_SCHEMA = {
  id: "string",
  text: "string",
  encryptedText: "string|null",
  uid: "string",
  displayName: "string",
  photoURL: "string|null",
  chatType: "string",
  chatId: "string",
  messageType: "string",
  status: "string",
  isEncrypted: "boolean",
  contentHash: "string|null",
  fileData: "object|null",
  encryptedFileData: "string|null",
  locationData: "object|null",
  encryptedLocationData: "string|null",
  readByDetails: "object",
  recalled: "boolean",
  recalledAt: "timestamp|null",
  originalText: "string|null",
  originalFileData: "object|null",
  originalLocationData: "object|null",
  createdAt: "timestamp",
  updatedAt: "timestamp|null"
};

export const isMessageEncrypted = (message) => {
  return message && message.isEncrypted === true;
};

export const getMessageText = (message) => {
  if (!message) return null;
  return isMessageEncrypted(message) ? message.encryptedText : message.text;
};

export const getMessageFileData = (message) => {
  if (!message) return null;
  return isMessageEncrypted(message) ? message.encryptedFileData : message.fileData;
};

export const getMessageLocationData = (message) => {
  if (!message) return null;
  return isMessageEncrypted(message) ? message.encryptedLocationData : message.locationData;
};
