import {
  ref,
  push,
  set,
  update,
  onValue,
  get,
} from 'firebase/database';
import { auth, db } from './firebase';
import { User, Conversation } from '../types';


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

  const currentUid = auth.currentUser?.uid || creator.id;
  const currentName = auth.currentUser?.displayName || creator.name || 'Người dùng';
  const now = Date.now();
  const convRef = push(ref(db, 'conversations'));
  const convId = convRef.key as string;

  // Gom các thành viên
  const membersMap: Record<string, boolean> = {
    [currentUid]: true,
  };
  members.forEach(m => {
    if (m.id) {
      membersMap[m.id] = true;
    }
  });

  const createdMessage = `${currentName} đã tạo nhóm "${name.trim()}"`;

  // 1. Ghi thông tin cuộc trò chuyện nhóm TRƯỚC TIÊN
  // Bước này đảm bảo root.child('conversations/' + convId) đã tồn tại trong Realtime Database,
  // giúp các quy tắc bảo mật (security rules) cho messages và userChats của thành viên kiểm tra hợp lệ.
  await set(ref(db, `conversations/${convId}`), {
    type: 'group',
    name: name.trim(),
    members: membersMap,
    createdBy: currentUid,
    createdAt: now,
    lastMessage: createdMessage,
    lastSenderId: currentUid,
    updatedAt: now,
  });

  const updates: Record<string, any> = {};

  // 2. Ghi tin nhắn hệ thống đầu tiên vào nhóm (dùng currentUid để khớp với rule auth.uid === senderId)
  const firstMsgKey = push(ref(db, `messages/${convId}`)).key as string;
  updates[`messages/${convId}/${firstMsgKey}`] = {
    senderId: currentUid,
    senderName: currentName,
    type: 'system',
    text: createdMessage,
    createdAt: now,
    recalled: false,
    timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  // 3. Cập nhật userChats của người tạo (unread = 0)
  updates[`userChats/${currentUid}/${convId}`] = {
    type: 'group',
    name: name.trim(),
    lastMessage: createdMessage,
    lastSenderId: currentUid,
    updatedAt: now,
    unread: 0,
  };

  // 4. Cập nhật userChats và ghi thông báo cho các thành viên khác
  members.forEach(m => {
    if (!m.id || m.id === currentUid) return;

    updates[`userChats/${m.id}/${convId}`] = {
      type: 'group',
      name: name.trim(),
      lastMessage: createdMessage,
      lastSenderId: currentUid,
      updatedAt: now,
      unread: 1,
    };

    const notifKey = push(ref(db, `notifications/${m.id}`)).key as string;
    updates[`notifications/${m.id}/${notifKey}`] = {
      type: 'group_added',
      convId,
      groupName: name.trim(),
      fromUid: currentUid,
      fromName: currentName,
      text: `${currentName} đã thêm bạn vào nhóm "${name.trim()}"`,
      createdAt: now,
      read: false,
    };
  });

  // Thực hiện MỘT lệnh update đa đường dẫn cho các nhánh còn lại
  await update(ref(db), updates);

  return convId;
};

