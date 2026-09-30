import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { CourseItem } from '../types/student';

interface CourseDetailModalProps {
  course: CourseItem | null;
  visible: boolean;
  onClose: () => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  visible,
  onClose,
}) => {
  if (!course) return null;

  const isCompleted = course.progressPercent >= 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.box}>
              <Text style={styles.title}>{course.name}</Text>

              <Text style={styles.text}>Mã môn: {course.code}</Text>
              <Text style={styles.text}>Giảng viên: {course.instructor}</Text>
              <Text style={styles.text}>Lịch học: {course.schedule}</Text>
              <Text style={styles.text}>Số bài học: {course.lessonsCount}/{course.totalLessons}</Text>
              <Text style={styles.text}>
                Trạng thái: {isCompleted ? 'Đã hoàn thành' : 'Đang học'} ({course.progressPercent}%)
              </Text>

              <TouchableOpacity style={styles.btn} onPress={onClose}>
                <Text style={styles.btnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  btn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
