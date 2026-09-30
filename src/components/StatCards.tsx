import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { StatisticItem } from '../types/student';
import { StatCardItem } from './StatCardItem';

interface StatCardsProps {
  statistics: StatisticItem[];
  onCardPress?: (item: StatisticItem) => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  statistics,
  onCardPress,
}) => {
  return (
    <View style={styles.container}>
      
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Thống kê học tập</Text>
          <View style={styles.termBadge}>
            <Text style={styles.termBadgeText}>HK2 • 2025-2026</Text>
          </View>
        </View>
      </View>

      
      <View style={styles.cardsRow}>
        {statistics.map((stat) => (
          <StatCardItem
            key={stat.id}
            stat={stat}
            onPress={onCardPress}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  termBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  termBadgeText: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
