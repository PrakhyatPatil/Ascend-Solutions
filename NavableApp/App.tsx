import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OfflineBanner } from './src/components/OfflineBanner';
import { loadPinsWithOfflineFallback } from './src/offline/syncManager';
import {
  buildHazardMessage,
  startMockHazardStream,
  stopMockHazardStream,
  subscribeToHazards,
} from './src/services/hazardStreamService';
import { speakText } from './src/services/ttsService';
import { HomeScreen } from './src/screens/HomeScreen';
import { MapScreen } from './src/screens/MapScreen';
import { SafetyScreen } from './src/screens/SafetyScreen';
import { HazardEvent, PinRecord } from './src/types/contracts';

type TabName = 'Home' | 'Map' | 'Safety';

function App() {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [isOnline, setIsOnline] = useState(true);
  const [pins, setPins] = useState<PinRecord[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);
  const [pinsSource, setPinsSource] = useState('Loading map data...');
  const [latestHazard, setLatestHazard] = useState<HazardEvent | null>(null);
  const [hazardHistory, setHazardHistory] = useState<HazardEvent[]>([]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncPins() {
      setPinsLoading(true);
      const payload = await loadPinsWithOfflineFallback({ isOnline });

      if (cancelled) {
        return;
      }

      setPins(payload.pins);
      setPinsSource(
        payload.source === 'api'
          ? `Live pins synced at ${new Date(payload.updatedAt).toLocaleTimeString()}`
          : 'Using cached or seeded pins',
      );
      setPinsLoading(false);
    }

    syncPins();
    return () => {
      cancelled = true;
    };
  }, [isOnline]);

  useEffect(() => {
    startMockHazardStream();
    const unsubscribe = subscribeToHazards(async event => {
      setLatestHazard(event);
      setHazardHistory(prev => [...prev.slice(-7), event]);

      if (event.alert_level === 'high') {
        await speakText(buildHazardMessage(event));
      }
    });

    return () => {
      unsubscribe();
      stopMockHazardStream();
    };
  }, []);

  const activeScreen = useMemo(() => {
    if (activeTab === 'Map') {
      return <MapScreen pins={pins} isLoading={pinsLoading} sourceLabel={pinsSource} />;
    }

    if (activeTab === 'Safety') {
      return <SafetyScreen isOnline={isOnline} />;
    }

    return (
      <HomeScreen
        latestHazard={latestHazard}
        recentHazards={hazardHistory}
        isOnline={isOnline}
      />
    );
  }, [activeTab, hazardHistory, isOnline, latestHazard, pins, pinsLoading, pinsSource]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.container}>
        <OfflineBanner isOnline={isOnline} />
        <View style={styles.content}>{activeScreen}</View>
        <View style={styles.tabBar}>
          {(['Home', 'Map', 'Safety'] as TabName[]).map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
              style={[styles.tabButton, activeTab === tab ? styles.tabButtonActive : null]}
            >
              <Text
                style={[styles.tabLabel, activeTab === tab ? styles.tabLabelActive : null]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  tabButtonActive: {
    backgroundColor: '#0f766e',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  tabLabelActive: {
    color: '#ecfeff',
  },
});

export default App;
