import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HazardEvent } from '../types/contracts';

interface HazardToastProps {
  event: HazardEvent | null;
}

const levelColors: Record<HazardEvent['alert_level'], string> = {
  high: '#991b1b',
  medium: '#92400e',
  low: '#1e3a8a',
};

export function HazardToast({ event }: HazardToastProps) {
  if (!event) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: levelColors[event.alert_level] }]}>
      <Text style={styles.title}>{event.alert_level.toUpperCase()} ALERT</Text>
      <Text style={styles.body}>
        {event.hazard} {event.distance_estimate} {event.direction}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    color: '#e2e8f0',
    fontSize: 15,
    marginTop: 2,
  },
});
