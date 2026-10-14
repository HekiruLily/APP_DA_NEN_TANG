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
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Message } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

type ChatRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ChatDetailScreen: React.FC = () => {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = route.params;
  const { conversations, sendMessage } = useApp();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const activeConversation = conversations.find(c => c.user.id === user.id);
  const messages: Message[] = activeConversation?.messages || [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages.length]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    sendMessage(user, text.trim());
    setInputText('');
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    return (
      <View
        style={[
          styles.messageRow,
          item.isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}>
        {!item.isMe && (
          <Image source={{ uri: user.avatar }} style={styles.messageAvatar} />
        )}

        <View
          style={[
            styles.bubble,
            item.isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}>
          <Text
            style={[
              styles.bubbleText,
              item.isMe ? styles.bubbleTextMe : styles.bubbleTextOther,
            ]}>
            {item.text}
          </Text>
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
              <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
              {user.isOnline && <View style={styles.headerOnlineDot} />}
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={styles.headerStatus}>
                {user.isOnline ? '🟢 Trực tuyến' : '⚪ Ngoại tuyến'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.headerCallBtn}>
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerCallBtn}>
              <Text style={styles.callIcon}>🎥</Text>
            </TouchableOpacity>
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
              <Text style={styles.emptyText}>
                Hãy gửi lời chào đầu tiên đến {user.name}!
              </Text>
              <TouchableOpacity
                style={styles.waveButton}
                onPress={() => handleSend('Chào bạn nhé! 👋')}>
                <Text style={styles.waveButtonText}>Vẫy tay chào 👋</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {}
        

        {}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim().length > 0 && styles.sendButtonActive,
            ]}
            onPress={() => handleSend()}
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerStatus: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCallBtn: {
    padding: 8,
    marginLeft: 2,
  },
  callIcon: {
    fontSize: 18,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
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
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyAvatar: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  waveButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  waveButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  quickBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  quickChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  quickChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
});