export const listenGroupOnlineMembers = (
  convId: string,
  callback: (info: {
    totalCount: number;
    onlineCount: number;
    membersMap: Record<string, boolean>;
    name: string;
    createdBy?: string;
  }) => void
) => {
  const convRef = ref(db, `conversations/${convId}`);
  const usersRef = ref(db, 'users');

  let currentMembersMap: Record<string, boolean> = {};
  let currentGroupName = 'Nhóm';
  let currentCreatedBy = '';
  let lastUsersSnap: any = null;
  let unsubUsers: (() => void) | null = null;

  const emit = () => {
    let onlineCount = 0;
    const totalCount = Object.keys(currentMembersMap).length;

    if (lastUsersSnap && lastUsersSnap.exists()) {
      lastUsersSnap.forEach((userChild: any) => {
        const uid = userChild.key as string;
        if (currentMembersMap[uid]) {
          const uVal = userChild.val();
          if (uVal && uVal.isOnline) {
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
      createdBy: currentCreatedBy,
    });
  };

  const unsubConv = onValue(
    convRef,
    convSnap => {
      if (convSnap.exists()) {
        const data = convSnap.val();
        currentMembersMap = data.members || {};
        currentGroupName = data.name || 'Nhóm';
        currentCreatedBy = data.createdBy || '';
        emit();

        if (!unsubUsers) {
          unsubUsers = onValue(
            usersRef,
            usersSnap => {
              lastUsersSnap = usersSnap;
              emit();
            },
            err => {
              console.warn('listenGroupOnlineMembers users listener error:', err.message);
            }
          );
        }
      }
    },
    err => {
      console.warn('listenGroupOnlineMembers conv listener error:', err.message);
    }
  );

  return () => {
    unsubConv();
    if (unsubUsers) {
      unsubUsers();
    }
  };
};

/**
 * Đổi tên nhóm (Admin hoặc thành viên)
 */
export const renameGroup = async ({
  convId,
  newName,
  currentUid,
  currentUserName,
}: {
  convId: string;
  newName: string;
  currentUid: string;
  currentUserName: string;
}) => {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('Tên nhóm không được để trống.');
  }

  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) {
    throw new Error('Nhóm không tồn tại.');
  }

  const convData = convSnap.val();
  const membersMap = convData.members || {};
  const memberUids = Object.keys(membersMap);
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const systemText = `${currentUserName} đã đổi tên nhóm thành "${trimmed}"`;

  const updates: Record<string, any> = {};
  updates[`conversations/${convId}/name`] = trimmed;
  updates[`conversations/${convId}/lastMessage`] = systemText;
  updates[`conversations/${convId}/lastSenderId`] = currentUid;
  updates[`conversations/${convId}/updatedAt`] = now;

  // Ghi tin nhắn hệ thống
  const msgKey = push(ref(db, `messages/${convId}`)).key as string;
  updates[`messages/${convId}/${msgKey}`] = {
    senderId: currentUid,
    senderName: currentUserName,
    type: 'system',
    text: systemText,
    createdAt: now,
    recalled: false,
    timestamp: timeStr,
  };

  // Cập nhật tên nhóm trong userChats của tất cả thành viên
  memberUids.forEach(uid => {
    updates[`userChats/${uid}/${convId}/name`] = trimmed;
    updates[`userChats/${uid}/${convId}/lastMessage`] = systemText;
    updates[`userChats/${uid}/${convId}/updatedAt`] = now;
  });

  await update(ref(db), updates);
};

/**
 * Thêm thành viên vào nhóm
 */
export const addMembersToGroup = async ({
  convId,
  newMembers,
  currentUid,
  currentUserName,
}: {
  convId: string;
  newMembers: User[];
  currentUid: string;
  currentUserName: string;
}) => {
  if (!newMembers || newMembers.length === 0) return;

  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) {
    throw new Error('Nhóm không tồn tại.');
  }

  const convData = convSnap.val();
  const currentMembersMap = convData.members || {};
  const groupName = convData.name || 'Nhóm';
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const addedNames = newMembers.map(m => m.name).join(', ');
  const systemText = `${currentUserName} đã thêm ${addedNames} vào nhóm`;

  const updates: Record<string, any> = {};

  // Thêm thành viên vào conversations/{convId}/members
  newMembers.forEach(m => {
    updates[`conversations/${convId}/members/${m.id}`] = true;
  });

  updates[`conversations/${convId}/lastMessage`] = systemText;
  updates[`conversations/${convId}/lastSenderId`] = currentUid;
  updates[`conversations/${convId}/updatedAt`] = now;

  // Ghi tin nhắn hệ thống
  const msgKey = push(ref(db, `messages/${convId}`)).key as string;
  updates[`messages/${convId}/${msgKey}`] = {
    senderId: currentUid,
    senderName: currentUserName,
    type: 'system',
    text: systemText,
    createdAt: now,
    recalled: false,
    timestamp: timeStr,
  };

  // Cập nhật userChats của các thành viên hiện tại
  Object.keys(currentMembersMap).forEach(uid => {
    updates[`userChats/${uid}/${convId}/lastMessage`] = systemText;
    updates[`userChats/${uid}/${convId}/updatedAt`] = now;
  });

  // Thêm userChats và thông báo cho thành viên mới
  newMembers.forEach(m => {
    updates[`userChats/${m.id}/${convId}`] = {
      type: 'group',
      name: groupName,
      lastMessage: systemText,
      lastSenderId: currentUid,
      updatedAt: now,
      unread: 1,
    };

    const notifKey = push(ref(db, `notifications/${m.id}`)).key as string;
    updates[`notifications/${m.id}/${notifKey}`] = {
      type: 'group_added',
      convId,
      groupName,
      fromUid: currentUid,
      fromName: currentUserName,
      text: `${currentUserName} đã thêm bạn vào nhóm "${groupName}"`,
      createdAt: now,
      read: false,
    };
  });

  await update(ref(db), updates);
};

/**
 * Xóa thành viên khỏi nhóm (Chỉ dành cho Admin / Trưởng nhóm)
 */
