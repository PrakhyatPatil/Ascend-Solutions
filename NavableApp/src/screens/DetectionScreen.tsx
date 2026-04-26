import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { HazardEvent, VoiceQueryResponse } from '../types/contracts';
import { speakText } from '../services/ttsService';
import { buildHazardMessage } from '../services/hazardStreamService';

interface DetectionScreenProps {
  onVoiceQuery: (query: string) => Promise<VoiceQueryResponse>;
  onDetectNow: () => Promise<string>;
  onMenuPress: () => void;
}

const COMPANION_PROMPTS = [
  'What can you see around me?',
  'Is the path ahead safe?',
  'Are there any obstacles?',
  'Guide me to the entrance',
  'Is this place wheelchair accessible?',
];

export function DetectionScreen({ onVoiceQuery, onDetectNow, onMenuPress }: DetectionScreenProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [detectionResult, setDetectionResult] = useState('');
  const [companionReply, setCompanionReply] = useState('');
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  const runDetection = useCallback(async () => {
    if (isDetecting) return;
    setIsDetecting(true);
    setDetectionResult('');
    try {
      const result = await onDetectNow();
      setDetectionResult(result);
      // Ask companion to narrate the result
      const narration = await onVoiceQuery(`I just scanned the area. The result was: "${result}". Please describe this to me like a caring guide.`);
      setCompanionReply(narration.answer_text);
      await speakText(narration.answer_text);
    } catch (e) {
      setDetectionResult('Detection failed — please try again.');
    } finally {
      setIsDetecting(false);
    }
  }, [isDetecting, onDetectNow, onVoiceQuery]);

  const askCompanion = useCallback(async (prompt: string) => {
    if (isAsking) return;
    setActivePrompt(prompt);
    setIsAsking(true);
    setCompanionReply('');
    try {
      const response = await onVoiceQuery(prompt);
      setCompanionReply(response.answer_text);
      await speakText(response.answer_text);
    } catch (e) {
      setCompanionReply("I'm here with you — let me know how I can help.");
    } finally {
      setIsAsking(false);
      setActivePrompt(null);
    }
  }, [isAsking, onVoiceQuery]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={onMenuPress} style={styles.hamburger}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </Pressable>
        <Text style={styles.logo}>NAVABLE</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Visual Guide 📷</Text>
        <Text style={styles.subtitle}>Let your companion guide you with what it sees</Text>

        {/* Scan Button — big, prominent */}
        <Pressable
          style={({ pressed }) => [styles.scanButton, pressed && styles.scanPressed, isDetecting && styles.scanDisabled]}
          onPress={runDetection}
          disabled={isDetecting || isAsking}>
          <Text style={styles.scanIcon}>{isDetecting ? '⏳' : '📷'}</Text>
          <Text style={styles.scanLabel}>
            {isDetecting ? 'Scanning environment...' : 'Scan My Surroundings'}
          </Text>
        </Pressable>

        {/* Detection result */}
        {detectionResult ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>SCAN RESULT</Text>
            <Text style={styles.resultText}>{detectionResult}</Text>
          </View>
        ) : null}

        {/* Companion response */}
        {(companionReply || isAsking) ? (
          <View style={styles.companionCard}>
            <Text style={styles.companionLabel}>🤝 NOVA SAYS</Text>
            {isAsking ? (
              <ActivityIndicator color="#2563EB" style={{ marginTop: 8 }} />
            ) : (
              <Text style={styles.companionText}>{companionReply}</Text>
            )}
          </View>
        ) : null}

        {/* Quick companion prompts */}
        <Text style={styles.promptsTitle}>Ask Your Companion</Text>
        {COMPANION_PROMPTS.map(prompt => (
          <Pressable
            key={prompt}
            style={({ pressed }) => [
              styles.promptButton,
              pressed && styles.promptPressed,
              activePrompt === prompt && styles.promptActive,
              (isDetecting || isAsking) && styles.promptDisabled,
            ]}
            onPress={() => askCompanion(prompt)}
            disabled={isDetecting || isAsking}>
            <Text style={styles.promptText}>{prompt}</Text>
            {activePrompt === prompt && isAsking ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.promptArrow}>→</Text>
            )}
          </Pressable>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logo: { fontSize: 18, fontWeight: '900', color: '#2563EB', letterSpacing: 2 },
  hamburger: { gap: 4, padding: 8 },
  hamburgerLine: { width: 20, height: 2, backgroundColor: '#334155', borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginTop: 8 },
  subtitle: { color: '#64748B', fontSize: 15, marginTop: 4, marginBottom: 28, lineHeight: 22 },
  scanButton: {
    backgroundColor: '#2563EB',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  scanPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  scanDisabled: { backgroundColor: '#94A3B8', elevation: 0, shadowOpacity: 0 },
  scanIcon: { fontSize: 40, marginBottom: 10 },
  scanLabel: { color: '#FFF', fontWeight: '800', fontSize: 18, letterSpacing: 0.3 },
  resultCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  resultText: { color: '#065F46', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  companionCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
  },
  companionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  companionText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  promptsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  promptButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  promptPressed: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  promptActive: { backgroundColor: '#DBEAFE', borderColor: '#2563EB' },
  promptDisabled: { opacity: 0.5 },
  promptText: { color: '#334155', fontWeight: '600', fontSize: 15, flex: 1 },
  promptArrow: { color: '#2563EB', fontWeight: '700', fontSize: 18 },
});
