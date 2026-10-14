import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Conversation, Message, AppNotification, UserSettings } from '../types';
import { currentUser, mockUsers, mockConversations, mockNotifications } from '../data/mockData';

interface AppContextType {
  isLoggedIn: boolean;
  login: (username: string) => void;
  logout: () => void;
  user: User;
  contacts: User[];
  conversations: Conversation[];
  notifications: AppNotification[];
  settings: UserSettings;
  unreadNotificationsCount: number;
  totalUnreadChatsCount: number;
  sendMessage: (recipient: User, text: string) => void;
  markConversationAsRead: (conversationId: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  updateSetting: (key: keyof UserSettings, value: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User>(currentUser);
  const [contacts] = useState<User[]>(mockUsers);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [notifications, setNotifications] = useState<AppNotification[]>(mockNotifications);
  const [settings, setSettings] = useState<UserSettings>({
    notificationsEnabled: true,
    darkMode: false,
    soundEnabled: true,
    showOnlineStatus: true,
  });

  const login = (username: string) => {
    setUser(prev => ({
      ...prev,
      name: username.trim() || prev.name,
    }));
    setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
  const totalUnreadChatsCount = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);

  const sendMessage = (recipient: User, text: string) => {
    if (!text.trim()) return;

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      text: text.trim(),
      timestamp: timeStr,
      isMe: true,
    };

    setConversations(prev => {
      const existingConvIndex = prev.findIndex(c => c.user.id === recipient.id);

      if (existingConvIndex >= 0) {
        const updated = [...prev];
        const currentConv = updated[existingConvIndex];
        const updatedConv: Conversation = {
          ...currentConv,
          lastMessage: text.trim(),
          lastMessageTime: timeStr,
          messages: [...currentConv.messages, newMessage],
        };
        
        updated.splice(existingConvIndex, 1);
        return [updatedConv, ...updated];
      } else {
        
        const newConv: Conversation = {
          id: `conv_${Date.now()}`,
          user: recipient,
          lastMessage: text.trim(),
          lastMessageTime: timeStr,
          unreadCount: 0,
          messages: [newMessage],
        };
        return [newConv, ...prev];
      }
    });
  };

  const markConversationAsRead = (conversationId: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
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

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        login,
        logout,
        user,
        contacts,
        conversations,
        notifications,
        settings,
        unreadNotificationsCount,
        totalUnreadChatsCount,
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
