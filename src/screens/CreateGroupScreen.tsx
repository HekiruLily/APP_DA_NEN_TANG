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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, User } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { createGroup } from '../services/groupService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const CreateGroupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user: currentUser, contacts } = useApp();

  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Lọc danh bạ theo tìm kiếm
  const filteredContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  // Chọn hoặc bỏ chọn thành viên
  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Tạo nhóm
  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert('Chưa nhập tên nhóm', 'Vui lòng nhập tên cho nhóm trò chuyện.');
      return;
    }

    if (selectedUserIds.length < 2) {
      Alert.alert(
        'Chưa đủ thành viên',
        'Vui lòng chọn tối thiểu 2 thành viên từ danh bạ để tạo nhóm (ngoài bản thân).'
      );
      return;
    }

    const selectedMembers = contacts.filter(c => selectedUserIds.includes(c.id));

    setIsCreating(true);
    try {
      const convId = await createGroup({
        name: trimmedName,
        creator: currentUser,
        members: selectedMembers,
      });

      // Điều hướng ngay vào phòng chat nhóm vừa tạo
      navigation.replace('ChatDetail', {
        conversationId: convId,
        convType: 'group',
        name: trimmedName,
      });
    } catch (err: any) {
      console.warn('Create group error:', err);
      Alert.alert('Lỗi tạo nhóm', err.message || 'Không thể tạo nhóm. Vui lòng thử lại.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderContactItem = ({ item }: { item: User }) => {
    const isSelected = selectedUserIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.contactItem, isSelected && styles.contactItemSelected]}
        onPress={() => handleToggleSelectUser(item.id)}
        activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          {item.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactStatus}>
            {item.isOnline ? '🟢 Trực tuyến' : '⚪ Ngoại tuyến'}
          </Text>
        </View>

        {/* Checkbox tùy chỉnh */}
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmarkIcon}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const canCreate = groupName.trim().length > 0 && selectedUserIds.length >= 2;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo nhóm mới</Text>
          <TouchableOpacity
            style={[styles.headerCreateBtn, !canCreate && styles.btnDisabled]}
            onPress={handleCreateGroup}
            disabled={!canCreate || isCreating}
            activeOpacity={0.8}>
            {isCreating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.headerCreateBtnText}>Tạo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Ô NHẬP TÊN NHÓM */}
        <View style={styles.groupNameContainer}>
          <View style={styles.groupIconWrapper}>
            <Text style={styles.groupIcon}>👥</Text>
          </View>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Đặt tên nhóm trò chuyện..."
            placeholderTextColor={colors.textMuted}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={40}
          />
        </View>

        {/* THANH TÌM KIẾM THÀNH VIÊN */}
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
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* THÔNG TIN SỐ LƯỢNG ĐÃ CHỌN */}
        <View style={styles.selectionInfoRow}>
          <Text style={styles.selectionCountText}>
            Đã chọn: <Text style={styles.highlightCount}>{selectedUserIds.length}</Text> thành viên
          </Text>
          <Text style={styles.selectionReqText}>(Tối thiểu 2 người)</Text>
        </View>

        {/* DANH SÁCH DANH BẠ ĐỂ CHỌN */}
        <FlatList
          data={filteredContacts}
          keyExtractor={item => item.id}
          renderItem={renderContactItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyText}>Không tìm thấy người dùng phù hợp trong danh bạ</Text>
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
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: 6,
  },
  backIcon: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerCreateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  headerCreateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  groupIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupIcon: {
    fontSize: 22,
  },
  groupNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 4,
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
    height: 42,
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
  clearSearchIcon: {
    fontSize: 14,
    color: colors.textMuted,
    padding: 4,
  },
  selectionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  selectionCountText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  highlightCount: {
    color: colors.primary,
    fontWeight: '800',
  },
  selectionReqText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  listContent: {
    paddingVertical: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  contactItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmarkIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

