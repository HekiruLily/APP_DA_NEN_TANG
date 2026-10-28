import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User, Conversation, Message, AppNotification, UserSettings } from '../types';
import { mockNotifications } from '../data/mockData';
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
} from '../services/chatService';

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
    recipient: User,
    text: string,
    type?: 'text' | 'location',
    location?: { latitude: number; longitude: number }
  ) => Promise<void>;
  markConversationAsRead: (otherUserId: string) => void;
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
  const [notifications, setNotifications] = useState<AppNotification[]>(mockNotifications);
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
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  
  useEffect(() => {
    if (!user.id) return;

    
    const unsubPresence = setupPresence(user.id);

    
    const unsubContacts = listenUsers(user.id, updatedContacts => {
      setContacts(updatedContacts);
    });

    
    const unsubConversations = listenConversations(user.id, updatedConvs => {
      setConversations(updatedConvs);
    });

    
    return () => {
      unsubPresence();
      unsubContacts();
      unsubConversations();
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
  };

  
  const sendMessage = async (
    recipient: User,
    text: string,
    type: 'text' | 'location' = 'text',
    location?: { latitude: number; longitude: number }
  ) => {
    if (!user.id) return;
    await sendChatMessage({
      sender: user,
      recipient,
      text,
      type,
      location,
    });
  };

  
  const markConversationAsRead = (otherUserId: string) => {
    if (!user.id) return;
    markChatAsRead(user.id, otherUserId);
  };

  
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const updateSetting = (key: keyof UserSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
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
