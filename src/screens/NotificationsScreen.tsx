import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, AppNotification, User } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    notifications,
    conversations,
    contacts,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'new_message':
      case 'message':
        return '💬';
      case 'group_added':
      case 'friend':
        return '👥';
      case 'reaction':
        return '❤️';
      case 'system':
      default:
        return '🔔';
    }
  };

  const getNotificationTitle = (type?: string) => {
    switch (type) {
      case 'new_message':
      case 'message':
        return 'Tin nhắn mới';
      case 'group_added':
        return 'Lời mời vào nhóm';
      case 'reaction':
        return 'Cảm xúc tin nhắn';
      case 'friend':
        return 'Bạn bè mới';
      default:
        return 'Thông báo hệ thống';
    }
  };

  const handlePressNotification = (item: AppNotification) => {
    // 1. Đánh dấu đã đọc
    markNotificationAsRead(item.id);

    // 2. Mở đúng cuộc trò chuyện
    if (item.convId) {
      const targetConv = conversations.find(c => c.id === item.convId);
      const isGroup = targetConv?.type === 'group';

      let targetUser: User | undefined = targetConv?.user;
      if (!targetUser) {
        const foundContact = contacts.find(c => c.id === item.fromUid);
        targetUser = foundContact || {
          id: item.fromUid || 'unknown_user',
          name: item.fromName || 'Người dùng',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            item.fromName || 'User'
          )}&background=4F46E5&color=fff&size=128`,
          isOnline: false,
        };
      }

      navigation.navigate('ChatDetail', {
        conversationId: item.convId,
        convType: isGroup ? 'group' : 'direct',
        name: isGroup ? (targetConv?.name || 'Nhóm trò chuyện') : (targetUser?.name || 'Người dùng'),
        user: targetUser,
      });
    }
  };

  const renderNotificationItem = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread ? styles.itemUnread : styles.itemRead,
        ]}
        onPress={() => handlePressNotification(item)}
        activeOpacity={0.7}>
        {/* ICON LOẠI THÔNG BÁO */}
        <View
          style={[
            styles.iconContainer,
            isUnread ? styles.iconContainerUnread : styles.iconContainerRead,
          ]}>
          <Text style={styles.notifEmoji}>{getNotificationIcon(item.type)}</Text>
        </View>

        {/* NỘI DUNG THÔNG BÁO */}
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                isUnread ? styles.titleUnread : styles.titleRead,
              ]}
              numberOfLines={1}>
              {getNotificationTitle(item.type)}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          <Text
            style={[
              styles.messageText,
              isUnread ? styles.messageUnread : styles.messageRead,
            ]}
            numberOfLines={2}>
            {item.text}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            <Text
              style={[
                styles.statusBadge,
                isUnread ? styles.statusBadgeUnread : styles.statusBadgeRead,
              ]}>
              {isUnread ? 'Chưa đọc' : 'Đã đọc'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Thông báo</Text>
            <Text style={styles.headerSubtitle}>
              {unreadNotificationsCount > 0
                ? `${unreadNotificationsCount} thông báo chưa đọc`
                : 'Đã xem tất cả thông báo'}
            </Text>
          </View>

          {/* NÚT ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC */}
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllNotificationsAsRead}
              activeOpacity={0.8}>
              <Text style={styles.markAllText}>Đánh dấu tất cả đã đọc</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DANH SÁCH THÔNG BÁO THẬT TỪ FIREBASE */}
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
              <Text style={styles.emptySubtitle}>
                Bạn sẽ nhận được thông báo khi có tin nhắn mới, được thêm vào nhóm hoặc có người thả cảm xúc vào tin nhắn của bạn.
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  markAllButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemUnread: {
    backgroundColor: '#EFF6FF',
  },
  itemRead: {
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerUnread: {
    backgroundColor: colors.primaryLight,
  },
  iconContainerRead: {
    backgroundColor: colors.surfaceAlt,
  },
  notifEmoji: {
    fontSize: 20,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 14.5,
  },
  titleUnread: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  titleRead: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 18,
    marginBottom: 6,
  },
  messageUnread: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  messageRead: {
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeUnread: {
    color: colors.primary,
  },
  statusBadgeRead: {
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
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
