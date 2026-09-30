export interface StudentProfile {
  name: string;
  studentId: string;
  major: string;
  avatarUrl?: string;
  unreadNotifications: number;
}

export interface StatisticItem {
  id: string;
  title: string;
  value: string;
  unit: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface CourseItem {
  id: string;
  code: string;
  name: string;
  instructor: string;
  lessonsCount: number;
  totalLessons: number;
  progressPercent: number;
  icon: string;
  color: string;
  bgColor: string;
  schedule: string;
  description?: string;
}

export type NavTabId = 'home' | 'courses' | 'assignments' | 'profile';
export type CategoryFilterType = 'all' | 'in_progress' | 'completed';
