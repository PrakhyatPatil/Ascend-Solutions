import React, { useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, PermissionsAndroid } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

import { APP_CONFIG } from '../config/env';
import { HazardToast } from '../components/HazardToast';
import { speakText, stopSpeaking } from '../services/ttsService';
import { HazardEvent, VoiceQueryResponse } from '../types/contracts';

interface HomeScreenProps {
  latestHazard: HazardEvent | null;
  recentHazards: HazardEvent[];
  isOnline: boolean;
  onVoiceQuery: (query: string) => Promise<VoiceQueryResponse>;
  onDetectNow: () => Promise<string>;
  onRequestDelivery: () => Promise<string>;
  onMenuPress: () => void;
}

export function HomeScreen({ 
  latestHazard, 
  recentHazards, 
  isOnline, 
  onVoiceQuery, 
  onDetectNow,
  onRequestDelivery,
  onMenuPress 
}: HomeScreenProps) {
  const [queryText, setQueryText] = useState('');
  const [answer, setAnswer] = useState('Hold the big button or type below to speak with Nova.');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [actionStatus, setActionStatus] = useState('');

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = async (e: SpeechResultsEvent) => {
    const text = e.value?.[0];
    if (text) {
      setQueryText(text);
      await handleVoiceSubmission(text);
    }
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.warn('Voice error:', e.error);
    setIsRecording(false);
    if (!isLoading) {
      setAnswer('Hold the big button to speak with Nova.');
    }
  };

  const handleVoiceSubmission = async (textToSubmit: string) => {
    setIsRecording(false);
    setIsLoading(true);
    setAnswer('Thinking...');
    
    try {
      const response = await onVoiceQuery(textToSubmit);
      setAnswer(response.answer_text);
      await speakText(response.answer_text);
    } catch {
      setAnswer('Voice service unavailable. Please retry. (Offline)');
    } finally {
      setIsLoading(false);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Navable needs access to your microphone to listen to your requests.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED || granted === 'granted';
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const onMicPressIn = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setAnswer("Microphone permission denied. Unable to listen.");
        return;
      }
      
      setIsRecording(true);
      setAnswer('Listening...');
      setQueryText('');
      await stopSpeaking();
      await Voice.start('hi-IN');
    } catch (e: any) {
      console.warn("Failed to start mic", e);
      setIsRecording(false);
      setAnswer(`Microphone error: ${e?.message || JSON.stringify(e)}`);
    }
  };

  const onMicPressOut = async () => {
    try {
      if (isRecording) {
        await Voice.stop();
      }
    } catch (e) {
      console.warn('Error stopping voice', e);
    }
  };

  const onAskNavableText = async () => {
    if (!queryText.trim()) return;
    await handleVoiceSubmission(queryText);
  };

  const onRunDetect = async () => {
    setIsLoading(true);
    setError('');
    try {
      const status = await onDetectNow();
      setActionStatus(status);
    } catch {
      setError('Detection failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDelivery = async () => {
    setIsLoading(true);
    setError('');
    try {
      const status = await onRequestDelivery();
      setActionStatus(status);
    } catch {
      setError('Delivery request failed. Please retry.');
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

      <View style={styles.content}>
        <HazardToast event={latestHazard} />

        <View style={styles.answerContainer}>
          {isLoading && !isRecording ? (
             <ActivityIndicator size="large" color="#2563EB" style={{ marginBottom: 12 }} />
          ) : null}
          <Text style={styles.answerText}>{answer}</Text>
        </View>

        <TextInput
          value={queryText}
          onChangeText={setQueryText}
          onSubmitEditing={onAskNavableText}
          editable={!isLoading && isOnline}
          placeholder="Type to Navable AI here..."
          placeholderTextColor="#94A3B8"
          style={styles.textInput}
          accessibilityLabel="Voice query text"
        />

        <Pressable
          onPressIn={onMicPressIn}
          onPressOut={onMicPressOut}
          disabled={!isOnline}
          style={({ pressed }) => [
            styles.micButton,
            isRecording ? styles.micRecording : null,
            pressed ? styles.micPressed : null,
            !isOnline && styles.micDisabled
          ]}>
          <Text style={styles.micIcon}>{isRecording ? '🎙️' : '🎤'}</Text>
          <Text style={styles.micLabel}>
             {isOnline ? (isRecording ? 'LISTENING...' : 'HOLD TO SPEAK') : 'OFFLINE'}
          </Text>
        </Pressable>
      </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
  },
  answerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  answerText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 18,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    width: '100%',
    marginBottom: 32,
  },
  micButton: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    borderWidth: 8,
    borderColor: '#BFDBFE',
  },
  micRecording: {
    backgroundColor: '#DC2626',
    borderColor: '#FECACA',
    shadowColor: '#DC2626',
  },
  micPressed: {
    transform: [{ scale: 0.95 }],
  },
  micDisabled: {
    backgroundColor: '#94A3B8',
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  micIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  micLabel: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 2,
    marginTop: 4,
  },
});
