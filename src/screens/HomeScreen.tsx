import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Conversation, User } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { conversations, markConversationAsRead, contacts } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const name = conv.user?.name || '';
    const lastMsg = conv.lastMessage || '';
    return (
      name.toLowerCase().includes(query) ||
      lastMsg.toLowerCase().includes(query)
    );
  });

  const handleOpenChat = (conversation: Conversation) => {
    markConversationAsRead(conversation.id);

    const isGroup = conversation.type === 'group';
    const targetUser: User = conversation.user || {
      id: conversation.id,
      name: conversation.name || 'Nhóm trò chuyện',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        conversation.name || 'Group'
      )}&background=6366F1&color=fff&size=128`,
      isOnline: false,
    };

    navigation.navigate('ChatDetail', {
      conversationId: conversation.id,
      convType: isGroup ? 'group' : 'direct',
      name: isGroup ? (conversation.name || 'Nhóm trò chuyện') : targetUser.name,
      user: targetUser,
    });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const isGroup = item.type === 'group';
    const hasUnread = (item.unreadCount || 0) > 0;
    const targetUserId = item.user?.id || item.id;
    const liveContact = !isGroup ? contacts.find(c => c.id === targetUserId) : null;
    const isOnline = liveContact ? liveContact.isOnline : false;
    const avatar =
      item.user?.avatar ||
      liveContact?.avatar ||
      'https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff&size=128';
    const userName = isGroup
      ? (item.name || 'Nhóm trò chuyện')
      : (liveContact?.name || item.user?.name || 'Người dùng');

    const rawLastMsg = item.lastMessage || '';
    let displayLastMsg = rawLastMsg;
    if (rawLastMsg.startsWith('📍 Tọa độ:') || rawLastMsg === '📍 Vị trí') {
      displayLastMsg = '📍 Vị trí';
    } else if (
      rawLastMsg === '📷 Hình ảnh' ||
      (rawLastMsg.startsWith('http') &&
        (rawLastMsg.includes('cloudinary') || rawLastMsg.match(/\.(jpg|jpeg|png|webp|gif)/i)))
    ) {
      displayLastMsg = '📷 Hình ảnh';
    }

    return (
      <TouchableOpacity
        style={[styles.chatItem, hasUnread && styles.chatItemUnread]}
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          {isOnline && <View style={styles.onlineDot} />}
          {isGroup && (
            <View style={styles.groupBadgeDot}>
              <Text style={styles.groupBadgeText}>👥</Text>
            </View>
          )}
        </View>

        {/* Thông tin cuộc trò chuyện */}
        <View style={styles.chatDetails}>
          <View style={styles.chatHeaderRow}>
            <View style={styles.nameWithGroupRow}>
              {isGroup && <Text style={styles.groupTagText}>[Nhóm] </Text>}
              <Text
                style={[styles.userName, hasUnread && styles.userNameBold]}
                numberOfLines={1}>
                {userName}
              </Text>
            </View>
            <Text
              style={[styles.timestamp, hasUnread && styles.timestampUnread]}>
              {item.lastMessageTime}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[
                styles.lastMessage,
                hasUnread && styles.lastMessageUnread,
                displayLastMsg === 'Tin nhắn đã được thu hồi' && styles.lastMessageRecalled,
              ]}
              numberOfLines={1}>
              {displayLastMsg}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Đoạn chat</Text>
            <Text style={styles.headerSubtitle}>
              {conversations.length} cuộc trò chuyện
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.createGroupHeaderBtn}
              onPress={() => navigation.navigate('CreateGroup')}
              activeOpacity={0.8}>
              <Text style={styles.createGroupBtnIcon}>👥+</Text>
              <Text style={styles.createGroupBtnText}>Tạo nhóm</Text>
            </TouchableOpacity>
          </View>
        </View>

        {}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm cuộc trò chuyện hoặc tin nhắn..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {}
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Không tìm thấy cuộc trò chuyện</Text>
              <Text style={styles.emptySubtitle}>
                Thử tìm với từ khóa khác hoặc vào mục Danh bạ để bắt đầu nhắn tin mới
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 6,
  },
  clearIcon: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  chatItemUnread: {
    backgroundColor: colors.unreadItemBg,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.border,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  chatDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  userNameBold: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  timestampUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 13.5,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  lastMessageRecalled: {
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  createGroupHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  createGroupBtnIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  createGroupBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  groupBadgeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 1,
  },
  groupBadgeText: {
    fontSize: 11,
  },
  nameWithGroupRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  groupTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  badge: {
    backgroundColor: colors.badgeBg,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
