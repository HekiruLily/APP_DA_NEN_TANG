import {
  ref,
  push,
  set,
  get,
  update,
  onValue,
  onDisconnect,
} from 'firebase/database';
import { db } from './firebase';
import { AppNotification } from '../types';


export const setActiveChat = async (uid: string, convId: string | null) => {
  if (!uid) return;
  try {
    const activeRef = ref(db, `activeChat/${uid}`);
    if (convId) {
      onDisconnect(activeRef).remove();
      await set(activeRef, convId);
    } else {
      await set(activeRef, null);
    }
  } catch (err) {
    // Ignore activeChat error
  }
};


export const isUserInActiveChat = async (uid: string, convId: string): Promise<boolean> => {
  try {
    const snap = await get(ref(db, `activeChat/${uid}`));
    return snap.exists() && snap.val() === convId;
  } catch (e) {
    return false;
  }
};


export const listenNotifications = (
  uid: string,
  callback: (notifications: AppNotification[]) => void
) => {
  const notifRef = ref(db, `notifications/${uid}`);

  const unsubscribe = onValue(notifRef, snapshot => {
    const list: AppNotification[] = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const val = child.val();
        list.push({
          id: child.key as string,
          convId: val.convId || '',
          fromUid: val.fromUid || '',
          fromName: val.fromName || '',
          text: val.text || '',
          createdAt: val.createdAt || 0,
          read: !!val.read,
          type: val.type || 'new_message',
          timestamp: val.createdAt
            ? new Date(val.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
        });
      });
    }

    // Sắp xếp thông báo mới nhất lên đầu
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  },
  error => {
    console.warn('listenNotifications error:', error.message);
    callback([]);
  });

  return unsubscribe;
};

export const markNotificationAsRead = async (uid: string, notifId: string) => {
  if (!uid || !notifId) return;
  try {
    const notifItemRef = ref(db, `notifications/${uid}/${notifId}/read`);
    await set(notifItemRef, true);
  } catch (err) {
    console.warn('Error marking notification as read:', err);
  }
};

export const markAllNotificationsAsRead = async (
  uid: string,
  notifications: AppNotification[]
) => {
  if (!uid || notifications.length === 0) return;
  const updates: Record<string, any> = {};
  notifications.forEach(n => {
    if (!n.read) {
      updates[`notifications/${uid}/${n.id}/read`] = true;
    }
  });

  if (Object.keys(updates).length > 0) {
    try {
      await update(ref(db), updates);
    } catch (err) {
      console.warn('Error marking all notifications as read:', err);
    }
  }
};
