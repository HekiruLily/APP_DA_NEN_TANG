import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NavTabId } from '../types/student';

interface BottomNavigationProps {
  activeTab: NavTabId;
  onTabPress: (tab: NavTabId) => void;
  safeAreaBottom?: number;
}

interface NavItem {
  id: NavTabId;
  label: string;
  icon: string;
  badge?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
  safeAreaBottom = 0,
}) => {
  const navItems: NavItem[] = [
    { id: 'home', label: 'Trang chủ', icon: '🏠' },
    { id: 'courses', label: 'Môn học', icon: '📖' },
    { id: 'assignments', label: 'Bài tập', icon: '📋', badge: 3 },
    { id: 'profile', label: 'Cá nhân', icon: '👤' },
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(safeAreaBottom, 10) },
      ]}
    >
      <View style={styles.content}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.tabButton}
              onPress={() => onTabPress(item.id)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              
              <View
                style={[
                  styles.iconContainer,
                  isActive && styles.iconContainerActive,
                ]}
              >
                <Text style={[styles.iconText, isActive && styles.iconTextActive]}>
                  {item.icon}
                </Text>

                
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>

              
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {item.label}
              </Text>

              
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
    paddingTop: 8,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: '#EEF2FF',
  },
  iconText: {
    fontSize: 20,
    opacity: 0.6,
  },
  iconTextActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4F46E5',
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
