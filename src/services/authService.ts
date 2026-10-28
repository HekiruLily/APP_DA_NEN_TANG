import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { ref, set, update, get } from 'firebase/database';
import { auth, db } from './firebase';
import { User } from '../types';

export const getAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email hoặc mật khẩu không chính xác!';
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng cho một tài khoản khác!';
    case 'auth/invalid-email':
      return 'Địa chỉ email không đúng định dạng!';
    case 'auth/weak-password':
      return 'Mật khẩu phải có tối thiểu 6 ký tự!';
    case 'auth/network-request-failed':
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng!';
    case 'auth/too-many-requests':
      return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau!';
    default:
      return error?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại!';
  }
};

export const registerWithEmail = async (
  name: string,
  email: string,
  pass: string
): Promise<User> => {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    trimmedEmail,
    pass
  );
  const fbUser = userCredential.user;

  await updateProfile(fbUser, {
    displayName: trimmedName,
  });

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    trimmedName
  )}&background=4F46E5&color=fff&size=128`;

  const userData: User = {
    id: fbUser.uid,
    name: trimmedName,
    email: trimmedEmail,
    avatar: avatarUrl,
    isOnline: true,
    statusText: 'Trực tuyến',
  };

  
  await set(ref(db, `users/${fbUser.uid}`), {
    ...userData,
    createdAt: Date.now(),
    lastSeen: Date.now(),
  });

  return userData;
};

export const loginWithEmail = async (
  email: string,
  pass: string
): Promise<User> => {
  const trimmedEmail = email.trim().toLowerCase();
  const userCredential = await signInWithEmailAndPassword(
    auth,
    trimmedEmail,
    pass
  );
  const fbUser = userCredential.user;

  
  const userSnapshot = await get(ref(db, `users/${fbUser.uid}`));
  let userData: User;

  if (userSnapshot.exists()) {
    const val = userSnapshot.val();
    userData = {
      id: fbUser.uid,
      name: val.name || fbUser.displayName || 'Người dùng',
      email: val.email || fbUser.email || '',
      avatar:
        val.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          val.name || fbUser.displayName || 'User'
        )}&background=4F46E5&color=fff&size=128`,
      isOnline: true,
      statusText: 'Trực tuyến',
      phone: val.phone,
    };
  } else {
    const displayName = fbUser.displayName || trimmedEmail.split('@')[0];
    userData = {
      id: fbUser.uid,
      name: displayName,
      email: trimmedEmail,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        displayName
      )}&background=4F46E5&color=fff&size=128`,
      isOnline: true,
      statusText: 'Trực tuyến',
    };
    await set(ref(db, `users/${fbUser.uid}`), {
      ...userData,
      createdAt: Date.now(),
    });
  }

  
  await update(ref(db, `users/${fbUser.uid}`), {
    isOnline: true,
    statusText: 'Trực tuyến',
    lastSeen: Date.now(),
  });

  return userData;
};

export const logoutUser = async (): Promise<void> => {
  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    try {
      await update(ref(db, `users/${currentUid}`), {
        isOnline: false,
        statusText: 'Ngoại tuyến',
        lastSeen: Date.now(),
      });
    } catch (e) {
      
    }
  }
  await signOut(auth);
};

export const subscribeToAuthChanges = (
  callback: (user: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};
