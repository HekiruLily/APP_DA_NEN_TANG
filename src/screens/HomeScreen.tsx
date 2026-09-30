import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Header,
  StatCards,
  SearchBar,
  CategoryFilter,
  CourseList,
  CourseDetailModal,
  BottomNavigation,
} from '../components';
import {
  mockStudent,
  mockStatistics,
  mockCourses,
} from '../data/mockData';
import { CourseItem, NavTabId, StatisticItem, CategoryFilterType } from '../types/student';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterType>('all');

  const [activeTab, setActiveTab] = useState<NavTabId>('home');

  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);

  const counts = useMemo(() => {
    return {
      all: mockCourses.length,
      in_progress: mockCourses.filter((c) => c.progressPercent < 100).length,
      completed: mockCourses.filter((c) => c.progressPercent >= 100).length,
    };
  }, []);

  const filteredCourses = useMemo(() => {
    return mockCourses.filter((course) => {
      const isCompleted = course.progressPercent >= 100;
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'completed' && isCompleted) ||
        (selectedCategory === 'in_progress' && !isCompleted);

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === '' ||
        course.name.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleNotificationPress = () => {
    Alert.alert(
      'Thông báo mới (3)',
      '1. Nhắc nhở: Hạn nộp bài tập BT01 còn 2 ngày.\n2. Điểm số: Đã có điểm kết thúc môn M02.\n3. Lịch học: Phòng học 102 chuyển sang 105.',
      [{ text: 'Đóng', style: 'cancel' }]
    );
  };

  const handleProfilePress = () => {
    Alert.alert(
      'Hồ sơ sinh viên',
      `Họ và tên: ${mockStudent.name}\nMSSV: ${mockStudent.studentId}\nNgành: ${mockStudent.major}`,
      [{ text: 'Đóng', style: 'default' }]
    );
  };

  const handleStatCardPress = (stat: StatisticItem) => {
    Alert.alert(stat.title, `${stat.value} ${stat.unit}\n${stat.subtitle}`);
  };
  const handleCoursePress = (course: CourseItem) => {
    setSelectedCourse(course);
  };

  const handleTabPress = (tab: NavTabId) => {
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        
        <Header
          student={mockStudent}
          onNotificationPress={handleNotificationPress}
          onProfilePress={handleProfilePress}
        />

        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <StatCards
            statistics={mockStatistics}
            onCardPress={handleStatCardPress}
          />

          
          <View style={styles.searchSection}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              totalResults={
                searchQuery.trim().length > 0 ? filteredCourses.length : undefined
              }
            />
          </View>

          
          <View style={styles.coursesHeaderSection}>
            <View style={styles.coursesTitleRow}>
              <View>
                <Text style={styles.coursesSectionTitle}>Danh sách môn học</Text>
                <Text style={styles.coursesSectionSubtitle}>
                  {filteredCourses.length} môn học trong học kỳ
                </Text>
              </View>
            </View>

            
            <CategoryFilter
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              counts={counts}
            />
          </View>

          
          <CourseList
            courses={filteredCourses}
            searchQuery={searchQuery}
            onCoursePress={handleCoursePress}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      
      <CourseDetailModal
        course={selectedCourse}
        visible={selectedCourse !== null}
        onClose={() => setSelectedCourse(null)}
      />

      
      <BottomNavigation
        activeTab={activeTab}
        onTabPress={handleTabPress}
        safeAreaBottom={insets.bottom}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  searchSection: {
    marginTop: 4,
  },
  coursesHeaderSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  coursesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  coursesSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  coursesSectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
