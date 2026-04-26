import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { PinLegend } from '../components/PinLegend';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { APP_CONFIG } from '../config/env';
import { PinRecord } from '../types/contracts';

interface MapScreenProps {
  pins: PinRecord[];
  isLoading: boolean;
  sourceLabel: string;
}

const PIN_COLORS: Record<string, string> = {
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
  grey: '#94A3B8',
};

/** High-visibility zones for demo */
const MOCK_ZONES = [
  { lat: 12.9716, lng: 77.5946, color: 'rgba(34, 197, 94, 0.3)', radius: 800, title: 'Highly Accessible Zone' },
  { lat: 12.9800, lng: 77.6000, color: 'rgba(239, 68, 68, 0.3)', radius: 600, title: 'Hazardous Zone' },
  { lat: 12.9650, lng: 77.6100, color: 'rgba(245, 158, 11, 0.3)', radius: 500, title: 'Low Accessibility' },
];

/** DynamoDB can return lat/lng as Decimal strings — always parse to float */
function safeFloat(val: any): number {
  if (typeof val === 'number') return val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

function NativeMap({ pins }: { pins: PinRecord[] }) {
  const center = {
    latitude: APP_CONFIG.defaultCenter.lat,
    longitude: APP_CONFIG.defaultCenter.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const validPins = pins.filter(p => {
    const lat = safeFloat(p.lat);
    const lng = safeFloat(p.lng);
    return lat !== 0 && lng !== 0;
  });

  return (
    <MapView style={StyleSheet.absoluteFill} initialRegion={center}>
      {MOCK_ZONES.map((zone, idx) => (
        <Circle
          key={`zone-${idx}`}
          center={{ latitude: zone.lat, longitude: zone.lng }}
          radius={zone.radius}
          fillColor={zone.color}
          strokeColor="transparent"
        />
      ))}

      {validPins.map(pin => (
        <Marker
          key={pin.id}
          coordinate={{
            latitude: safeFloat(pin.lat),
            longitude: safeFloat(pin.lng),
          }}
          title={pin.name}
          description={`Score ${pin.score}/5 • ${pin.entry_access} access`}
          pinColor={PIN_COLORS[pin.status] ?? '#94A3B8'}
        />
      ))}
    </MapView>
  );
}

function MapCrashFallback() {
  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackIcon}>🗺️</Text>
      <Text style={styles.fallbackTitle}>Map couldn't load</Text>
      <Text style={styles.fallbackText}>
        Verify your Maps SDK for Android billing is active in Google Cloud Console. The API key and
        SDK are enabled, but billing must also be active.
      </Text>
    </View>
  );
}

export function MapScreen({ pins, isLoading, sourceLabel }: MapScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accessibility Map</Text>
        <Text style={styles.subtitle}>{isLoading ? 'Syncing pins...' : sourceLabel}</Text>
      </View>
      <PinLegend />

      {isLoading && <ActivityIndicator color="#2563EB" style={styles.loader} />}

      <View style={styles.mapContainer}>
        <ErrorBoundary fallback={<MapCrashFallback />}>
          <NativeMap pins={pins} />
        </ErrorBoundary>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>📍 {pins.length} accessibility pins</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', paddingTop: 4, fontSize: 14, marginBottom: 4 },
  loader: { marginTop: 8 },
  mapContainer: {
    flex: 1,
    marginTop: 8,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#D1FAE5',
  },
  statsRow: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    elevation: 5,
  },
  statsText: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFF7ED',
  },
  fallbackIcon: { fontSize: 56, marginBottom: 16 },
  fallbackTitle: { fontSize: 20, fontWeight: '700', color: '#1E3A8A', marginBottom: 10 },
  fallbackText: { color: '#475569', textAlign: 'center', fontSize: 14, lineHeight: 22 },
});
