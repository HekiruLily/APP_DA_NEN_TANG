import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, settings, updateSetting, logout } = useApp();

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cài đặt</Text>
        </View>

        {}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatarContainer}>
            <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
            <View style={styles.profileOnlineDot} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email || 'user@example.com'}</Text>
            <Text style={styles.profilePhone}>{user.phone || '0987 654 321'}</Text>
          </View>
        </View>

        {}
        

        {}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>TÙY CHỈNH ỨNG DỤNG</Text>

          {}
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrapper}>
              <Text style={styles.settingEmoji}>🔔</Text>
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Thông báo tin nhắn</Text>
              <Text style={styles.settingDesc}>Nhận thông báo khi có tin nhắn mới</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={val => updateSetting('notificationsEnabled', val)}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {}
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrapper}>
              <Text style={styles.settingEmoji}>🔊</Text>
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Âm thanh & Rung</Text>
              <Text style={styles.settingDesc}>Phát chuông khi có tin nhắn và cuộc gọi</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={val => updateSetting('soundEnabled', val)}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {}
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrapper}>
              <Text style={styles.settingEmoji}>🟢</Text>
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Hiển thị trạng thái Online</Text>
              <Text style={styles.settingDesc}>Cho phép bạn bè thấy bạn đang hoạt động</Text>
            </View>
            <Switch
              value={settings.showOnlineStatus}
              onValueChange={val => updateSetting('showOnlineStatus', val)}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
         
        </View>

        {}
        

        {}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutButtonText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 36,
  },
  header: {
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.border,
  },
  profileOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    letterSpacing: 0.8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  settingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingEmoji: {
    fontSize: 18,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});
