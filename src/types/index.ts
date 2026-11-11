export interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  statusText?: string;
  phone?: string;
  email?: string;
  bio?: string;
  lastSeen?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: string;
  createdAt?: number;
  isMe: boolean;
  type?: 'text' | 'image' | 'location';
  imageUrl?: string;
  lat?: number;
  lng?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  recalled?: boolean;
  reactions?: { [uid: string]: string };
}

export interface Conversation {
  id: string;
  type?: 'direct' | 'group';
  name?: string;
  members?: { [uid: string]: boolean };
  user?: User;
  lastMessage: string;
  lastMessageTime: string;
  lastSenderId?: string;
  unreadCount: number;
  messages: Message[];
  updatedAt?: number;
  createdBy?: string;
  createdAt?: number;
}

export interface AppNotification {
  id: string;
  convId?: string;
  fromUid?: string;
  fromName?: string;
  text?: string;
  title?: string;
  content?: string;
  createdAt?: number;
  read?: boolean;
  isRead?: boolean;
  type?: 'new_message' | 'group_added' | 'reaction' | 'message' | 'system' | 'friend' | string;
  timestamp?: string;
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
  CreateGroup: undefined;
  ChatDetail: {
    conversationId?: string;
    user?: User;
    convType?: 'direct' | 'group';
    name?: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Contacts: undefined;
  Notifications: undefined;
  Settings: undefined;
};
