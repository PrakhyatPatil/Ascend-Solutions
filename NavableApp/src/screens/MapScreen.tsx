import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { PinLegend } from '../components/PinLegend';
import { APP_CONFIG } from '../config/env';
import { PinRecord } from '../types/contracts';

interface MapScreenProps {
  pins: PinRecord[];
  isLoading: boolean;
  sourceLabel: string;
}

const pinColorByStatus = {
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  grey: '#6b7280',
} as const;

export function MapScreen({ pins, isLoading, sourceLabel }: MapScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accessibility Map</Text>
      <Text style={styles.subtitle}>{sourceLabel}</Text>
      <PinLegend />

      {isLoading ? <ActivityIndicator color="#0f766e" style={styles.loader} /> : null}

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: APP_CONFIG.defaultCenter.lat,
          longitude: APP_CONFIG.defaultCenter.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {pins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            title={pin.name}
            description={`Score ${pin.score}/5`}
            pinColor={pinColorByStatus[pin.status]}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subtitle: {
    color: '#475569',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  loader: {
    marginTop: 10,
  },
  map: {
    flex: 1,
    marginTop: 8,
  },
});
