import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export type CategoryFilterType = 'all' | 'in_progress' | 'completed';

interface CategoryFilterProps {
  selected: CategoryFilterType;
  onSelect: (category: CategoryFilterType) => void;
  counts: {
    all: number;
    in_progress: number;
    completed: number;
  };
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selected,
  onSelect,
  counts,
}) => {
  const tabs: { key: CategoryFilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: counts.all },
    { key: 'in_progress', label: 'Đang học', count: counts.in_progress },
    { key: 'completed', label: 'Hoàn thành', count: counts.completed },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = selected === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {tab.label}
            </Text>
            <View
              style={[
                styles.badge,
                isActive ? styles.badgeActive : styles.badgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isActive && styles.badgeTextActive,
                ]}
              >
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  pillActive: {
    backgroundColor: '#4F46E5',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
});
