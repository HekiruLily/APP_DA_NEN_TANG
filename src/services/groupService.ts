import {
  ref,
  push,
  update,
  onValue,
  get,
} from 'firebase/database';
import { db } from './firebase';
import { User, Conversation } from '../types';

/**
 * Tạo nhóm chat mới bằng MỘT LỆNH update() multi-path update:
 * - Ghi node conversations/{convId}
 * - Ghi userChats cho tất cả thành viên (creator unread = 0, members khác unread = 1)
 * - Ghi thông báo "group_added" cho các thành viên được thêm
 */
export const createGroup = async ({
  name,
  creator,
  members,
}: {
  name: string;
  creator: User;
  members: User[];
}): Promise<string> => {
  if (!name.trim()) {
    throw new Error('Vui lòng nhập tên nhóm.');
  }
  if (!members || members.length < 2) {
    throw new Error('Nhóm cần tối thiểu 2 thành viên khác ngoài bạn.');
  }

  const now = Date.now();
  const convRef = push(ref(db, 'conversations'));
  const convId = convRef.key as string;

  // Gom các thành viên
  const membersMap: Record<string, boolean> = {
    [creator.id]: true,
  };
  members.forEach(m => {
    membersMap[m.id] = true;
  });

  const createdMessage = `${creator.name || 'Người dùng'} đã tạo nhóm "${name.trim()}"`;

  const updates: Record<string, any> = {};

  // 1. Ghi thông tin cuộc trò chuyện nhóm
  updates[`conversations/${convId}`] = {
    type: 'group',
    name: name.trim(),
    members: membersMap,
    createdBy: creator.id,
    createdAt: now,
    lastMessage: createdMessage,
    lastSenderId: creator.id,
    updatedAt: now,
  };

  // 2. Ghi tin nhắn hệ thống đầu tiên vào nhóm
  const firstMsgKey = push(ref(db, `messages/${convId}`)).key as string;
  updates[`messages/${convId}/${firstMsgKey}`] = {
    senderId: 'system',
    senderName: 'Hệ thống',
    type: 'text',
    text: createdMessage,
    createdAt: now,
    recalled: false,
    timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  // 3. Cập nhật userChats của người tạo (unread = 0)
  updates[`userChats/${creator.id}/${convId}`] = {
    type: 'group',
    name: name.trim(),
    lastMessage: createdMessage,
    lastSenderId: creator.id,
    updatedAt: now,
    unread: 0,
  };

  // 4. Cập nhật userChats và ghi thông báo cho các thành viên khác
  members.forEach(m => {
    updates[`userChats/${m.id}/${convId}`] = {
      type: 'group',
      name: name.trim(),
      lastMessage: createdMessage,
      lastSenderId: creator.id,
      updatedAt: now,
      unread: 1,
    };

    const notifKey = push(ref(db, `notifications/${m.id}`)).key as string;
    updates[`notifications/${m.id}/${notifKey}`] = {
      type: 'group_added',
      convId,
      fromUid: creator.id,
      fromName: creator.name || 'Người dùng',
      text: `${creator.name || 'Một người dùng'} đã thêm bạn vào nhóm "${name.trim()}"`,
      createdAt: now,
      read: false,
    };
  });

  // Thực hiện MỘT lệnh update đa đường dẫn duy nhất
  await update(ref(db), updates);

  return convId;
};

/**
 * Lắng nghe thông tin nhóm và số thành viên đang online
 */
export const listenGroupOnlineMembers = (
  convId: string,
  callback: (info: {
    totalCount: number;
    onlineCount: number;
    membersMap: Record<string, boolean>;
    name: string;
  }) => void
) => {
  const convRef = ref(db, `conversations/${convId}`);

  let currentMembersMap: Record<string, boolean> = {};
  let currentGroupName = 'Nhóm';

  // Lắng nghe users để kiểm tra online status
  const usersRef = ref(db, 'users');

  let unsubUsers: (() => void) | null = null;

  const unsubConv = onValue(convRef, convSnap => {
    if (convSnap.exists()) {
      const data = convSnap.val();
      currentMembersMap = data.members || {};
      currentGroupName = data.name || 'Nhóm';

      if (!unsubUsers) {
        unsubUsers = onValue(usersRef, usersSnap => {
          let onlineCount = 0;
          const totalCount = Object.keys(currentMembersMap).length;

          if (usersSnap.exists()) {
            usersSnap.forEach(userChild => {
              const uid = userChild.key as string;
              if (currentMembersMap[uid]) {
                const uVal = userChild.val();
                if (uVal.isOnline) {
                  onlineCount++;
                }
              }
            });
          }

          callback({
            totalCount,
            onlineCount,
            membersMap: currentMembersMap,
            name: currentGroupName,
          });
        });
      }
    }
  });

  return () => {
    unsubConv();
    if (unsubUsers) {
      unsubUsers();
    }
  };
};

