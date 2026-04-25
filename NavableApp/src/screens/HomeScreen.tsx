import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { APP_CONFIG } from '../config/env';
import { HazardToast } from '../components/HazardToast';
import { MicButton } from '../components/MicButton';
import { queryVoiceAgent } from '../services/voiceService';
import { speakText } from '../services/ttsService';
import { HazardEvent } from '../types/contracts';

interface HomeScreenProps {
  latestHazard: HazardEvent | null;
  recentHazards: HazardEvent[];
  isOnline: boolean;
}

export function HomeScreen({ latestHazard, recentHazards, isOnline }: HomeScreenProps) {
  const [queryText, setQueryText] = useState('Kya nearby entrance accessible hai?');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const disabled = isLoading || !isOnline;

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
      const response = await queryVoiceAgent({
        user_id: APP_CONFIG.defaultUserId,
        lat: APP_CONFIG.defaultCenter.lat,
        lng: APP_CONFIG.defaultCenter.lng,
        query_text: queryText,
        recent_hazards: previewHazards,
      });

      setAnswer(response.answer_text);
      await speakText(response.answer_text);
    } catch {
      setError('Voice service unavailable. Please retry when online.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navable Voice Assistant</Text>
      <Text style={styles.subtitle}>Hands-free Q and A with map and hazard context</Text>

      <HazardToast event={latestHazard} />

      <TextInput
        value={queryText}
        onChangeText={setQueryText}
        editable={!isLoading}
        placeholder="Ask in Hindi or English"
        style={styles.input}
        accessibilityLabel="Voice query text"
      />

      <MicButton
        onPress={onAskNavable}
        disabled={disabled}
        label={isOnline ? 'Ask Navable' : 'Offline: voice API unavailable'}
      />

      {isLoading ? <ActivityIndicator size="small" color="#0f766e" /> : null}
      {answer ? <Text style={styles.answer}>{answer}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 14,
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  answer: {
    marginTop: 12,
    backgroundColor: '#ecfeff',
    borderColor: '#99f6e4',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#134e4a',
    fontWeight: '500',
  },
  error: {
    marginTop: 10,
    color: '#b91c1c',
    fontWeight: '600',
  },
});
