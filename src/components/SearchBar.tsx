import React from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  totalResults?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = 'Tìm kiếm môn học, mã môn, giảng viên...',
  totalResults,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        
        <Text style={styles.searchIcon}>🔍</Text>

        
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="never"
        />

        
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClear || (() => onChangeText(''))}
            activeOpacity={0.7}
            accessibilityLabel="Xóa tìm kiếm"
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      
      {value.trim().length > 0 && typeof totalResults === 'number' && (
        <View style={styles.resultBadge}>
          <Text style={styles.resultText}>
            Tìm thấy {totalResults} môn học
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  clearText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
  },
  resultBadge: {
    marginTop: 6,
    paddingLeft: 4,
  },
  resultText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});
