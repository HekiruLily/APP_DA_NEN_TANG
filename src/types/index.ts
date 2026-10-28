export interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  statusText?: string;
  phone?: string;
  email?: string;
  bio?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  type?: 'text' | 'location';
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  updatedAt?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  type?: 'message' | 'system' | 'friend';
}

export interface UserSettings {
  notificationsEnabled: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  showOnlineStatus: boolean;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  ChatDetail: {
    conversationId?: string;
    user: User;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Contacts: undefined;
  Notifications: undefined;
  Settings: undefined;
};
