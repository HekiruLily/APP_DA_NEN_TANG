import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { RootStackParamList, MainTabParamList } from '../types';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';


import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChatDetailScreen } from '../screens/ChatDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const { totalUnreadChatsCount, unreadNotificationsCount } = useApp();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Tin nhắn',
          tabBarBadge:
            totalUnreadChatsCount > 0 ? totalUnreadChatsCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.badgeBg,
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconWrapper}>
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                💬
              </Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarLabel: 'Danh bạ',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconWrapper}>
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                👥
              </Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Thông báo',
          tabBarBadge:
            unreadNotificationsCount > 0
              ? unreadNotificationsCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.badgeBg,
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconWrapper}>
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                🔔
              </Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ focused }) => (
            <View style={styles.tabIconWrapper}>
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                ⚙️
              </Text>
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen
          name="ChatDetail"
          component={ChatDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  tabIconFocused: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
});
