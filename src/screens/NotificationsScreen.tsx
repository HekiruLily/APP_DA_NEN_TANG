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
import { AppNotification } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

export const NotificationsScreen: React.FC = () => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'friend':
        return '👥';
      case 'system':
      default:
        return '🔔';
    }
  };

  const renderNotificationItem = ({ item }: { item: AppNotification }) => {
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.isRead ? styles.itemUnread : styles.itemRead,
        ]}
        onPress={() => markNotificationAsRead(item.id)}
        activeOpacity={0.7}>
        {}
        <View
          style={[
            styles.iconContainer,
            !item.isRead ? styles.iconContainerUnread : styles.iconContainerRead,
          ]}>
          <Text style={styles.notifEmoji}>{getNotificationIcon(item.type)}</Text>
        </View>

        {}
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                !item.isRead ? styles.titleUnread : styles.titleRead,
              ]}
              numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text
            style={[
              styles.messageText,
              !item.isRead ? styles.messageUnread : styles.messageRead,
            ]}
            numberOfLines={2}>
            {item.content}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
            <Text
              style={[
                styles.statusBadge,
                !item.isRead ? styles.statusBadgeUnread : styles.statusBadgeRead,
              ]}>
              {item.isRead ? '✓ Đã đọc' : 'Chưa đọc (Chạm để đọc)'}
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
        {}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Thông báo</Text>
            <Text style={styles.headerSubtitle}>
              {unreadNotificationsCount > 0
                ? `${unreadNotificationsCount} thông báo chưa đọc`
                : 'Đã xem tất cả thông báo'}
            </Text>
          </View>

          {unreadNotificationsCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllNotificationsAsRead}
              activeOpacity={0.8}>
              <Text style={styles.markAllText}>Đọc tất cả</Text>
            </TouchableOpacity>
          )}
        </View>

        {}
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>Không có thông báo nào</Text>
              <Text style={styles.emptySubtitle}>
                Bạn sẽ nhận được thông báo khi có tin nhắn mới hoặc cập nhật hệ thống
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
  markAllButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerUnread: {
    backgroundColor: '#DBEAFE',
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
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  titleRead: {
    fontWeight: '500',
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  messageUnread: {
    color: colors.textPrimary,
  },
  messageRead: {
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 11.5,
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
