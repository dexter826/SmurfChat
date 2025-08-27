import { collection, addDoc, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';

export const addDocument = (collectionName, data) => {
  const docRef = collection(db, collectionName);

  addDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// Create or update conversation
export const createOrUpdateConversation = async (conversationData) => {
  const { id, ...data } = conversationData;
  const conversationRef = doc(db, 'conversations', id);
  
  try {
    await setDoc(conversationRef, {
      ...data,
      id,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  } catch (error) {
    console.error('Error creating/updating conversation:', error);
    throw error;
  }
};

// Update conversation last message
export const updateConversationLastMessage = async (conversationId, message, userId) => {
  const conversationRef = doc(db, 'conversations', conversationId);
  
  try {
    await updateDoc(conversationRef, {
      lastMessage: message,
      lastMessageAt: serverTimestamp(),
      updatedBy: userId,
    });
  } catch (error) {
    console.error('Error updating conversation last message:', error);
    throw error;
  }
};

// tao keywords cho displayName, su dung cho search
export const generateKeywords = (displayName) => {
  // liet ke tat cac hoan vi. vd: name = ["David", "Van", "Teo"]
  // => ["David", "Van", "Teo"], ["David", "Teo", "Van"], ["Teo", "David", "Van"],...
  const name = displayName.split(' ').filter((word) => word);

  const length = name.length;
  let flagArray = [];
  let result = [];
  let stringArray = [];

  /**
   * khoi tao mang flag false
   * dung de danh dau xem gia tri
   * tai vi tri nay da duoc su dung
   * hay chua
   **/
  for (let i = 0; i < length; i++) {
    flagArray[i] = false;
  }

  const createKeywords = (name) => {
    const arrName = [];
    let curName = '';
    name.split('').forEach((letter) => {
      curName += letter;
      arrName.push(curName);
    });
    return arrName;
  };

  function findPermutation(k) {
    for (let i = 0; i < length; i++) {
      if (!flagArray[i]) {
        flagArray[i] = true;
        result[k] = name[i];

        if (k === length - 1) {
          stringArray.push(result.join(' '));
        }

        findPermutation(k + 1);
        flagArray[i] = false;
      }
    }
  }

  findPermutation(0);

  const keywords = stringArray.reduce((acc, cur) => {
    const words = createKeywords(cur);
    return [...acc, ...words];
  }, []);

  return keywords;
};
