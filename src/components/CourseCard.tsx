import React, { useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Pressable,
  StyleSheet,
} from 'react-native';
import { CourseItem } from '../types/student';

interface CourseCardProps {
  course: CourseItem;
  onPress?: (course: CourseItem) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isCompleted = course.progressPercent >= 100;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.965,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.animatedWrapper,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isCompleted && styles.cardCompletedBorder,
          pressed && styles.cardPressed,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress && onPress(course)}
        accessibilityRole="button"
        accessibilityLabel={`Môn học ${course.name}, ${
          isCompleted ? 'Đã hoàn thành 100%' : `Đang học, hoàn thành ${course.progressPercent}%`
        }`}
      >
        
        <View style={styles.topRow}>
          
          <View style={[styles.iconContainer, { backgroundColor: course.bgColor }]}>
            <Text style={styles.iconText}>{course.icon}</Text>
          </View>

          
          <View style={styles.infoContainer}>
            <View style={styles.codeRow}>
              <View style={[styles.codeBadge, { backgroundColor: course.bgColor }]}>
                <Text style={[styles.codeText, { color: course.color }]}>
                  {course.code}
                </Text>
              </View>

              
              <View
                style={[
                  styles.statusBadge,
                  isCompleted ? styles.statusBadgeCompleted : styles.statusBadgeLearning,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isCompleted ? styles.statusTextCompleted : styles.statusTextLearning,
                  ]}
                >
                  {isCompleted ? '✓ Đã hoàn thành' : '⏳ Đang học'}
                </Text>
              </View>
            </View>

            
            <Text style={styles.courseName} numberOfLines={2}>
              {course.name}
            </Text>

            
            <Text style={styles.instructorText} numberOfLines={1}>
              👨‍🏫 Giảng viên: {course.instructor}
            </Text>
          </View>
        </View>

        
        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleText}>📍 {course.schedule}</Text>
        </View>

        
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <View style={styles.lessonCountWrapper}>
              <Text style={styles.lessonLabel}>Số bài học:</Text>
              <Text style={styles.lessonValue}>
                {course.lessonsCount}/{course.totalLessons} bài
              </Text>
            </View>
            <View style={styles.percentWrapper}>
              <Text
                style={[
                  styles.percentValue,
                  { color: isCompleted ? '#10B981' : course.color },
                ]}
              >
                {course.progressPercent}%
              </Text>
            </View>
          </View>

          
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(course.progressPercent, 100)}%`,
                  backgroundColor: isCompleted ? '#10B981' : course.color,
                },
              ]}
            />
          </View>
        </View>

        
        <View style={styles.actionHintRow}>
          <Text style={styles.actionHintText}>
            {isCompleted ? 'Xem lại kết quả' : 'Chạm để xem chi tiết & bài tập'}
          </Text>
          <Text style={styles.actionArrow}>›</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardCompletedBorder: {
    borderColor: '#D1FAE5',
  },
  cardPressed: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgeLearning: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: '#059669',
  },
  statusTextLearning: {
    color: '#4F46E5',
  },
  courseName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  instructorText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  scheduleRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  scheduleText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lessonCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lessonLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  lessonValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  percentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  actionHintText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  actionArrow: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
    lineHeight: 16,
  },
});
