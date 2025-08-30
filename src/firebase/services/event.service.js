import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';

// Event management services

// Create a new event
export const createEvent = async (eventData) => {
  try {
    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
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
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

// Delete event (hard delete)
export const deleteEvent = async (eventId) => {
  const eventRef = doc(db, 'events', eventId);

  try {
    await deleteDoc(eventRef);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
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
