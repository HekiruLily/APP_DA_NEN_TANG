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

/**
 * Đặt trạng thái phòng chat đang mở của người dùng
 * Sử dụng onDisconnect để tự xoá khi app tắt đột ngột
 */
export const setActiveChat = async (uid: string, convId: string | null) => {
  if (!uid) return;
  const activeRef = ref(db, `activeChat/${uid}`);
  if (convId) {
    onDisconnect(activeRef).remove();
    await set(activeRef, convId);
  } else {
    await set(activeRef, null);
  }
};

/**
 * Kiểm tra xem người dùng có đang mở phòng chat convId không
 */
export const isUserInActiveChat = async (uid: string, convId: string): Promise<boolean> => {
  try {
    const snap = await get(ref(db, `activeChat/${uid}`));
    return snap.exists() && snap.val() === convId;
  } catch (e) {
    return false;
  }
};

/**
 * Lắng nghe danh sách thông báo của người dùng theo thời gian thực
 */
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
  });

  return unsubscribe;
};

/**
 * Đánh dấu một thông báo là đã đọc
 */
export const markNotificationAsRead = async (uid: string, notifId: string) => {
  if (!uid || !notifId) return;
  try {
    const notifItemRef = ref(db, `notifications/${uid}/${notifId}/read`);
    await set(notifItemRef, true);
  } catch (err) {
    console.warn('Error marking notification as read:', err);
  }
};

/**
 * Đánh dấu TẤT CẢ thông báo là đã đọc
 */
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
