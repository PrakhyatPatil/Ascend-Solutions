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

export function MapScreen({ pins, isLoading, sourceLabel }: MapScreenProps) {
  const center = {
    latitude: APP_CONFIG.defaultCenter.lat,
    longitude: APP_CONFIG.defaultCenter.lng,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  const isLiveMapEnabled = APP_CONFIG.enableLiveMap;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accessibility Map</Text>
        <Text style={styles.subtitle}>{sourceLabel}</Text>
      </View>
      <PinLegend />

      {isLoading ? <ActivityIndicator color="#2563EB" style={styles.loader} /> : null}

      {isLiveMapEnabled ? (
        <View style={styles.mapContainer}>
          <MapView style={styles.map} initialRegion={center}>
            {pins.map(pin => (
              <Marker
                key={pin.id}
                coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                title={pin.name}
                description={`Score ${pin.score} • ${pin.status}`}
              />
            ))}
          </MapView>
          <View style={styles.mockStatsRow}>
            <Text style={styles.mockStatsText}>Loaded {pins.length} active accessibility pins.</Text>
          </View>
        </View>
      ) : (
        <View style={styles.mockMapContainer}>
          <Text style={styles.mockMapIcon}>🗺️</Text>
          <Text style={styles.mockMapText}>Interactive Map Offline</Text>
          <Text style={styles.mockMapSubtext}>Google Maps SDK disabled for Hackathon preview.</Text>
          <View style={styles.mockStatsRow}>
            <Text style={styles.mockStatsText}>Loaded {pins.length} active accessibility pins.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#64748B',
    paddingTop: 4,
    fontSize: 15,
  },
  loader: {
    marginTop: 10,
  },
  mapContainer: {
    flex: 1,
    marginTop: 20,
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#E2E8F0',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mockMapContainer: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#EFF6FF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  mockMapIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.8,
  },
  mockMapText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  mockMapSubtext: {
    fontSize: 15,
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 32,
  },
  mockStatsRow: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mockStatsText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
});
