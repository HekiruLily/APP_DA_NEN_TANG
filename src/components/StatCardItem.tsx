import React, { useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Pressable,
  StyleSheet,
} from 'react-native';
import { StatisticItem } from '../types/student';

interface StatCardItemProps {
  stat: StatisticItem;
  onPress?: (stat: StatisticItem) => void;
}

export const StatCardItem: React.FC<StatCardItemProps> = ({
  stat,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
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
        style={[styles.card, { backgroundColor: stat.bgColor }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress && onPress(stat)}
        accessibilityRole="button"
        accessibilityLabel={`${stat.title}: ${stat.value} ${stat.unit}`}
      >
        
        <View style={[styles.cardAccentBar, { backgroundColor: stat.color }]} />

        
        <View style={styles.iconWrapper}>
          <Text style={styles.iconText}>{stat.icon}</Text>
        </View>

        
        <View style={styles.valueRow}>
          <Text style={[styles.valueText, { color: stat.color }]}>
            {stat.value}
          </Text>
          <Text style={styles.unitText}>{stat.unit}</Text>
        </View>

        
        <Text style={styles.cardTitle} numberOfLines={2}>
          {stat.title}
        </Text>

        
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {stat.subtitle}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedWrapper: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 12,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconText: {
    fontSize: 18,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 2,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
    lineHeight: 16,
  },
  cardSubtitle: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
});
