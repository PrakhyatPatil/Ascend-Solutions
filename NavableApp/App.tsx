import React, { useEffect, useMemo, useState } from 'react';
import { Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { APP_CONFIG } from './src/config/env';
import { queryVoiceAgent } from './src/services/voiceService';
import { detectHazards } from './src/services/detectionService';
import { requestDelivery } from './src/services/deliveryService';
import { HazardEvent, PinRecord, VoiceQueryResponse } from './src/types/contracts';

type TabName = 'home' | 'map' | 'safety';
type AppFlow = 'onboarding' | 'auth' | 'main' | 'profile';

function App() {
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [appFlow, setAppFlow] = useState<AppFlow>('onboarding');
  const [showSplash, setShowSplash] = useState(true);
  const [splashOpacity] = useState(new Animated.Value(1));
  const [isOnline, setIsOnline] = useState(true);
  const [pins, setPins] = useState<PinRecord[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);
  const [pinsSource, setPinsSource] = useState('Loading map data...');
  const [latestHazard, setLatestHazard] = useState<HazardEvent | null>(null);
  const [hazardHistory, setHazardHistory] = useState<HazardEvent[]>([]);
  const [activeAgent, setActiveAgent] = useState('navigator');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 2000);
    return () => clearTimeout(timer);
  }, [splashOpacity]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const nextOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setIsOnline(nextOnline);
    });

    NetInfo.fetch().then(state => {
      const nextOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setIsOnline(nextOnline);
    });

    return () => unsubscribe();
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
    if (APP_CONFIG.enableMockHazards) {
      startMockHazardStream();
    }

    const unsubscribe = subscribeToHazards(async event => {
      setLatestHazard(event);
      setHazardHistory(prev => [...prev.slice(-7), event]);

      if (event.alert_level === 'high') {
        try {
          await speakText(buildHazardMessage(event));
        } catch (error) {
          console.warn('Hazard speech failed. Keeping UI active.', error);
        }
      }
    });

    return () => {
      unsubscribe();
      if (APP_CONFIG.enableMockHazards) {
        stopMockHazardStream();
      }
    };
  }, []);

  const handleVoiceQuery = async (queryText: string): Promise<VoiceQueryResponse> => {
    const response = await queryVoiceAgent({
      user_id: APP_CONFIG.defaultUserId,
      lat: APP_CONFIG.defaultCenter.lat,
      lng: APP_CONFIG.defaultCenter.lng,
      query_text: queryText,
      language: 'auto',
      active_agent: activeAgent,
      history: conversationHistory.slice(-8),
      recent_hazards: hazardHistory.slice(-3),
    });

    setConversationHistory(prev => {
      const next = [
        ...prev,
        { role: 'user', content: queryText },
        { role: 'assistant', content: response.answer_text },
      ];
      return next.slice(-20);
    });

    if (response.active_agent) {
      setActiveAgent(response.active_agent);
    }

    if (response.hangup) {
      setConversationHistory([]);
      setActiveAgent('navigator');
    }

    return response;
  };

  const handleDetectNow = async (): Promise<string> => {
    const response = await detectHazards({
      lat: APP_CONFIG.defaultCenter.lat,
      lng: APP_CONFIG.defaultCenter.lng,
    });

    const topHazard = response.hazards?.[0];
    if (topHazard) {
      setLatestHazard(topHazard);
      setHazardHistory(prev => [...prev.slice(-7), topHazard]);
      if (topHazard.alert_level === 'high') {
        await speakText(buildHazardMessage(topHazard));
      }
      return `Detection: ${topHazard.hazard} ${topHazard.distance_estimate} ${topHazard.direction}`;
    }

    return 'Detection complete: no hazards returned.';
  };

  const handleRequestDelivery = async (): Promise<string> => {
    const response = await requestDelivery({
      user_id: APP_CONFIG.defaultUserId,
      lat: APP_CONFIG.defaultCenter.lat,
      lng: APP_CONFIG.defaultCenter.lng,
      items: ['medicines', 'water'],
      dropoff_note: 'Main entrance',
    });

    return `Delivery ${response.status}. ETA ${response.eta_minutes} min.`;
  };

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
          <Text style={styles.splashLogo}>NAVABLE</Text>
          <Text style={styles.splashText}>Safe. Simple. Empowering.</Text>
        </Animated.View>
      </SafeAreaProvider>
    );
  }

  let activeScreen;
  if (activeTab === 'home') {
    activeScreen = (
      <HomeScreen
        latestHazard={latestHazard}
        recentHazards={hazardHistory}
        isOnline={isOnline}
        onVoiceQuery={handleVoiceQuery}
        onDetectNow={handleDetectNow}
        onRequestDelivery={handleRequestDelivery}
        onMenuPress={() => setAppFlow('profile')}
      />
    );
  } else if (activeTab === 'map') {
    activeScreen = (
      <MapScreen
        pins={pins}
        isLoading={pinsLoading}
        sourceLabel={pinsSource}
      />
    );
  } else if (activeTab === 'safety') {
    activeScreen = <SafetyScreen isOnline={isOnline} />;
  }

  if (appFlow === 'onboarding') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <OnboardingScreen onComplete={() => setAppFlow('auth')} />
      </SafeAreaProvider>
    );
  }

  if (appFlow === 'auth') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <AuthScreen onLogin={() => setAppFlow('main')} />
      </SafeAreaProvider>
    );
  }

  if (appFlow === 'profile') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <ProfileScreen 
          onClose={() => setAppFlow('main')}
          onLogout={() => setAppFlow('onboarding')}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.container}>
        <OfflineBanner isOnline={isOnline} />
        <View style={styles.content}>{activeScreen}</View>
        <View style={styles.tabBar}>
          {(['home', 'map', 'safety'] as TabName[]).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab ? styles.tabButtonActive : null]}
            >
              <Text
                style={[styles.tabLabel, activeTab === tab ? styles.tabLabelActive : null]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.watermark}>NAVABLE • ACCESSIBILITY FIRST</Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Soft off-white
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 30,
    left: 24,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 999, // Pill shape
    padding: 8,
    gap: 8,
    elevation: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#2563EB', // Royal Blue
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#2563EB', // Royal Blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 16,
  },
  splashText: {
    fontSize: 18,
    color: '#DBEAFE',
    fontWeight: '500',
    letterSpacing: 1,
  },
  watermark: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
});

export default App;
