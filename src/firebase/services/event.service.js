import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import { handleServiceError, logSuccess, validateRequired } from '../utils/error.utils';

// Event management services

// Create a new event
export const createEvent = async (eventData) => {
  try {
    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    logSuccess('createEvent', { eventId: docRef.id });
    return docRef.id;
  } catch (error) {
    const handledError = handleServiceError(error, 'createEvent');
    throw handledError;
  }
};

// Update an existing event
export const updateEvent = async (eventId, eventData) => {
  const eventRef = doc(db, 'events', eventId);

  try {
    await updateDoc(eventRef, {
      ...eventData,
      updatedAt: serverTimestamp(),
    });
    
    logSuccess('updateEvent', { eventId });
  } catch (error) {
    const handledError = handleServiceError(error, 'updateEvent');
    throw handledError;
  }
};

// Delete event (hard delete)
export const deleteEvent = async (eventId) => {
  const eventRef = doc(db, 'events', eventId);

  try {
    await deleteDoc(eventRef);
    
    logSuccess('deleteEvent', { eventId });
  } catch (error) {
    const handledError = handleServiceError(error, 'deleteEvent');
    throw handledError;
  }
};

// Extract event title from message
export const extractEventTitle = (message) => {
  const eventPatterns = [
    /^(.+?)\s+(lúc|vào|tại)\s+/i,
    /^(.+?)\s+(\d{1,2}h)/i,
  ];

  for (const pattern of eventPatterns) {
    const match = pattern.exec(message);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return message.split(' ').slice(0, 5).join(' ');
};
