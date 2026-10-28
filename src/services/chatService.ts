import {
  ref,
  push,
  set,
  get,
  update,
  onValue,
  onDisconnect,
  serverTimestamp,
  DatabaseReference,
} from 'firebase/database';
import { db } from './firebase';
import { User, Conversation, Message } from '../types';

export const getChatId = (uid1: string, uid2: string): string => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};


export const setupPresence = (uid: string) => {
  const userStatusRef = ref(db, `users/${uid}/isOnline`);
  const userStatusTextRef = ref(db, `users/${uid}/statusText`);
  const userLastSeenRef = ref(db, `users/${uid}/lastSeen`);
  const connectedRef = ref(db, '.info/connected');

  const unsubscribe = onValue(connectedRef, snapshot => {
    if (snapshot.val() === true) {
      onDisconnect(userStatusRef).set(false);
      onDisconnect(userStatusTextRef).set('Ngoại tuyến');
      onDisconnect(userLastSeenRef).set(serverTimestamp());

      set(userStatusRef, true);
      set(userStatusTextRef, 'Trực tuyến');
    }
  });

  return unsubscribe;
};

export const listenUsers = (
  currentUid: string,
  callback: (users: User[]) => void
) => {
  const usersRef = ref(db, 'users');

  const unsubscribe = onValue(usersRef, snapshot => {
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
          });
        }
      });
    }
    callback(users);
  });

  return unsubscribe;
};

export const listenUserStatus = (
  uid: string,
  callback: (user: Partial<User>) => void
) => {
  const userRef = ref(db, `users/${uid}`);
  const unsubscribe = onValue(userRef, snapshot => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      callback({
        id: uid,
        name: val.name,
        isOnline: !!val.isOnline,
        statusText: val.isOnline ? 'Trực tuyến' : 'Ngoại tuyến',
        avatar: val.avatar,
      });
    }
  });
  return unsubscribe;
};


export const listenConversations = (
  currentUid: string,
  callback: (conversations: Conversation[]) => void
) => {
  const chatsRef = ref(db, `userChats/${currentUid}`);

  const unsubscribe = onValue(chatsRef, snapshot => {
    const list: Conversation[] = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const data = child.val();
        if (!data) return;

        const otherUserId = data.user?.id || (child.key as string);
        const resolvedUser: User = {
          id: otherUserId,
          name: data.user?.name || 'Người dùng',
          email: data.user?.email || '',
          avatar:
            data.user?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              data.user?.name || 'User'
            )}&background=4F46E5&color=fff&size=128`,
          isOnline: !!data.user?.isOnline,
          statusText: data.user?.statusText || 'Trực tuyến',
          phone: data.user?.phone,
        };

        list.push({
          id: data.id || (child.key as string),
          user: resolvedUser,
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime || '',
          unreadCount: data.unreadCount || 0,
          messages: [],
          updatedAt: data.updatedAt || 0,
        });
      });
    }
    
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(list);
  });

  return unsubscribe;
};

export const listenMessages = (
  chatId: string,
  currentUid: string,
  callback: (messages: Message[]) => void
) => {
  const messagesRef = ref(db, `chats/${chatId}/messages`);

  const unsubscribe = onValue(messagesRef, snapshot => {
    const msgs: Message[] = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const val = child.val();
        msgs.push({
          id: child.key as string,
          senderId: val.senderId,
          text: val.text,
          timestamp: val.timestamp,
          isMe: val.senderId === currentUid,
          type: val.type || 'text',
          location: val.location,
        });
      });
    }
    callback(msgs);
  });

  return unsubscribe;
};

export const cleanUserForFirebase = (user: Partial<User>) => ({
  id: user.id || '',
  name: user.name || 'Người dùng',
  email: user.email || '',
  avatar:
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.name || 'User'
    )}&background=4F46E5&color=fff&size=128`,
  isOnline: !!user.isOnline,
  statusText: user.statusText || (user.isOnline ? 'Trực tuyến' : 'Ngoại tuyến'),
});

export const sendMessage = async ({
  sender,
  recipient,
  text,
  type = 'text',
  location,
}: {
  sender: User;
  recipient: User;
  text: string;
  type?: 'text' | 'location';
  location?: { latitude: number; longitude: number };
}) => {
  const chatId = getChatId(sender.id, recipient.id);

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  const messageText =
    type === 'location'
      ? `📍 Tọa độ: ${location?.latitude.toFixed(5)}, ${location?.longitude.toFixed(5)}`
      : text.trim();

  const newMsgRef = push(ref(db, `chats/${chatId}/messages`));
  const newMsgKey = newMsgRef.key;

  const msgPayload = {
    id: newMsgKey,
    senderId: sender.id,
    senderName: sender.name || 'Người dùng',
    text: messageText,
    type,
    location:
      type === 'location' && location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : null,
    timestamp: timeStr,
    createdAt: Date.now(),
  };

  
  await set(newMsgRef, msgPayload);

  
  const senderChatRef = ref(db, `userChats/${sender.id}/${recipient.id}`);
  await set(senderChatRef, {
    id: chatId,
    user: cleanUserForFirebase(recipient),
    lastMessage: messageText,
    lastMessageTime: timeStr,
    unreadCount: 0,
    updatedAt: Date.now(),
  });

  
  const recipientChatRef = ref(db, `userChats/${recipient.id}/${sender.id}`);
  const recipientSnap = await get(recipientChatRef);
  const currentUnread = recipientSnap.exists()
    ? recipientSnap.val().unreadCount || 0
    : 0;

  await set(recipientChatRef, {
    id: chatId,
    user: cleanUserForFirebase(sender),
    lastMessage: messageText,
    lastMessageTime: timeStr,
    unreadCount: currentUnread + 1,
    updatedAt: Date.now(),
  });
};

export const markConversationAsRead = async (
  currentUid: string,
  otherUid: string
) => {
  try {
    const chatRef = ref(db, `userChats/${currentUid}/${otherUid}/unreadCount`);
    await set(chatRef, 0);
  } catch (err) {
    console.warn('Error marking conversation as read:', err);
  }
};
