import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config';
import { generateKeywords } from '../utils/keywords';

// Authentication services
export const registerWithEmailAndPassword = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: displayName
    });

    // Create user document in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      displayName: displayName,
      email: user.email,
      photoURL: user.photoURL || null,
      uid: user.uid,
      providerId: 'password',
      searchVisibility: 'public',
      keywords: [
        ...generateKeywords(displayName?.toLowerCase()),
        ...generateKeywords(user.email?.toLowerCase()),
      ],
      createdAt: serverTimestamp(),
    });

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const loginWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};
