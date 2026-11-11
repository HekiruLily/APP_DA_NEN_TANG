import {
  ref,
  push,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  serverTimestamp,
  increment,
  query,
  orderByChild,
  limitToLast,
  endBefore,
} from 'firebase/database';
import { db } from './firebase';
import { User, Conversation, Message, QuotedMessage } from '../types';


export const getChatId = (uid1: string, uid2: string): string => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};


export const formatMessageTime = (timestamp?: number): string => {
  const d = timestamp ? new Date(timestamp) : new Date();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatLastSeen = (lastSeen?: number): string => {
  if (!lastSeen) return 'Ngoại tuyến';
  const now = Date.now();
  const diffMs = now - lastSeen;
  if (diffMs < 0 || diffMs < 60 * 1000) {
    return 'Hoạt động vừa xong';
  }
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `Hoạt động ${diffMinutes} phút trước`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Hoạt động ${diffHours} giờ trước`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return `Hoạt động ${diffDays} ngày trước`;
  }
  const d = new Date(lastSeen);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `Hoạt động ngày ${day}/${month}`;
};


export const setupPresence = (uid: string) => {
  const userStatusRef = ref(db, `users/${uid}/isOnline`);
  const userStatusTextRef = ref(db, `users/${uid}/statusText`);
  const userLastSeenRef = ref(db, `users/${uid}/lastSeen`);
  const connectedRef = ref(db, '.info/connected');

  const unsubscribe = onValue(
    connectedRef,
    snapshot => {
      if (snapshot.val() === true) {
        onDisconnect(userStatusRef).set(false);
        onDisconnect(userStatusTextRef).set('Ngoại tuyến');
        onDisconnect(userLastSeenRef).set(serverTimestamp());

        set(userStatusRef, true);
        set(userStatusTextRef, 'Trực tuyến');
      }
    },
    error => {
      console.warn('setupPresence connected error:', error.message);
    }
  );

  return unsubscribe;
};


export const listenUsers = (
  currentUid: string,
  callback: (users: User[]) => void
) => {
  const usersRef = ref(db, 'users');

  const unsubscribe = onValue(
    usersRef,
    snapshot => {
      const users: User[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const u = child.val();
          if (child.key !== currentUid) {
            users.push({
              id: child.key as string,
              name: u.name || 'Người dùng',
              email: u.email || '',
              avatar:
                u.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  u.name || 'User'
                )}&background=4F46E5&color=fff&size=128`,
              isOnline: !!u.isOnline,
              statusText: u.isOnline ? 'Trực tuyến' : 'Ngoại tuyến',
              phone: u.phone,
              lastSeen: typeof u.lastSeen === 'number' ? u.lastSeen : undefined,
            });
          }
        });
      }
      callback(users);
    },
    error => {
      console.warn('listenUsers error:', error.message);
      callback([]);
    }
  );

  return unsubscribe;
};


export const listenUserStatus = (
  uid: string,
  callback: (user: Partial<User>) => void
) => {
  const userRef = ref(db, `users/${uid}`);
  const unsubscribe = onValue(
    userRef,
    snapshot => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        callback({
          id: uid,
          name: val.name,
          isOnline: !!val.isOnline,
          statusText: val.isOnline ? 'Trực tuyến' : 'Ngoại tuyến',
          avatar: val.avatar,
          lastSeen: typeof val.lastSeen === 'number' ? val.lastSeen : undefined,
        });
      }
    },
    error => {
      console.warn('listenUserStatus error:', error.message);
    }
  );
  return unsubscribe;
};

export const ensureConversation = async (
  convId: string,
  currentUid: string,
  otherUid?: string,
  otherUser?: Partial<User>
) => {
  try {
    const convRef = ref(db, `conversations/${convId}`);
    const snap = await get(convRef);
    if (!snap.exists()) {
      const membersMap: Record<string, boolean> = {
        [currentUid]: true,
      };
      if (otherUid) {
        membersMap[otherUid] = true;
      }

      await set(convRef, {
        type: 'direct',
        name: otherUser?.name || 'Direct Chat',
        members: membersMap,
        createdBy: currentUid,
        createdAt: Date.now(),
        lastMessage: '',
        updatedAt: Date.now(),
      });
    }
  } catch (err: any) {
    console.warn('ensureConversation error:', err?.message || err);
  }
};

