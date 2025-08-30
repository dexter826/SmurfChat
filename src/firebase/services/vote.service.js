import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';

// Vote management services

// Create a new vote
export const createVote = async (voteData) => {
  try {
    const docRef = await addDoc(collection(db, 'votes'), {
      ...voteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      votes: {}, // Object to store user votes: { userId: optionIndex }
      voteCounts: voteData.options.map(() => 0), // Array of vote counts for each option
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating vote:', error);
    throw error;
  }
};

// Cast a vote or change existing vote
export const castVote = async (voteId, userId, optionIndex) => {
  const voteRef = doc(db, 'votes', voteId);

  try {
    // Get current vote data
    const voteDoc = await getDoc(voteRef);
    if (!voteDoc.exists()) {
      throw new Error('Vote not found');
    }

    const voteData = voteDoc.data();
    const currentVotes = voteData.votes || {};
    const currentCounts = [...(voteData.voteCounts || [])];

    // Remove previous vote if exists
    if (currentVotes[userId] !== undefined) {
      const previousOption = currentVotes[userId];
      currentCounts[previousOption] = Math.max(0, currentCounts[previousOption] - 1);
    }

    // Add new vote
    currentVotes[userId] = optionIndex;
    currentCounts[optionIndex] = (currentCounts[optionIndex] || 0) + 1;

    await updateDoc(voteRef, {
      votes: currentVotes,
      voteCounts: currentCounts,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error casting vote:', error);
    throw error;
  }
};

// Delete vote (hard delete)
export const deleteVote = async (voteId) => {
  const voteRef = doc(db, 'votes', voteId);

  try {
    await deleteDoc(voteRef);
  } catch (error) {
    console.error('Error deleting vote:', error);
    throw error;
  }
};
