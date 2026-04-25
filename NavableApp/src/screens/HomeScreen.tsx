import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { APP_CONFIG } from '../config/env';
import { HazardToast } from '../components/HazardToast';
import { MicButton } from '../components/MicButton';
import { speakText } from '../services/ttsService';
import { HazardEvent, VoiceQueryResponse } from '../types/contracts';

interface HomeScreenProps {
  latestHazard: HazardEvent | null;
  recentHazards: HazardEvent[];
  isOnline: boolean;
  onVoiceQuery: (query: string) => Promise<VoiceQueryResponse>;
  onMenuPress: () => void;
}

export function HomeScreen({ latestHazard, recentHazards, isOnline, onVoiceQuery, onMenuPress }: HomeScreenProps) {
  const [queryText, setQueryText] = useState('Kya nearby entrance accessible hai?');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const previewHazards = useMemo(
    () =>
      recentHazards.slice(-3).map(item => ({
        hazard: item.hazard,
        distance_estimate: item.distance_estimate,
        direction: item.direction,
        alert_level: item.alert_level,
      })),
    [recentHazards],
  );

  const onAskNavable = async () => {
    if (!queryText.trim()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await onVoiceQuery(queryText);

      setAnswer(response.answer_text);
      await speakText(response.answer_text);
    } catch {
      setError('Voice service unavailable. Please retry when online.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={onMenuPress} style={styles.hamburger}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </Pressable>
        <Text style={styles.logo}>NAVABLE</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Good Evening.</Text>
        <Text style={styles.subtitle}>Navable voice assistant is ready.</Text>

        <HazardToast event={latestHazard} />

        <TextInput
          value={queryText}
          onChangeText={setQueryText}
          editable={!isLoading}
          placeholder="Ask Navable Assistant..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          accessibilityLabel="Voice query text"
        />

        <MicButton
          onPress={onAskNavable}
          disabled={isLoading || !isOnline}
          label={isOnline ? 'Ask Navable' : 'Offline: voice API unavailable'}
        />

        {isLoading ? <ActivityIndicator size="small" color="#2563EB" /> : null}
        {answer ? <Text style={styles.answer}>{answer}</Text> : null}

        {!isLoading && (
          <View style={styles.dashboardGrid}>
            <Text style={styles.gridTitle}>Caretaker Tools</Text>
            <View style={styles.gridRow}>
              <View style={styles.gridCard}>
                <Text style={styles.cardIcon}>⭐</Text>
                <Text style={styles.cardText}>Saved Places</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={styles.cardIcon}>⚠️</Text>
                <Text style={styles.cardText}>Community Alerts</Text>
              </View>
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridCard}>
                <Text style={styles.cardIcon}>⚙️</Text>
                <Text style={styles.cardText}>App Settings</Text>
              </View>
              <View style={styles.gridCard}>
                <Text style={styles.cardIcon}>🗺️</Text>
                <Text style={styles.cardText}>Offline Maps</Text>
              </View>
            </View>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 2,
  },
  hamburger: {
    gap: 4,
    padding: 8,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginTop: 12,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 24,
    color: '#64748B',
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  answer: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    color: '#1E3A8A',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
  },
  dashboardGrid: {
    marginTop: 32,
  },
  gridTitle: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 110,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  cardText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    marginTop: 16,
    color: '#991B1B',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    fontWeight: '600',
    textAlign: 'center',
  },
});