export const getConversationDetails = async (convId: string) => {
  try {
    const snap = await get(ref(db, `conversations/${convId}`));
    if (snap.exists()) {
      return snap.val();
    }
    return null;
  } catch (err: any) {
    console.warn('getConversationDetails error:', err?.message || err);
    return null;
  }
};

export const sendMessage = async ({
  convId,
  sender,
  recipient,
  text,
  type = 'text',
  location,
  imageUrl,
  replyTo,
}: {
  convId: string;
  sender: User;
  recipient?: User;
  text?: string;
  type?: 'text' | 'image' | 'location';
  location?: { latitude: number; longitude: number };
  imageUrl?: string;
  replyTo?: QuotedMessage;
}) => {
  const now = Date.now();
  const timeStr = formatMessageTime(now);

  let messageText = '';
  let lastMessageSummary = '';

  if (type === 'image') {
    messageText = '';
    lastMessageSummary = '📷 Hình ảnh';
  } else if (type === 'location' && location) {
    messageText = `📍 Tọa độ: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
    lastMessageSummary = '📍 Vị trí';
  } else {
    messageText = (text || '').trim();
    lastMessageSummary = messageText;
  }

  // Lấy thông tin cuộc trò chuyện để biết danh sách thành viên và tên nhóm
  let convData = await getConversationDetails(convId);
  const isGroupId = convId.startsWith('-');

  if (!convData && !isGroupId) {
    await ensureConversation(convId, sender.id, recipient?.id, recipient);
    convData = await getConversationDetails(convId);
  }

  const isGroup = isGroupId || convData?.type === 'group';
  const groupName = convData?.name || 'Nhóm';
  const membersMap: Record<string, boolean> = convData?.members || {
    [sender.id]: true,
    ...(recipient ? { [recipient.id]: true } : {}),
  };
  const memberUids = Object.keys(membersMap);

  // Tạo khóa tin nhắn mới
  const newMsgRef = push(ref(db, `messages/${convId}`));
  const newMsgKey = newMsgRef.key as string;

  const msgPayload = {
    senderId: sender.id,
    senderName: sender.name || 'Người dùng',
    type,
    text: messageText,
    imageUrl: imageUrl || null,
    lat: location?.latitude ?? null,
    lng: location?.longitude ?? null,
    createdAt: now,
    recalled: false,
    timestamp: timeStr,
    reactions: null,
    replyTo: replyTo || null,
  };

  // Multi-path update trong MỘT LỆNH duy nhất
  const updates: Record<string, any> = {};

  // 1. Thêm tin nhắn vào messages/{convId}/{msgId}
  updates[`messages/${convId}/${newMsgKey}`] = msgPayload;

  // 2. Cập nhật conversations/{convId}
  updates[`conversations/${convId}/lastMessage`] = lastMessageSummary;
  updates[`conversations/${convId}/lastSenderId`] = sender.id;
  updates[`conversations/${convId}/updatedAt`] = now;

  // 3. Cập nhật userChats của người gửi (unread = 0)
  updates[`userChats/${sender.id}/${convId}/lastMessage`] = lastMessageSummary;
  updates[`userChats/${sender.id}/${convId}/lastSenderId`] = sender.id;
  updates[`userChats/${sender.id}/${convId}/updatedAt`] = now;
  updates[`userChats/${sender.id}/${convId}/unread`] = 0;
  if (isGroup) {
    updates[`userChats/${sender.id}/${convId}/type`] = 'group';
    updates[`userChats/${sender.id}/${convId}/name`] = groupName;
  } else if (recipient) {
    updates[`userChats/${sender.id}/${convId}/type`] = 'direct';
    updates[`userChats/${sender.id}/${convId}/otherUser`] = {
      id: recipient.id,
      name: recipient.name || 'Người dùng',
      avatar: recipient.avatar || '',
    };
  }

  // 4. Cập nhật userChats và ghi thông báo cho tất cả các thành viên khác
  for (const mUid of memberUids) {
    if (mUid === sender.id) continue;

    updates[`userChats/${mUid}/${convId}/lastMessage`] = lastMessageSummary;
    updates[`userChats/${mUid}/${convId}/lastSenderId`] = sender.id;
    updates[`userChats/${mUid}/${convId}/updatedAt`] = now;
    updates[`userChats/${mUid}/${convId}/unread`] = increment(1);

    if (isGroup) {
      updates[`userChats/${mUid}/${convId}/type`] = 'group';
      updates[`userChats/${mUid}/${convId}/name`] = groupName;
    } else {
      updates[`userChats/${mUid}/${convId}/type`] = 'direct';
      updates[`userChats/${mUid}/${convId}/otherUser`] = {
        id: sender.id,
        name: sender.name || 'Người dùng',
        avatar: sender.avatar || '',
      };
    }

    // Kiểm tra xem người dùng có đang ở trong cuộc trò chuyện đó không
    try {
      const activeSnap = await get(ref(db, `activeChat/${mUid}`));
      const isCurrentlyInChat = activeSnap.exists() && activeSnap.val() === convId;

      // Nếu không ở trong cuộc trò chuyện -> Ghi thông báo vào notifications/{mUid}
      if (!isCurrentlyInChat) {
        const notifKey = push(ref(db, `notifications/${mUid}`)).key as string;
        const notifText = isGroup
          ? `[${groupName}] ${sender.name || 'Người dùng'}: ${lastMessageSummary}`
          : `${sender.name || 'Người dùng'}: ${lastMessageSummary}`;

        updates[`notifications/${mUid}/${notifKey}`] = {
          type: 'new_message',
          convId,
          fromUid: sender.id,
          fromName: sender.name || 'Người dùng',
          text: notifText,
          createdAt: now,
          read: false,
        };
      }
    } catch (e) {
      // Bỏ qua lỗi activeChat nếu có
    }
  }

  await update(ref(db), updates);
};


export const recallMessage = async ({
  convId,
  messageId,
  currentUid,
  isLastMessage,
}: {
  convId: string;
  messageId: string;
  currentUid: string;
  isLastMessage?: boolean;
}) => {
  const updates: Record<string, any> = {};
  updates[`messages/${convId}/${messageId}/recalled`] = true;

  if (isLastMessage) {
    const recalledText = 'Tin nhắn đã được thu hồi';
    updates[`conversations/${convId}/lastMessage`] = recalledText;

    const convData = await getConversationDetails(convId);
    const membersMap: Record<string, boolean> = convData?.members || { [currentUid]: true };
    const memberUids = Object.keys(membersMap);

    memberUids.forEach(mUid => {
      updates[`userChats/${mUid}/${convId}/lastMessage`] = recalledText;
    });
  }

  await update(ref(db), updates);
};


export const toggleReaction = async ({
  convId,
  messageId,
  uid,
  userName,
  targetSenderId,
  emoji,
  currentReaction,
}: {
  convId: string;
  messageId: string;
  uid: string;
  userName?: string;
  targetSenderId?: string;
  emoji: string;
  currentReaction?: string;
}) => {
  const updates: Record<string, any> = {};

  if (currentReaction === emoji) {
    // Nhấn lại emoji đang chọn -> hủy
    updates[`messages/${convId}/${messageId}/reactions/${uid}`] = null;
  } else {
    // Thả emoji mới
    updates[`messages/${convId}/${messageId}/reactions/${uid}`] = emoji;

    // Ghi thông báo cho người nhận (nếu không phải tự thả tin của mình)
    if (targetSenderId && targetSenderId !== uid && targetSenderId !== 'system') {
      const notifKey = push(ref(db, `notifications/${targetSenderId}`)).key as string;
      updates[`notifications/${targetSenderId}/${notifKey}`] = {
        type: 'reaction',
        convId,
        fromUid: uid,
        fromName: userName || 'Người dùng',
        text: `${userName || 'Một người dùng'} đã thả cảm xúc ${emoji} vào tin nhắn của bạn`,
        createdAt: Date.now(),
        read: false,
      };
    }
  }

  await update(ref(db), updates);
};


export const setTypingStatus = async (
  convId: string,
  uid: string,
  isTyping: boolean
) => {
  if (!convId || !uid) return;
  try {
    const typingRef = ref(db, `typing/${convId}/${uid}`);
    if (isTyping) {
      onDisconnect(typingRef).remove();
      await set(typingRef, true);
    } else {
      await set(typingRef, null);
    }
  } catch (err) {
    // Ignore typing error to prevent unhandled rejection
  }
};


export const listenTyping = (
  convId: string,
  currentUid: string,
  callback: (typingUids: string[]) => void
) => {
  const typingRef = ref(db, `typing/${convId}`);
  const unsubscribe = onValue(
    typingRef,
    snapshot => {
      const list: string[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          if (child.key !== currentUid && child.val() === true) {
            list.push(child.key as string);
          }
        });
      }
      callback(list);
    },
    error => {
      console.warn('listenTyping error:', error.message);
      callback([]);
    }
  );
  return unsubscribe;
};

export const updateReadStatus = async (convId: string, uid: string) => {
  if (!convId || !uid) return;
  // Chặn các convId không hợp lệ (ví dụ push ID bị nối với uid '-P..._uid')
  if (convId.startsWith('-') && convId.includes('_')) return;
  const now = Date.now();
  const updates: Record<string, any> = {};
  updates[`readStatus/${convId}/${uid}`] = now;
  updates[`userChats/${uid}/${convId}/unread`] = 0;
  try {
    await update(ref(db), updates);
  } catch (err) {
    console.warn('Update read status error:', err);
  }
};


export const listenReadStatus = (
  convId: string,
  otherUid: string,
  callback: (lastReadTimestamp: number | null) => void
) => {
  const readRef = ref(db, `readStatus/${convId}/${otherUid}`);
  const unsubscribe = onValue(
    readRef,
    snapshot => {
      if (snapshot.exists()) {
        callback(Number(snapshot.val()));
      } else {
        callback(null);
      }
    },
    error => {
      console.warn('listenReadStatus error:', error.message);
      callback(null);
    }
  );
  return unsubscribe;
};

const parseMessageSnapshot = (
  key: string,
  val: any,
  currentUid: string
): Message => {
  return {
    id: key,
    senderId: val.senderId || '',
    senderName: val.senderName || '',
    text: val.recalled ? 'Tin nhắn đã được thu hồi' : val.text || '',
    timestamp: val.timestamp || formatMessageTime(val.createdAt),
    createdAt: val.createdAt || 0,
    isMe: val.senderId === currentUid,
    type: val.type || 'text',
    imageUrl: val.imageUrl || undefined,
    lat: val.lat ?? undefined,
    lng: val.lng ?? undefined,
    location:
      val.lat !== undefined && val.lat !== null && val.lng !== undefined && val.lng !== null
        ? { latitude: val.lat, longitude: val.lng }
        : undefined,
    recalled: !!val.recalled,
    reactions: val.reactions || undefined,
    replyTo: val.replyTo || undefined,
  };
};

export const listenMessagesPaginated = (
  convId: string,
  currentUid: string,
  pageSize: number = 20,
  onInitialMessages: (messages: Message[]) => void
) => {
  const messagesQuery = query(
    ref(db, `messages/${convId}`),
    orderByChild('createdAt'),
    limitToLast(pageSize)
  );

  const unsubscribe = onValue(
    messagesQuery,
    snapshot => {
      const list: Message[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          list.push(parseMessageSnapshot(child.key as string, child.val(), currentUid));
        });
      }
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      onInitialMessages(list);
    },
    error => {
      console.warn('listenMessages error:', error.message);
      onInitialMessages([]);
    }
  );

  return unsubscribe;
};


export const loadMoreOlderMessages = async (
  convId: string,
  currentUid: string,
  oldestCreatedAt: number,
  pageSize: number = 20
): Promise<Message[]> => {
  if (!oldestCreatedAt) return [];
  const olderQuery = query(
    ref(db, `messages/${convId}`),
    orderByChild('createdAt'),
    endBefore(oldestCreatedAt),
    limitToLast(pageSize)
  );

  const snapshot = await get(olderQuery);
  const list: Message[] = [];
  if (snapshot.exists()) {
    snapshot.forEach(child => {
      list.push(parseMessageSnapshot(child.key as string, child.val(), currentUid));
    });
  }
  list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return list;
};

export const listenConversations = (
  currentUid: string,
  callback: (conversations: Conversation[]) => void
) => {
  const userChatsRef = ref(db, `userChats/${currentUid}`);

  const unsubscribe = onValue(
    userChatsRef,
    snapshot => {
      const list: Conversation[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const data = child.val();
          if (!data) return;

        const convId = child.key as string;

        // 1. Tự động loại bỏ key lỗi '-P6..._uid' (do lỗi getChatId với ID nhóm trước đây)
        if (convId.startsWith('-') && convId.includes('_')) {
          set(ref(db, `userChats/${currentUid}/${convId}`), null).catch(() => {});
          return;
        }

        // 2. Bỏ qua các node rác chỉ có { unread: 0 } mà không có dữ liệu cuộc trò chuyện
        if (!data.lastMessage && !data.updatedAt && !data.name && !data.otherUser) {
          set(ref(db, `userChats/${currentUid}/${convId}`), null).catch(() => {});
          return;
        }

        const isGroup = data.type === 'group' || (convId.startsWith('-') && !convId.includes('_'));

        if (isGroup) {
          // Chỉ hiển thị nhóm hợp lệ có tên hoặc có tin nhắn
          const groupName = data.name;
          if (!groupName && !data.lastMessage) {
            return;
          }
          const displayGroupName = groupName || 'Nhóm trò chuyện';
          const resolvedGroupUser: User = {
            id: convId,
            name: displayGroupName,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              displayGroupName
            )}&background=6366F1&color=fff&size=128`,
            isOnline: false,
          };

          list.push({
            id: convId,
            type: 'group',
            name: displayGroupName,
            user: resolvedGroupUser,
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.updatedAt ? formatMessageTime(data.updatedAt) : '',
            lastSenderId: data.lastSenderId,
            unreadCount: data.unread || 0,
            messages: [],
            updatedAt: data.updatedAt || 0,
          });
        } else {
          // DIRECT CHAT
          // Kiểm tra nếu key là dạng bare UID (không có '_' và không bắt đầu bằng '-')
          const isBareUid = !convId.includes('_') && !convId.startsWith('-');
          const actualConvId = isBareUid ? getChatId(currentUid, convId) : convId;

          // Nếu đã tồn tại key chuẩn compound convId trong snapshot thì bỏ qua key bare UID trùng lặp này
          if (isBareUid && snapshot.hasChild(actualConvId)) {
            return;
          }

          const otherData = data.otherUser || {};
          const otherUserId = otherData.id || (isBareUid ? convId : convId.replace(currentUid, '').replace('_', ''));

          const resolvedUser: User = {
            id: otherUserId,
            name: otherData.name || 'Người dùng',
            avatar:
              otherData.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                otherData.name || 'User'
              )}&background=4F46E5&color=fff&size=128`,
            isOnline: false,
          };

          list.push({
            id: actualConvId,
            type: 'direct',
            user: resolvedUser,
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.updatedAt ? formatMessageTime(data.updatedAt) : '',
            lastSenderId: data.lastSenderId,
            unreadCount: data.unread || 0,
            messages: [],
            updatedAt: data.updatedAt || 0,
          });
        }
      });
    }

    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(list);
  },
  error => {
    console.warn('listenConversations error:', error.message);
    callback([]);
  });

  return unsubscribe;
};

export const markConversationAsRead = async (
  currentUid: string,
  convId: string
) => {
  try {
    await updateReadStatus(convId, currentUid);
  } catch (err) {
    console.warn('Error marking conversation as read:', err);
  }
};