export const removeMemberFromGroup = async ({
  convId,
  memberId,
  memberName,
  currentUid,
  currentUserName,
}: {
  convId: string;
  memberId: string;
  memberName: string;
  currentUid: string;
  currentUserName: string;
}) => {
  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) {
    throw new Error('Nhóm không tồn tại.');
  }

  const convData = convSnap.val();
  if (convData.createdBy !== currentUid) {
    throw new Error('Chỉ trưởng nhóm mới có quyền xóa thành viên.');
  }

  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const systemText = `${currentUserName} đã xóa ${memberName} khỏi nhóm`;

  const updates: Record<string, any> = {};
  updates[`conversations/${convId}/members/${memberId}`] = null;
  updates[`conversations/${convId}/lastMessage`] = systemText;
  updates[`conversations/${convId}/lastSenderId`] = currentUid;
  updates[`conversations/${convId}/updatedAt`] = now;

  // Xóa userChats của thành viên bị xóa
  updates[`userChats/${memberId}/${convId}`] = null;

  // Ghi tin nhắn hệ thống
  const msgKey = push(ref(db, `messages/${convId}`)).key as string;
  updates[`messages/${convId}/${msgKey}`] = {
    senderId: currentUid,
    senderName: currentUserName,
    type: 'system',
    text: systemText,
    createdAt: now,
    recalled: false,
    timestamp: timeStr,
  };

  // Cập nhật userChats của các thành viên còn lại
  const membersMap = convData.members || {};
  Object.keys(membersMap).forEach(uid => {
    if (uid !== memberId) {
      updates[`userChats/${uid}/${convId}/lastMessage`] = systemText;
      updates[`userChats/${uid}/${convId}/updatedAt`] = now;
    }
  });

  await update(ref(db), updates);
};

/**
 * Rời nhóm (Hiển thị tin hệ thống "A đã rời nhóm")
 * Áp dụng cho cả thành viên và trưởng nhóm
 */
export const leaveGroup = async ({
  convId,
  currentUid,
  currentUserName,
}: {
  convId: string;
  currentUid: string;
  currentUserName: string;
}) => {
  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) {
    throw new Error('Nhóm không tồn tại.');
  }

  const convData = convSnap.val();
  const membersMap = convData.members || {};
  const remainingMembers = Object.keys(membersMap).filter(id => id !== currentUid);

  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const systemText = `${currentUserName} đã rời nhóm`;

  const updates: Record<string, any> = {};

  // Xóa khỏi userChats của người rời
  updates[`userChats/${currentUid}/${convId}`] = null;

  if (remainingMembers.length === 0) {
    // Không còn ai trong nhóm -> Xóa toàn bộ nhóm
    updates[`conversations/${convId}`] = null;
  } else {
    // 1. Ghi tin nhắn hệ thống "A đã rời nhóm" TRƯỚC KHI gỡ khỏi members
    const msgKey = push(ref(db, `messages/${convId}`)).key as string;
    await set(ref(db, `messages/${convId}/${msgKey}`), {
      senderId: currentUid,
      senderName: currentUserName,
      type: 'system',
      text: systemText,
      createdAt: now,
      recalled: false,
      timestamp: timeStr,
    });

    // 2. Xóa khỏi danh sách thành viên và cập nhật conversations
    updates[`conversations/${convId}/members/${currentUid}`] = null;
    updates[`conversations/${convId}/lastMessage`] = systemText;
    updates[`conversations/${convId}/lastSenderId`] = currentUid;
    updates[`conversations/${convId}/updatedAt`] = now;

    // Nếu người rời là trưởng nhóm, chuyển quyền trưởng nhóm cho thành viên đầu tiên còn lại
    if (convData.createdBy === currentUid) {
      updates[`conversations/${convId}/createdBy`] = remainingMembers[0];
    }

    // Cập nhật userChats của các thành viên còn lại
    remainingMembers.forEach(uid => {
      updates[`userChats/${uid}/${convId}/lastMessage`] = systemText;
      updates[`userChats/${uid}/${convId}/updatedAt`] = now;
    });
  }

  await update(ref(db), updates);
};

/**
 * Giải tán nhóm (Chỉ dành cho Trưởng nhóm)
 */
export const disbandGroup = async ({
  convId,
  currentUid,
}: {
  convId: string;
  currentUid: string;
}) => {
  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) return;

  const convData = convSnap.val();
  if (convData.createdBy !== currentUid) {
    throw new Error('Chỉ trưởng nhóm mới có quyền giải tán nhóm.');
  }

  const membersMap = convData.members || {};
  const memberUids = Object.keys(membersMap);

  const updates: Record<string, any> = {};
  updates[`conversations/${convId}`] = null;

  memberUids.forEach(uid => {
    updates[`userChats/${uid}/${convId}`] = null;
  });

  await update(ref(db), updates);
};

