import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Pressable,
  PermissionsAndroid,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  launchCamera,
  launchImageLibrary,
  ImageLibraryOptions,
  CameraOptions,
  Asset,
} from 'react-native-image-picker';
import { RootStackParamList, Message, User } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import {
  getChatId,
  listenUserStatus,
  setTypingStatus,
  listenTyping,
  updateReadStatus,
  listenReadStatus,
  listenMessagesPaginated,
  loadMoreOlderMessages,
  recallMessage,
  toggleReaction,
  formatLastSeen,
  formatMessageTime,
} from '../services/chatService';
import { listenGroupOnlineMembers } from '../services/groupService';
import { setActiveChat } from '../services/notificationService';
import { uploadImageToCloudinary } from '../services/uploadService';
import { requestLocationPermission, getCurrentLocation } from '../services/locationService';

type ChatRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

interface PendingUpload {
  tempId: string;
  localUri: string;
  fileName?: string;
  fileType?: string;
  timestamp: string;
  createdAt: number;
  isUploading: boolean;
  isFailed: boolean;
  errorMsg?: string;
}

export const ChatDetailScreen: React.FC = () => {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { conversationId, user: initialUser, convType, name: initialName } = route.params;
  const { user: currentUser, contacts, sendMessage } = useApp();

  const isGroup = convType === 'group' || (conversationId && !conversationId.includes('_'));

  const convId = useMemo(() => {
    if (conversationId) return conversationId;
    if (currentUser.id && initialUser?.id) return getChatId(currentUser.id, initialUser.id);
    return '';
  }, [conversationId, currentUser.id, initialUser?.id]);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [otherUser, setOtherUser] = useState<User>(
    initialUser || {
      id: '',
      name: initialName || (isGroup ? 'Nhóm trò chuyện' : 'Người dùng'),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        initialName || 'Group'
      )}&background=6366F1&color=fff&size=128`,
      isOnline: false,
    }
  );

  // Thông tin nhóm (tổng thành viên, thành viên online)
  const [groupInfo, setGroupInfo] = useState<{
    totalCount: number;
    onlineCount: number;
    name: string;
  }>({
    totalCount: 0,
    onlineCount: 0,
    name: initialName || 'Nhóm trò chuyện',
  });

  // Danh sách ảnh đang tải lên (hiển thị tạm)
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  // Xem ảnh toàn màn hình
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  // Modal chọn nguồn ảnh (Chụp hoặc Chọn từ thư viện)
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Trạng thái gõ
  const [typingUids, setTypingUids] = useState<string[]>([]);
  const typingTimerRef = useRef<any>(null);

  // Trạng thái đã xem của đối phương (dành cho chat 1-1)
  const [otherLastReadTime, setOtherLastReadTime] = useState<number | null>(null);

  // Phân trang
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  // Menu tương tác tin nhắn (Long Press)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Đặt trạng thái đang ở trong phòng chat này (activeChat) để không nhận notification cho chính phòng này
  useEffect(() => {
    if (!convId || !currentUser.id) return;
    setActiveChat(currentUser.id, convId);
    return () => {
      setActiveChat(currentUser.id, null);
    };
  }, [convId, currentUser.id]);

  // Cập nhật read status khi mở màn hình và khi có tin nhắn mới
  useEffect(() => {
    if (!convId || !currentUser.id) return;
    updateReadStatus(convId, currentUser.id);
  }, [convId, currentUser.id, messages.length]);

  // Lắng nghe dữ liệu cuộc trò chuyện
  useEffect(() => {
    if (!convId || !currentUser.id) return;

    // 1. Lắng nghe tin nhắn phân trang (20 tin mới nhất)
    const unsubMessages = listenMessagesPaginated(
      convId,
      currentUser.id,
      20,
      newMessages => {
        setMessages(newMessages);
      }
    );

    // 2. Lắng nghe trạng thái đang gõ
    const unsubTyping = listenTyping(convId, currentUser.id, uids => {
      setTypingUids(uids);
    });

    let unsubStatus: (() => void) | null = null;
    let unsubRead: (() => void) | null = null;
    let unsubGroup: (() => void) | null = null;

    if (isGroup) {
      // Nhóm: Lắng nghe số lượng thành viên và số thành viên online
      unsubGroup = listenGroupOnlineMembers(convId, info => {
        setGroupInfo({
          totalCount: info.totalCount,
          onlineCount: info.onlineCount,
          name: info.name,
        });
      });
    } else if (initialUser?.id) {
      // 1-1: Lắng nghe trạng thái user (online, lastSeen)
      unsubStatus = listenUserStatus(initialUser.id, updatedData => {
        setOtherUser(prev => ({
          ...prev,
          name: updatedData.name || prev.name,
          avatar: updatedData.avatar || prev.avatar,
          isOnline: !!updatedData.isOnline,
          statusText: updatedData.statusText || prev.statusText,
          lastSeen: updatedData.lastSeen !== undefined ? updatedData.lastSeen : prev.lastSeen,
        }));
      });

      // 1-1: Lắng nghe thời điểm đọc cuối của người kia
      unsubRead = listenReadStatus(convId, initialUser.id, readTimestamp => {
        setOtherLastReadTime(readTimestamp);
      });
    }

    return () => {
      // HỦY TẤT CẢ LISTENER TRONG CLEANUP
      unsubMessages();
      unsubTyping();
      if (unsubStatus) unsubStatus();
      if (unsubRead) unsubRead();
      if (unsubGroup) unsubGroup();

      // Tắt trạng thái typing nếu người dùng rời màn hình đột ngột
      setTypingStatus(convId, currentUser.id, false);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, [convId, currentUser.id, initialUser?.id, isGroup]);

  // Tự động cuộn xuống cuối khi có tin mới hoặc khi có ảnh đang upload
  useEffect(() => {
    if (messages.length > 0 || pendingUploads.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, pendingUploads.length]);

  // Xử lý khi người dùng gõ phím (typing 3s timeout)
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!convId || !currentUser.id) return;

    if (text.trim().length > 0) {
      setTypingStatus(convId, currentUser.id, true);

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(() => {
        setTypingStatus(convId, currentUser.id, false);
      }, 3000);
    } else {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      setTypingStatus(convId, currentUser.id, false);
    }
  };

  // Gửi tin nhắn văn bản
  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text) return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    setTypingStatus(convId, currentUser.id, false);
    setInputText('');

    try {
      await sendMessage(
        convId,
        text,
        'text',
        undefined,
        undefined,
        isGroup ? undefined : otherUser
      );
    } catch (err) {
      console.warn('Send message error:', err);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng kiểm tra lại mạng.');
    }
  };

  // Xin quyền truy cập máy ảnh
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Quyền truy cập Máy ảnh',
          message: 'Ứng dụng cần quyền sử dụng máy ảnh để chụp và gửi hình ảnh.',
          buttonNeutral: 'Để sau',
          buttonNegative: 'Từ chối',
          buttonPositive: 'Đồng ý',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else {
        Alert.alert(
          'Quyền bị từ chối',
          'Bạn đã từ chối quyền truy cập máy ảnh. Vui lòng bật quyền trong Cài đặt của thiết bị.'
        );
        return false;
      }
    } catch (err) {
      console.warn('Camera permission error:', err);
      return false;
    }
  };

  // Options chọn/chụp ảnh: thu nhỏ cạnh dài <= 1024px
  const pickerOptions: ImageLibraryOptions & CameraOptions = {
    mediaType: 'photo',
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    saveToPhotos: false,
  };

  // Bắt đầu upload ảnh
  const startUploadImage = async (asset: Asset) => {
    if (!asset.uri) return;

    const tempId = `upload_${Date.now()}`;
    const now = Date.now();
    const timeStr = formatMessageTime(now);

    const pendingItem: PendingUpload = {
      tempId,
      localUri: asset.uri,
      fileName: asset.fileName || `photo_${now}.jpg`,
      fileType: asset.type || 'image/jpeg',
      timestamp: timeStr,
      createdAt: now,
      isUploading: true,
      isFailed: false,
    };

    setPendingUploads(prev => [...prev, pendingItem]);
    await executeUpload(pendingItem);
  };

  // Thực hiện tải ảnh lên Cloudinary
  const executeUpload = async (item: PendingUpload) => {
    setPendingUploads(prev =>
      prev.map(p =>
        p.tempId === item.tempId ? { ...p, isUploading: true, isFailed: false } : p
      )
    );

    try {
      const uploadResult = await uploadImageToCloudinary(
        item.localUri,
        item.fileName,
        item.fileType
      );

      // Gửi tin nhắn ảnh vào Firebase (hỗ trợ cả nhóm và 1-1)
      await sendMessage(
        convId,
        '',
        'image',
        undefined,
        uploadResult.url,
        isGroup ? undefined : otherUser
      );

      setPendingUploads(prev => prev.filter(p => p.tempId !== item.tempId));
    } catch (err: any) {
      console.warn('Upload error:', err);
      setPendingUploads(prev =>
        prev.map(p =>
          p.tempId === item.tempId
            ? {
                ...p,
                isUploading: false,
                isFailed: true,
                errorMsg: err.message || 'Không thể tải ảnh lên',
              }
            : p
        )
      );
    }
  };

  const handleRetryUpload = (item: PendingUpload) => {
    executeUpload(item);
  };

  const handleCancelUpload = (tempId: string) => {
    setPendingUploads(prev => prev.filter(p => p.tempId !== tempId));
  };

  // Chụp ảnh mới
  const handleTakePhoto = async () => {
    setImageModalVisible(false);
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await launchCamera(pickerOptions);
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Lỗi chụp ảnh', result.errorMessage || 'Không thể mở máy ảnh.');
        return;
      }
      if (result.assets && result.assets.length > 0) {
        await startUploadImage(result.assets[0]);
      }
    } catch (err) {
      console.warn('Launch camera error:', err);
    }
  };

  // Chọn ảnh từ thư viện
  const handlePickImage = async () => {
    setImageModalVisible(false);

    try {
      const result = await launchImageLibrary(pickerOptions);
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Lỗi chọn ảnh', result.errorMessage || 'Không thể mở thư viện ảnh.');
        return;
      }
      if (result.assets && result.assets.length > 0) {
        await startUploadImage(result.assets[0]);
      }
    } catch (err) {
      console.warn('Launch library error:', err);
    }
  };

  // Gửi vị trí hiện tại
  const handleSendLocation = async () => {
    if (isSendingLocation) return;
    setIsSendingLocation(true);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Quyền truy cập bị từ chối',
          'Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép ứng dụng truy cập vị trí trong Cài đặt để gửi tọa độ.',
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Gửi vị trí mẫu (TP.HCM)',
              onPress: async () => {
                const sampleCoords = {
                  latitude: 10.776889,
                  longitude: 106.700806,
                };
                await sendMessage(
                  convId,
                  '',
                  'location',
                  sampleCoords,
                  undefined,
                  isGroup ? undefined : otherUser
                );
              },
            },
          ]
        );
        setIsSendingLocation(false);
        return;
      }

      const coords = await getCurrentLocation();
      await sendMessage(
        convId,
        '',
        'location',
        coords,
        undefined,
        isGroup ? undefined : otherUser
      );
    } catch (err: any) {
      console.warn('Location error:', err);
      Alert.alert(
        'Không thể lấy vị trí',
        'Vui lòng bật GPS trên thiết bị hoặc kiểm tra kết nối mạng rồi thử lại.'
      );
    } finally {
      setIsSendingLocation(false);
    }
  };

  // Tải thêm 20 tin nhắn cũ hơn khi kéo lên trên
  const handleLoadMoreOlder = async () => {
    if (isLoadingMore || !hasMoreOlder || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestCreatedAt = messages[0].createdAt || 0;
      const older = await loadMoreOlderMessages(
        convId,
        currentUser.id,
        oldestCreatedAt,
        20
      );

      if (older.length === 0) {
        setHasMoreOlder(false);
      } else {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueOlder = older.filter(m => !existingIds.has(m.id));
          return [...uniqueOlder, ...prev];
        });
      }
    } catch (err) {
      console.warn('Load more older messages error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Mở menu tương tác khi nhấn giữ tin nhắn
  const handleLongPressMessage = (msg: Message) => {
    if (msg.senderId === 'system') return; // Không menu cho tin hệ thống
    setSelectedMessage(msg);
    setMenuVisible(true);
  };

  // Sao chép tin nhắn
  const handleCopyMessage = () => {
    if (!selectedMessage) return;
    const content =
      selectedMessage.type === 'location' && selectedMessage.location
        ? `${selectedMessage.location.latitude}, ${selectedMessage.location.longitude}`
        : selectedMessage.type === 'image' && selectedMessage.imageUrl
        ? selectedMessage.imageUrl
        : selectedMessage.text;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ClipboardModule = require('@react-native-clipboard/clipboard');
      const SafeClipboard = ClipboardModule?.default || ClipboardModule;
      if (SafeClipboard && typeof SafeClipboard.setString === 'function') {
        SafeClipboard.setString(content);
        Alert.alert('Thành công', 'Đã sao chép tin nhắn vào bộ nhớ tạm.');
        setMenuVisible(false);
        return;
      }
    } catch (e) {
      // Fallback
    }

    Alert.alert('Đã sao chép tin nhắn', content);
    setMenuVisible(false);
  };

  // Thu hồi tin nhắn
  const handleRecallMessage = () => {
    if (!selectedMessage) return;

    if (!selectedMessage.isMe) {
      Alert.alert('Không thể thu hồi', 'Bạn chỉ có thể thu hồi tin nhắn do chính bạn gửi.');
      return;
    }

    if (selectedMessage.recalled) {
      Alert.alert('Thông báo', 'Tin nhắn này đã được thu hồi trước đó.');
      return;
    }

    Alert.alert(
      'Thu hồi tin nhắn',
      'Bạn có chắc chắn muốn thu hồi tin nhắn này với tất cả mọi người?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: async () => {
            try {
              const isLastMessage =
                messages.length > 0 &&
                messages[messages.length - 1].id === selectedMessage.id;

              await recallMessage({
                convId,
                messageId: selectedMessage.id,
                currentUid: currentUser.id,
                isLastMessage,
              });
              setMenuVisible(false);
            } catch (err) {
              console.warn('Recall error:', err);
              Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  // Thả hoặc đổi cảm xúc (ghi notification cho người nhận)
  const handleSelectReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    const currentReaction = selectedMessage.reactions?.[currentUser.id];
    setMenuVisible(false);

    try {
      await toggleReaction({
        convId,
        messageId: selectedMessage.id,
        uid: currentUser.id,
        userName: currentUser.name,
        targetSenderId: selectedMessage.senderId,
        emoji,
        currentReaction,
      });
    } catch (err) {
      console.warn('Reaction error:', err);
    }
  };

  // Mở Google Maps
  const handleOpenMap = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết Google Maps.');
    });
  };

  // Tìm tin nhắn cuối cùng do currentUser gửi (chỉ áp dụng cho 1-1 để hiện Đã gửi/Đã xem)
  const lastMyMessage = useMemo(() => {
    if (isGroup || pendingUploads.length > 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isMe) {
        return messages[i];
      }
    }
    return null;
  }, [messages, pendingUploads, isGroup]);

  // Render thanh cảm xúc tổng hợp dưới bong bóng tin
  const renderReactionsBar = (reactionsObj?: { [uid: string]: string }) => {
    if (!reactionsObj) return null;
    const entries = Object.entries(reactionsObj);
    if (entries.length === 0) return null;

    const counts: { [emoji: string]: number } = {};
    entries.forEach(([, emoji]) => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });

    return (
      <View style={styles.reactionsBadgeContainer}>
        {Object.entries(counts).map(([emoji, count]) => (
          <View key={emoji} style={styles.reactionPill}>
            <Text style={styles.reactionEmojiText}>{emoji}</Text>
            {count > 1 && <Text style={styles.reactionCountText}>{count}</Text>}
          </View>
        ))}
      </View>
    );
  };

  // Render từng item tin nhắn
  const renderMessageItem = ({ item }: { item: Message }) => {
    // 1. Tin nhắn hệ thống (ví dụ: tạo nhóm)
    if (item.senderId === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
        </View>
      );
    }

    const isLocation = item.type === 'location' && item.location;
    const isImage = item.type === 'image' && item.imageUrl;
    const isRecalled = !!item.recalled;
    const isThisLastMyMsg = !isGroup && lastMyMessage && lastMyMessage.id === item.id;

    let deliveryStatusText: string | null = null;
    if (isThisLastMyMsg) {
      if (otherLastReadTime && otherLastReadTime >= (item.createdAt || 0)) {
        deliveryStatusText = `Đã xem · ${formatMessageTime(otherLastReadTime)}`;
      } else {
        deliveryStatusText = 'Đã gửi';
      }
    }

    // Lấy avatar người gửi (nếu có trong danh bạ)
    const senderContact = contacts.find(c => c.id === item.senderId);
    const senderAvatar =
      senderContact?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        item.senderName || 'User'
      )}&background=4F46E5&color=fff&size=128`;

    return (
      <View style={styles.messageItemWrapper}>
        <View
          style={[
            styles.messageRow,
            item.isMe ? styles.messageRowMe : styles.messageRowOther,
          ]}>
          {!item.isMe && (
            <Image source={{ uri: senderAvatar }} style={styles.messageAvatar} />
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => handleLongPressMessage(item)}
            style={[
              styles.bubble,
              item.isMe ? styles.bubbleMe : styles.bubbleOther,
              isLocation && !isRecalled && styles.bubbleLocation,
              isImage && !isRecalled && styles.bubbleImageContainer,
              isRecalled && styles.bubbleRecalled,
            ]}>
            {/* TRONG NHÓM: Tin của người khác hiển thị tên người gửi phía trên bong bóng */}
            {isGroup && !item.isMe && !isRecalled && (
              <Text style={styles.senderNameText} numberOfLines={1}>
                {item.senderName || senderContact?.name || 'Thành viên'}
              </Text>
            )}

            {isRecalled ? (
              <View style={styles.recalledContent}>
                <Text style={styles.recalledIcon}>🚫</Text>
                <Text
                  style={[
                    styles.recalledText,
                    item.isMe ? styles.recalledTextMe : styles.recalledTextOther,
                  ]}>
                  Tin nhắn đã được thu hồi
                </Text>
              </View>
            ) : isImage ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setViewingImageUrl(item.imageUrl || null)}
                style={styles.imageWrapper}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : isLocation ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  handleOpenMap(item.location!.latitude, item.location!.longitude)
                }
                style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <View style={styles.locationIconBadge}>
                    <Text style={styles.locationIcon}>📍</Text>
                  </View>
                  <View style={styles.locationHeaderText}>
                    <Text
                      style={[
                        styles.locationTitle,
                        item.isMe ? styles.textWhite : styles.textDark,
                      ]}>
                      Vị trí hiện tại
                    </Text>
                    <Text
                      style={[
                        styles.locationCoords,
                        item.isMe ? styles.textWhiteMuted : styles.textDarkMuted,
                      ]}>
                      {item.location!.latitude.toFixed(5)},{' '}
                      {item.location!.longitude.toFixed(5)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.mapButton,
                    item.isMe ? styles.mapButtonMe : styles.mapButtonOther,
                  ]}>
                  <Text style={styles.mapButtonIcon}>🗺️</Text>
                  <Text
                    style={[
                      styles.mapButtonText,
                      item.isMe ? styles.mapButtonTextMe : styles.mapButtonTextOther,
                    ]}>
                    Mở trên Google Maps
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text
                style={[
                  styles.bubbleText,
                  item.isMe ? styles.bubbleTextMe : styles.bubbleTextOther,
                ]}>
                {item.text}
              </Text>
            )}

            <Text
              style={[
                styles.bubbleTime,
                isImage && styles.bubbleTimeImage,
                item.isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther,
              ]}>
              {item.timestamp}
            </Text>

            {!isRecalled && renderReactionsBar(item.reactions)}
          </TouchableOpacity>
        </View>

        {deliveryStatusText && (
          <Text style={styles.deliveryStatusText}>{deliveryStatusText}</Text>
        )}
      </View>
    );
  };

  // Render các tin nhắn ảnh tạm đang upload
  const renderPendingUploadItem = (item: PendingUpload) => {
    return (
      <View key={item.tempId} style={styles.messageItemWrapper}>
        <View style={[styles.messageRow, styles.messageRowMe]}>
          <View style={[styles.bubble, styles.bubbleMe, styles.bubbleImageContainer]}>
            <View style={styles.pendingImageWrapper}>
              <Image
                source={{ uri: item.localUri }}
                style={styles.messageImage}
                resizeMode="cover"
              />

              {item.isUploading && (
                <View style={styles.uploadLoadingOverlay}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.uploadLoadingText}>Đang tải lên...</Text>
                </View>
              )}

              {item.isFailed && (
                <View style={styles.uploadErrorOverlay}>
                  <Text style={styles.uploadErrorIcon}>⚠️</Text>
                  <Text style={styles.uploadErrorText}>Tải ảnh thất bại</Text>
                  <View style={styles.uploadActionRow}>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => handleRetryUpload(item)}>
                      <Text style={styles.retryButtonText}>🔄 Thử lại</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelUploadButton}
                      onPress={() => handleCancelUpload(item.tempId)}>
                      <Text style={styles.cancelUploadButtonText}>✕ Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <Text style={[styles.bubbleTime, styles.bubbleTimeImage, styles.bubbleTimeMe]}>
              {item.timestamp}
            </Text>
          </View>
        </View>
        <Text style={styles.deliveryStatusText}>
          {item.isUploading ? 'Đang gửi ảnh…' : 'Gửi thất bại'}
        </Text>
      </View>
    );
  };

  // Tên hiển thị trên Header
  const headerTitle = useMemo(() => {
    if (isGroup) {
      return groupInfo.name || initialName || 'Nhóm trò chuyện';
    }
    return otherUser.name;
  }, [isGroup, groupInfo.name, initialName, otherUser.name]);

  // Chuỗi trạng thái trên Header
  const headerSubtitleText = useMemo(() => {
    if (typingUids.length > 0) {
      if (isGroup) {
        const typingNames = typingUids
          .map(uid => contacts.find(c => c.id === uid)?.name || 'Ai đó')
          .slice(0, 2);
        return `${typingNames.join(', ')} đang soạn tin…`;
      }
      return 'đang soạn tin…';
    }

    if (isGroup) {
      return `${groupInfo.totalCount} thành viên · ${groupInfo.onlineCount} online`;
    }

    if (otherUser.isOnline) {
      return '🟢 Trực tuyến';
    }
    return formatLastSeen(otherUser.lastSeen);
  }, [typingUids, isGroup, contacts, groupInfo, otherUser.isOnline, otherUser.lastSeen]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerUserInfo}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
              {!isGroup && otherUser.isOnline && <View style={styles.headerOnlineDot} />}
              {isGroup && (
                <View style={styles.groupHeaderBadge}>
                  <Text style={styles.groupHeaderBadgeText}>👥</Text>
                </View>
              )}
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {headerTitle}
              </Text>
              <Text
                style={[
                  styles.headerStatus,
                  typingUids.length > 0 && styles.headerStatusTyping,
                  !isGroup && otherUser.isOnline && typingUids.length === 0 && styles.headerStatusOnline,
                ]}>
                {headerSubtitleText}
              </Text>
            </View>
          </View>
        </View>

        {/* DANH SÁCH TIN NHẮN */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            hasMoreOlder && messages.length >= 20 ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={handleLoadMoreOlder}
                disabled={isLoadingMore}>
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>⬆ Tải thêm tin nhắn cũ hơn</Text>
                )}
              </TouchableOpacity>
            ) : undefined
          }
          ListFooterComponent={
            pendingUploads.length > 0 ? (
              <View>{pendingUploads.map(renderPendingUploadItem)}</View>
            ) : undefined
          }
          ListEmptyComponent={
            pendingUploads.length === 0 ? (
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyAvatar}>👋</Text>
                <Text style={styles.emptyTitle}>
                  {isGroup ? 'Bắt đầu trò chuyện nhóm' : 'Bắt đầu cuộc trò chuyện'}
                </Text>
                <Text style={styles.emptyText}>
                  {isGroup
                    ? `Gửi tin nhắn đầu tiên đến nhóm "${headerTitle}"!`
                    : `Gửi tin nhắn, hình ảnh hoặc chia sẻ vị trí của bạn với ${otherUser.name}!`}
                </Text>
                <TouchableOpacity
                  style={styles.waveButton}
                  onPress={() => handleSendText('Chào mọi người nhé! 👋')}>
                  <Text style={styles.waveButtonText}>Vẫy tay chào 👋</Text>
                </TouchableOpacity>
              </View>
            ) : undefined
          }
        />

        {/* THANH ĐANG SOẠN TIN NHỎ TRÊN INPUT */}
        {typingUids.length > 0 && (
          <View style={styles.typingIndicatorRow}>
            <Text style={styles.typingIndicatorText}>
              ✍️ {headerSubtitleText}
            </Text>
          </View>
        )}

        {/* INPUT SOẠN TIN */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => setImageModalVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Gửi hình ảnh">
            <Text style={styles.mediaButtonIcon}>📷</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mediaButton,
              isSendingLocation && styles.buttonDisabled,
            ]}
            onPress={handleSendLocation}
            disabled={isSendingLocation}
            activeOpacity={0.7}
            accessibilityLabel="Gửi vị trí">
            {isSendingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.mediaButtonIcon}>📍</Text>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder={isGroup ? 'Nhập tin nhắn đến nhóm...' : 'Nhập tin nhắn...'}
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim().length > 0 && styles.sendButtonActive,
            ]}
            onPress={() => handleSendText()}
            disabled={!inputText.trim()}
            activeOpacity={0.8}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>

        {/* MODAL CHỌN NGUỒN ẢNH */}
        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setImageModalVisible(false)}>
            <Pressable style={styles.menuCard} onPress={e => e.stopPropagation()}>
              <Text style={styles.imageModalTitle}>Gửi hình ảnh</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleTakePhoto}>
                <Text style={styles.menuItemIcon}>📸</Text>
                <Text style={styles.menuItemText}>Chụp ảnh mới</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handlePickImage}>
                <Text style={styles.menuItemIcon}>🖼️</Text>
                <Text style={styles.menuItemText}>Chọn từ thư viện ảnh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuCancelButton}
                onPress={() => setImageModalVisible(false)}>
                <Text style={styles.menuCancelText}>Đóng</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* MODAL XEM ẢNH TOÀN MÀN HÌNH */}
        <Modal
          visible={!!viewingImageUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setViewingImageUrl(null)}>
          <SafeAreaView style={styles.fullScreenContainer}>
            <StatusBar barStyle="light-content" />
            <View style={styles.fullScreenHeader}>
              <TouchableOpacity
                style={styles.fullScreenCloseBtn}
                onPress={() => setViewingImageUrl(null)}>
                <Text style={styles.fullScreenCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fullScreenImageWrapper}>
              {viewingImageUrl && (
                <Image
                  source={{ uri: viewingImageUrl }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </SafeAreaView>
        </Modal>

        {/* MODAL MENU KHI NHẤN GIỮ TIN NHẮN */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setMenuVisible(false)}>
            <Pressable style={styles.menuCard} onPress={e => e.stopPropagation()}>
              <View style={styles.reactionBar}>
                {AVAILABLE_REACTIONS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionButton,
                      selectedMessage?.reactions?.[currentUser.id] === emoji &&
                        styles.reactionButtonSelected,
                    ]}
                    onPress={() => handleSelectReaction(emoji)}>
                    <Text style={styles.reactionEmojiIcon}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCopyMessage}>
                <Text style={styles.menuItemIcon}>📋</Text>
                <Text style={styles.menuItemText}>
                  {selectedMessage?.type === 'image'
                    ? 'Sao chép liên kết ảnh'
                    : 'Sao chép tin nhắn'}
                </Text>
              </TouchableOpacity>

              {selectedMessage?.isMe && !selectedMessage?.recalled && (
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={handleRecallMessage}>
                  <Text style={styles.menuItemIcon}>↩️</Text>
                  <Text style={[styles.menuItemText, styles.menuItemDangerText]}>
                    Thu hồi tin nhắn
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuCancelButton}
                onPress={() => setMenuVisible(false)}>
                <Text style={styles.menuCancelText}>Đóng</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  backIcon: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '700',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.border,
  },
  headerOnlineDot: {
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
  groupHeaderBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  groupHeaderBadgeText: {
    fontSize: 10,
  },
  nameContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerStatusOnline: {
    color: '#059669',
    fontWeight: '600',
  },
  headerStatusTyping: {
    color: colors.primary,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexGrow: 1,
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  loadMoreText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  systemMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  messageItemWrapper: {
    marginVertical: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    position: 'relative',
  },
  senderNameText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 3,
  },
  bubbleLocation: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 220,
  },
  bubbleImageContainer: {
    padding: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  pendingImageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadLoadingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  uploadErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
  },
  uploadErrorIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  uploadErrorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelUploadButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  cancelUploadButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  bubbleMe: {
    backgroundColor: colors.bubbleMy,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bubbleRecalled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recalledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  recalledIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  recalledText: {
    fontSize: 13.5,
    fontStyle: 'italic',
  },
  recalledTextMe: {
    color: '#64748B',
  },
  recalledTextOther: {
    color: '#64748B',
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: colors.bubbleMyText,
  },
  bubbleTextOther: {
    color: colors.bubbleOtherText,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeImage: {
    marginTop: 2,
    marginRight: 6,
    marginBottom: 2,
  },
  bubbleTimeMe: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  bubbleTimeOther: {
    color: colors.textMuted,
  },
  deliveryStatusText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
    marginRight: 4,
    fontStyle: 'italic',
  },
  reactionsBadgeContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -10,
    right: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  reactionEmojiText: {
    fontSize: 12,
  },
  reactionCountText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 2,
    fontWeight: '700',
  },
  locationCard: {
    paddingVertical: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationIcon: {
    fontSize: 18,
  },
  locationHeaderText: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  locationCoords: {
    fontSize: 11.5,
    marginTop: 2,
  },
  textWhite: {
    color: colors.textWhite,
  },
  textDark: {
    color: colors.textPrimary,
  },
  textWhiteMuted: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  textDarkMuted: {
    color: colors.textSecondary,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  mapButtonMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  mapButtonOther: {
    backgroundColor: colors.primaryLight,
  },
  mapButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  mapButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  mapButtonTextMe: {
    color: colors.textWhite,
  },
  mapButtonTextOther: {
    color: colors.primaryDark,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyAvatar: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  waveButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  waveButtonText: {
    color: colors.primaryDark,
    fontSize: 13.5,
    fontWeight: '700',
  },
  typingIndicatorRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: colors.background,
  },
  typingIndicatorText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  mediaButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mediaButtonIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14.5,
    color: colors.textPrimary,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  sendIcon: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  imageModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  reactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    marginBottom: 10,
  },
  reactionButton: {
    padding: 6,
    borderRadius: 16,
  },
  reactionButtonSelected: {
    backgroundColor: colors.primaryLight,
    transform: [{ scale: 1.2 }],
  },
  reactionEmojiIcon: {
    fontSize: 26,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuItemDanger: {
    backgroundColor: '#FEF2F2',
  },
  menuItemDangerText: {
    color: '#DC2626',
  },
  menuCancelButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
  },
  menuCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  fullScreenCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  fullScreenImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});
