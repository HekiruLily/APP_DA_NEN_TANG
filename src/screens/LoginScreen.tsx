import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { login } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleLogin = () => {
    
    if (!username.trim() && !password.trim()) {
      setErrorMessage('Vui lòng nhập tài khoản và mật khẩu!');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('Tài khoản không được để trống!');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Mật khẩu không được để trống!');
      return;
    }

    setErrorMessage('');
    login(username.trim());
    
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>💬</Text>
          </View>
          <Text style={styles.appName}>ChatConnect</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tài khoản / Email</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên tài khoản hoặc email..."
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={text => {
                  setUsername(text);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu của bạn..."
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={secureText}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setSecureText(!secureText)}
                style={styles.eyeButton}>
                <Text style={styles.eyeIcon}>{secureText ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.8}>
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorBannerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeButton: {
    padding: 8,
  },
  eyeIcon: {
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
});
