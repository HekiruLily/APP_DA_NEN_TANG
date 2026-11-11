import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  Pressable,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  launchCamera,
  launchImageLibrary,
  ImageLibraryOptions,
  CameraOptions,
  Asset,
} from 'react-native-image-picker';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { uploadImageToCloudinary } from '../services/uploadService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, settings, updateSetting, logout, updateUserProfile } = useApp();

  // State chỉnh sửa hồ sơ
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);

  const handleOpenEditProfile = () => {
    setEditName(user.name || '');
    setEditAvatarUrl(user.avatar || '');
    setIsEditModalVisible(true);
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Quyền truy cập Máy ảnh',
          message: 'Ứng dụng cần quyền sử dụng máy ảnh để chụp ảnh đại diện.',
          buttonNeutral: 'Để sau',
          buttonNegative: 'Từ chối',
          buttonPositive: 'Đồng ý',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  };

  const pickerOptions: ImageLibraryOptions & CameraOptions = {
    mediaType: 'photo',
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.8,
    saveToPhotos: false,
  };

  const handlePickAvatarFromCamera = async () => {
    setImagePickerModalVisible(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Không có quyền', 'Vui lòng cấp quyền máy ảnh trong Cài đặt thiết bị.');
      return;
    }

    launchCamera(pickerOptions, async response => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (asset?.uri) {
        await uploadAvatarFile(asset);
      }
    });
  };

  const handlePickAvatarFromLibrary = async () => {
    setImagePickerModalVisible(false);
    launchImageLibrary(pickerOptions, async response => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets?.[0];
      if (asset?.uri) {
        await uploadAvatarFile(asset);
      }
    });
  };

  const uploadAvatarFile = async (asset: Asset) => {
    if (!asset.uri) return;
    setIsUploadingAvatar(true);
    try {
      const res = await uploadImageToCloudinary(
        asset.uri,
        asset.fileName,
        asset.type
      );
      setEditAvatarUrl(res.url);
      Alert.alert('Thành công', 'Đã tải ảnh lên thành công. Nhấn "Lưu thay đổi" để áp dụng.');
    } catch (err: any) {
      console.warn('Upload avatar error:', err);
      Alert.alert('Lỗi tải ảnh', err.message || 'Không thể tải ảnh lên.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert('Lỗi', 'Họ tên không được để trống.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateUserProfile(trimmed, editAvatarUrl);
      setIsEditModalVisible(false);
      Alert.alert('Thành công', 'Hồ sơ cá nhân đã được cập nhật!');
    } catch (err: any) {
      console.warn('Update profile error:', err);
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (e) {
              console.warn('Logout error:', e);
            }
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cài đặt</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatarContainer}>
            <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
            <View style={styles.profileOnlineDot} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name || 'Người dùng'}</Text>
            <Text style={styles.profileEmail}>{user.email || ''}</Text>
            <Text style={styles.profilePhone}>🟢 Đang hoạt động</Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={handleOpenEditProfile}
            activeOpacity={0.7}>
            <Text style={styles.editProfileBtnIcon}>✏️</Text>
            <Text style={styles.editProfileBtnText}>Sửa</Text>
          </TouchableOpacity>
        </View>

        
        

        
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>TÙY CHỈNH ỨNG DỤNG</Text>

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

      {/* MODAL CHỈNH SỬA HỒ SƠ */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSavingProfile) setIsEditModalVisible(false);
        }}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isSavingProfile) setIsEditModalVisible(false);
          }}>
          <Pressable style={styles.editModalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.editModalTitle}>Chỉnh sửa hồ sơ</Text>

            {/* Avatar & nút đổi ảnh */}
            <TouchableOpacity
              style={styles.avatarEditWrapper}
              onPress={() => !isUploadingAvatar && setImagePickerModalVisible(true)}
              activeOpacity={0.8}>
              <Image
                source={{
                  uri:
                    editAvatarUrl ||
                    'https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff',
                }}
                style={styles.editModalAvatar}
              />
              <View style={styles.cameraBadge}>
                <Text style={styles.cameraBadgeIcon}>📷</Text>
              </View>
              {isUploadingAvatar && (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.avatarHintText}>
              {isUploadingAvatar ? 'Đang tải ảnh lên...' : 'Chạm để đổi ảnh đại diện'}
            </Text>

            {/* Nhập họ tên */}
            <Text style={styles.inputLabel}>Họ và tên</Text>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nhập họ và tên..."
              placeholderTextColor={colors.textMuted}
              maxLength={50}
            />

            {/* Nút hành động */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isSavingProfile || isUploadingAvatar}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  (isSavingProfile || isUploadingAvatar) && styles.btnDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile || isUploadingAvatar}>
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL CHỌN NGUỒN ẢNH ĐẠI DIỆN */}
      <Modal
        visible={imagePickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePickerModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setImagePickerModalVisible(false)}>
          <Pressable style={styles.pickerModalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.pickerModalTitle}>Chọn ảnh đại diện</Text>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={handlePickAvatarFromCamera}>
              <Text style={styles.pickerOptionIcon}>📸</Text>
              <Text style={styles.pickerOptionText}>Chụp ảnh mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={handlePickAvatarFromLibrary}>
              <Text style={styles.pickerOptionIcon}>🖼️</Text>
              <Text style={styles.pickerOptionText}>Chọn từ thư viện ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setImagePickerModalVisible(false)}>
              <Text style={styles.pickerCancelBtnText}>Hủy</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  editProfileBtnIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  avatarEditWrapper: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  editModalAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.border,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  cameraBadgeIcon: {
    fontSize: 15,
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHintText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 22,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  pickerModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    marginBottom: 10,
  },
  pickerOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  pickerOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerCancelBtn: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
