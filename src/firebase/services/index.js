import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config';

export * from './auth.service';

export {
  getMutualBlockStatus,
  isUserBlockedOptimized,
  batchCheckBlockStatus,
  blockUtils,
  clearBlockCache
} from '../utils/block.utils';

export * from './message.service';

export * from './conversation.service';

export * from './room.service';


export * from './vote.service';

export * from './friend.service';

export * from './user.service';

export * from './block.service';

export * from './storage.service';

export * from './archive.service';

export const addDocument = (collectionName, data) => {
  const docRef = collection(db, collectionName);
  return addDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};
