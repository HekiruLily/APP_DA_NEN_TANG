import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Message, User } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { getChatId, listenMessages, listenUserStatus } from '../services/chatService';
import { requestLocationPermission, getCurrentLocation } from '../services/locationService';

type ChatRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ChatDetailScreen: React.FC = () => {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user: initialUser } = route.params;
  const { user: currentUser, sendMessage, markConversationAsRead } = useApp();

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [otherUser, setOtherUser] = useState<User>(initialUser);

  const flatListRef = useRef<FlatList>(null);

  
  useEffect(() => {
    if (!currentUser.id || !initialUser.id) return;

    const chatId = getChatId(currentUser.id, initialUser.id);

    
    markConversationAsRead(initialUser.id);

    
    const unsubscribeMessages = listenMessages(
      chatId,
      currentUser.id,
      incomingMessages => {
        setMessages(incomingMessages);
      }
    );

    
    const unsubscribeStatus = listenUserStatus(
      initialUser.id,
      updatedUserData => {
        setOtherUser(prev => ({
          ...prev,
          name: updatedUserData.name || prev.name,
          avatar: updatedUserData.avatar || prev.avatar,
          isOnline: !!updatedUserData.isOnline,
          statusText: updatedUserData.statusText || prev.statusText,
        }));
      }
    );

    
    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
      
      markConversationAsRead(initialUser.id);
    };
  }, [currentUser.id, initialUser.id]);

  
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  
  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text) return;

    setInputText('');
    try {
      await sendMessage(otherUser, text, 'text');
    } catch (err) {
      console.warn('Send message error:', err);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng kiểm tra lại mạng.');
    }
  };

  
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
                await sendMessage(otherUser, '', 'location', sampleCoords);
              },
            },
          ]
        );
        setIsSendingLocation(false);
        return;
      }

      const coords = await getCurrentLocation();
      await sendMessage(otherUser, '', 'location', coords);
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

  
  const handleOpenMap = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết Google Maps.');
    });
  };

  
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isLocation = item.type === 'location' && item.location;

    return (
      <View
        style={[
          styles.messageRow,
          item.isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}>
        {!item.isMe && (
          <Image source={{ uri: otherUser.avatar }} style={styles.messageAvatar} />
        )}

        <View
          style={[
            styles.bubble,
            item.isMe ? styles.bubbleMe : styles.bubbleOther,
            isLocation && styles.bubbleLocation,
          ]}>
          {isLocation ? (
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
              item.isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther,
            ]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {}
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
              {otherUser.isOnline && <View style={styles.headerOnlineDot} />}
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {otherUser.name}
              </Text>
              <Text
                style={[
                  styles.headerStatus,
                  otherUser.isOnline && styles.headerStatusOnline,
                ]}>
                {otherUser.isOnline ? '🟢 Đang hoạt động' : '⚪ Ngoại tuyến'}
              </Text>
            </View>
          </View>
        </View>

        {}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyAvatar}>👋</Text>
              <Text style={styles.emptyTitle}>Bắt đầu cuộc trò chuyện</Text>
              <Text style={styles.emptyText}>
                Gửi tin nhắn hoặc chia sẻ vị trí của bạn với {otherUser.name}!
              </Text>
              <TouchableOpacity
                style={styles.waveButton}
                onPress={() => handleSendText('Chào bạn nhé! 👋')}>
                <Text style={styles.waveButtonText}>Vẫy tay chào 👋</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {}
        <View style={styles.inputContainer}>
          {}
          <TouchableOpacity
            style={[
              styles.locationButton,
              isSendingLocation && styles.buttonDisabled,
            ]}
            onPress={handleSendLocation}
            disabled={isSendingLocation}
            activeOpacity={0.7}
            accessibilityLabel="Gửi vị trí">
            {isSendingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.locationButtonIcon}>📍</Text>
            )}
          </TouchableOpacity>

          {}
          <TextInput
            style={styles.textInput}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          {}
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
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
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
  },
  bubbleLocation: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 220,
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
  bubbleTimeMe: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  bubbleTimeOther: {
    color: colors.textMuted,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationButtonIcon: {
    fontSize: 20,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
});
