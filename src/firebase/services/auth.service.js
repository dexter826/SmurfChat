import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config';
import { generateKeywords } from '../utils/keywords';
import { handleFirebaseError, logSuccess, validateRequired, validateEmail, validateLength } from '../utils/error.utils';

// Dịch vụ xác thực
export const registerWithEmailAndPassword = async (email, password, displayName) => {
  try {
    // Xác thực
    validateRequired(email, 'Email');
    validateRequired(password, 'Mật khẩu');
    validateRequired(displayName, 'Tên hiển thị');
    validateEmail(email);
    validateLength(displayName, 2, 50, 'Tên hiển thị');

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Cập nhật hồ sơ người dùng với tên hiển thị
    await updateProfile(user, {
      displayName: displayName
    });

    // Tạo tài liệu người dùng trong Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      displayName: displayName,
      email: user.email,
      photoURL: user.photoURL || null,
      uid: user.uid,
      providerId: 'password',
      keywords: [
        ...generateKeywords(displayName?.toLowerCase()),
        ...generateKeywords(user.email?.toLowerCase()),
      ],
      createdAt: serverTimestamp(),
    });

    // Gửi xác minh email
    try {
      await sendEmailVerification(user);
    } catch (verificationError) {
      console.error('Lỗi gửi xác minh email:', verificationError);
      // Tiếp tục dù sao, vì tài khoản người dùng đã được tạo
    }

    logSuccess('registerWithEmailAndPassword', { uid: user.uid, email: user.email });
    return { user, error: null };
  } catch (error) {
    const handledError = handleFirebaseError(error, 'registerWithEmailAndPassword');
    return { user: null, error: handledError.message };
  }
};

export const loginWithEmailAndPassword = async (email, password) => {
  try {
    // Xác thực
    validateRequired(email, 'Email');
    validateRequired(password, 'Mật khẩu');
    validateEmail(email);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Kiểm tra xem email có được xác minh không
    if (!userCredential.user.emailVerified) {
      return { user: null, error: 'Email chưa được xác nhận. Vui lòng kiểm tra email và xác nhận trước khi đăng nhập.' };
    }

    logSuccess('loginWithEmailAndPassword', { uid: userCredential.user.uid });
    return { user: userCredential.user, error: null };
  } catch (error) {
    const handledError = handleFirebaseError(error, 'loginWithEmailAndPassword');
    return { user: null, error: handledError.message };
  }
};

export const logoutUser = async () => {
  try {
    // Xóa tất cả trình nghe Firestore trước khi đăng xuất
    try {
      const listenerManager = (await import('../utils/listener.manager')).default;
      listenerManager.cleanupAll();
    } catch (listenerError) {
      console.warn('Không thể xóa trình nghe:', listenerError);
    }

    await signOut(auth);

    logSuccess('logoutUser', { timestamp: new Date().toISOString() });
    return { error: null };
  } catch (error) {
    const handledError = handleFirebaseError(error, 'logoutUser');
    return { error: handledError.message };
  }
};

export const resetPassword = async (email) => {
  try {
    validateRequired(email, 'Email');
    validateEmail(email);

    await sendPasswordResetEmail(auth, email);

    logSuccess('resetPassword', { email });
    return { error: null };
  } catch (error) {
    const handledError = handleFirebaseError(error, 'resetPassword');
    return { error: handledError.message };
  }
};
