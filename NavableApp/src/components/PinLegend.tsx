import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const legendItems = [
  { label: 'Accessible', color: '#16a34a' },
  { label: 'Partial', color: '#d97706' },
  { label: 'Inaccessible', color: '#dc2626' },
  { label: 'Unknown', color: '#6b7280' },
];

export function PinLegend() {
  return (
    <View style={styles.container}>
      {legendItems.map(item => (
        <View key={item.label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  label: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 12,
  },
});
