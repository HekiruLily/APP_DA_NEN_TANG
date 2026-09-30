import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { CourseItem } from '../types/student';
import { CourseCard } from './CourseCard';

interface CourseListProps {
  courses: CourseItem[];
  searchQuery?: string;
  onCoursePress?: (course: CourseItem) => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  searchQuery = '',
  onCoursePress,
}) => {
  if (courses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>Không tìm thấy môn học</Text>
        <Text style={styles.emptySubtitle}>
          Không có môn học nào khớp với từ khóa "{searchQuery}". Vui lòng thử lại với từ khóa khác!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onPress={onCoursePress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
