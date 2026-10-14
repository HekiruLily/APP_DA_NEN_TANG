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
import { RootStackParamList, User } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ContactsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { contacts, conversations } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);

  
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (contact.phone && contact.phone.includes(searchQuery.trim()));

    if (filterOnlineOnly) {
      return matchesSearch && contact.isOnline;
    }
    return matchesSearch;
  });

  const handleOpenChatWithUser = (contact: User) => {
    
    const existingConv = conversations.find(c => c.user.id === contact.id);

    navigation.navigate('ChatDetail', {
      conversationId: existingConv?.id,
      user: contact,
    });
  };

  const renderContactItem = ({ item }: { item: User }) => {
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleOpenChatWithUser(item)}
        activeOpacity={0.7}>
        {}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View
            style={[
              styles.statusIndicator,
              item.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
            ]}
          />
        </View>

        {}
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDotSmall,
                item.isOnline ? styles.onlineDotSmall : styles.offlineDotSmall,
              ]}
            />
            <Text style={styles.statusText}>
              {item.isOnline
                ? item.statusText || 'Trực tuyến'
                : 'Ngoại tuyến'}
            </Text>
          </View>
        </View>

        {}
        <TouchableOpacity
          style={styles.chatActionBtn}
          onPress={() => handleOpenChatWithUser(item)}>
          <Text style={styles.chatActionIcon}>💬</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const onlineCount = contacts.filter(c => c.isOnline).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Danh bạ</Text>
            <Text style={styles.headerSubtitle}>
              {contacts.length} liên hệ • {onlineCount} đang online
            </Text>
          </View>
          <View style={styles.badgeOnline}>
            <View style={styles.greenDot} />
            <Text style={styles.badgeOnlineText}>{onlineCount} Online</Text>
          </View>
        </View>

        {}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
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
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.tabButton, !filterOnlineOnly && styles.tabButtonActive]}
            onPress={() => setFilterOnlineOnly(false)}>
            <Text
              style={[
                styles.tabButtonText,
                !filterOnlineOnly && styles.tabButtonTextActive,
              ]}>
              Tất cả ({contacts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, filterOnlineOnly && styles.tabButtonActive]}
            onPress={() => setFilterOnlineOnly(true)}>
            <Text
              style={[
                styles.tabButtonText,
                filterOnlineOnly && styles.tabButtonTextActive,
              ]}>
              Đang trực tuyến ({onlineCount})
            </Text>
          </TouchableOpacity>
        </View>

        {}
        <FlatList
          data={filteredContacts}
          keyExtractor={item => item.id}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>Không tìm thấy người dùng</Text>
              <Text style={styles.emptySubtitle}>
                Vui lòng kiểm tra lại từ khóa tìm kiếm trong danh bạ
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
  badgeOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  badgeOnlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
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
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.textWhite,
  },
  listContent: {
    paddingVertical: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.border,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  onlineIndicator: {
    backgroundColor: colors.accent,
  },
  offlineIndicator: {
    backgroundColor: colors.accentOffline,
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 15.5,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  onlineDotSmall: {
    backgroundColor: colors.accent,
  },
  offlineDotSmall: {
    backgroundColor: colors.accentOffline,
  },
  statusText: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  chatActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatActionIcon: {
    fontSize: 18,
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
