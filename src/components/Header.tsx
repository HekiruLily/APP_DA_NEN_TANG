import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { StudentProfile } from '../types/student';

interface HeaderProps {
  student: StudentProfile;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  student,
  onNotificationPress,
  onProfilePress,
}) => {
  return (
    <View style={styles.container}>
      
      <View style={styles.leftSection}>
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>Xin chào,</Text>
        </View>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {student.studentId} • {student.major}
          </Text>
        </View>
      </View>

      
      <View style={styles.rightSection}>
        
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotificationPress}
          activeOpacity={0.7}
          accessibilityLabel="Thông báo"
          accessibilityRole="button"
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {student.unreadNotifications > 0 && (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>
                {student.unreadNotifications > 9 ? '9+' : student.unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={onProfilePress}
          activeOpacity={0.8}
          accessibilityLabel="Hồ sơ cá nhân"
          accessibilityRole="button"
        >
          <View style={styles.avatarIconBox}>
            <Text style={styles.avatarIconText}>🎓</Text>
          </View>
          
          <View style={styles.onlineIndicator} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  leftSection: {
    flex: 1,
    paddingRight: 10,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
  },
  greetingWave: {
    fontSize: 14,
    marginLeft: 4,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  badgeContainer: {
    marginTop: 4,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIconText: {
    fontSize: 22,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
