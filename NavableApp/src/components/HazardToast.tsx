import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HazardEvent } from '../types/contracts';

interface HazardToastProps {
  event: HazardEvent | null;
}

const levelColors: Record<HazardEvent['alert_level'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
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
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff30',
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  body: {
    color: '#f8fafc',
    fontSize: 18,
    marginTop: 4,
    fontWeight: '600',
  },
});
