import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User, Conversation, Message, AppNotification, UserSettings } from '../types';
import {
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  subscribeToAuthChanges,
} from '../services/authService';
import {
  setupPresence,
  listenUsers,
  listenConversations,
  sendMessage as sendChatMessage,
  markConversationAsRead as markChatAsRead,
  getChatId,
} from '../services/chatService';
import {
  listenNotifications,
  markNotificationAsRead as serviceMarkNotifAsRead,
  markAllNotificationsAsRead as serviceMarkAllNotifsAsRead,
} from '../services/notificationService';

interface AppContextType {
  isLoggedIn: boolean;
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  contacts: User[];
  conversations: Conversation[];
  notifications: AppNotification[];
  settings: UserSettings;
  unreadNotificationsCount: number;
  totalUnreadChatsCount: number;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  sendMessage: (
    recipientOrConvId: User | string,
    text?: string,
    type?: 'text' | 'location' | 'image',
    location?: { latitude: number; longitude: number },
    imageUrl?: string,
    recipientUser?: User
  ) => Promise<void>;
  markConversationAsRead: (convIdOrOtherUserId: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  updateSetting: (key: keyof UserSettings, value: boolean) => void;
}

const defaultUser: User = {
  id: '',
  name: '',
  avatar: 'https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff',
  isOnline: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User>(defaultUser);
  const [contacts, setContacts] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    notificationsEnabled: true,
    darkMode: false,
    soundEnabled: true,
    showOnlineStatus: true,
  });

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges(fbUser => {
      if (fbUser) {
        setIsLoggedIn(true);
        setUser(prev => ({
          ...prev,
          id: fbUser.uid,
          name: fbUser.displayName || prev.name || 'Người dùng',
          email: fbUser.email || prev.email || '',
          avatar:
            prev.avatar && !prev.avatar.includes('name=User')
              ? prev.avatar
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  fbUser.displayName || 'User'
                )}&background=4F46E5&color=fff&size=128`,
          isOnline: true,
        }));
      } else {
        setIsLoggedIn(false);
        setUser(defaultUser);
        setContacts([]);
        setConversations([]);
        setNotifications([]);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user.id) return;

    // 1. Trực tuyến và lastSeen
    const unsubPresence = setupPresence(user.id);

    // 2. Danh bạ
    const unsubContacts = listenUsers(user.id, updatedContacts => {
      setContacts(updatedContacts);
    });

    // 3. Danh sách cuộc trò chuyện (1-1 và Group)
    const unsubConversations = listenConversations(user.id, updatedConvs => {
      setConversations(updatedConvs);
    });

    // 4. Lắng nghe thông báo thật từ Firebase notifications/{uid}
    const unsubNotifications = listenNotifications(user.id, realNotifs => {
      setNotifications(realNotifs);
    });

    return () => {
      unsubPresence();
      unsubContacts();
      unsubConversations();
      unsubNotifications();
    };
  }, [user.id]);

  const login = async (email: string, pass: string) => {
    const loggedInUser = await loginWithEmail(email, pass);
    setUser(loggedInUser);
    setIsLoggedIn(true);
  };

  const register = async (name: string, email: string, pass: string) => {
    const newUser = await registerWithEmail(name, email, pass);
    setUser(newUser);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await logoutUser();
    setUser(defaultUser);
    setIsLoggedIn(false);
    setContacts([]);
    setConversations([]);
    setNotifications([]);
  };

  const sendMessage = async (
    recipientOrConvId: User | string,
    text: string = '',
    type: 'text' | 'location' | 'image' = 'text',
    location?: { latitude: number; longitude: number },
    imageUrl?: string,
    recipientUser?: User
  ) => {
    if (!user.id) return;

    let convId = '';
    let targetRecipient = recipientUser;

    if (typeof recipientOrConvId === 'string') {
      convId = recipientOrConvId;
    } else {
      targetRecipient = recipientOrConvId;
      convId = getChatId(user.id, targetRecipient.id);
    }

    await sendChatMessage({
      convId,
      sender: user,
      recipient: targetRecipient,
      text,
      type,
      location,
      imageUrl,
    });
  };

  const markConversationAsRead = (convIdOrOtherUserId: string) => {
    if (!user.id || !convIdOrOtherUserId) return;
    const convId = convIdOrOtherUserId.includes('_')
      ? convIdOrOtherUserId
      : getChatId(user.id, convIdOrOtherUserId);
    markChatAsRead(user.id, convId);
  };

  const markNotificationAsRead = (id: string) => {
    if (!user.id || !id) return;
    serviceMarkNotifAsRead(user.id, id);
  };

  const markAllNotificationsAsRead = () => {
    if (!user.id) return;
    serviceMarkAllNotifsAsRead(user.id, notifications);
  };

  const updateSetting = (key: keyof UserSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Đếm số thông báo chưa đọc thật từ Firebase
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Đếm tổng số tin nhắn chưa đọc
  const totalUnreadChatsCount = conversations.reduce(
    (acc, conv) => acc + (conv.unreadCount || 0),
    0
  );

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        user,
        setUser,
        contacts,
        conversations,
        notifications,
        settings,
        unreadNotificationsCount,
        totalUnreadChatsCount,
        login,
        register,
        logout,
        sendMessage,
        markConversationAsRead,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        updateSetting,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
