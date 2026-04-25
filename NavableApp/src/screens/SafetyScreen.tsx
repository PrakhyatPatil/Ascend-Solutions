import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { APP_CONFIG } from '../config/env';
import { triggerSos } from '../services/sosService';

interface SafetyScreenProps {
  isOnline: boolean;
}

export function SafetyScreen({ isOnline }: SafetyScreenProps) {
  const [contacts, setContacts] = useState('+919800000012');
  const [status, setStatus] = useState('Ready');
  const [isSending, setIsSending] = useState(false);

  const onTriggerSos = async () => {
    if (isSending) {
      return;
    }

    if (!APP_CONFIG.enableRemoteSos) {
      setStatus('Local SOS demo triggered. Remote SMS is disabled.');
      return;
    }

    if (!isOnline) {
      setStatus('Offline mode: Remote SOS is unavailable.');
      return;
    }

    setIsSending(true);
    setStatus('Sending SOS...');

    try {
      const response = await triggerSos({
        user_id: APP_CONFIG.defaultUserId,
        lat: APP_CONFIG.defaultCenter.lat,
        lng: APP_CONFIG.defaultCenter.lng,
        contacts: contacts
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
          .slice(0, 3),
        message: 'Emergency! Please check my location.',
      });

      if (response.ok) {
        setStatus(`Sent to ${response.sent} contact(s)`);
      } else {
        setStatus('SOS failed. Please retry.');
      }
    } catch {
      setStatus('SOS service unavailable right now.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safety</Text>
      <Text style={styles.subtitle}>Up to 3 trusted contacts, one-tap SOS</Text>

      <TextInput
        value={contacts}
        onChangeText={setContacts}
        style={styles.input}
        editable={!isSending}
        placeholderTextColor="#64748b"
        accessibilityLabel="Trusted contacts"
      />

      <Pressable
        onPress={onTriggerSos}
        disabled={isSending}
        accessibilityRole="button"
        accessibilityLabel="Trigger SOS"
        style={({ pressed }) => [
          styles.sosButton,
          pressed ? styles.sosPressed : null,
          isSending ? styles.sosDisabled : null,
        ]}
      >
        <Text style={styles.sosText}>SOS</Text>
      </Pressable>

      <Text style={styles.status}>{status}</Text>
      {!APP_CONFIG.enableRemoteSos ? (
        <Text style={styles.offlineHint}>Remote SMS is disabled for this demo build.</Text>
      ) : !isOnline ? (
        <Text style={styles.offlineHint}>Go online to send SOS.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F9FAFB',
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
    marginBottom: 32,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FEF2F2', // Soft red base
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 6,
    borderColor: '#EF4444',     // Bright coral border
    elevation: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    marginBottom: 8,
  },
  sosPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.1,
  },
  sosDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  sosText: {
    color: '#DC2626', // Deep red text inside
    fontWeight: '900',
    fontSize: 42,
    letterSpacing: 2,
  },
  status: {
    marginTop: 24,
    textAlign: 'center',
    fontWeight: '700',
    color: '#334155',
    fontSize: 18,
  },
  offlineHint: {
    marginTop: 8,
    textAlign: 'center',
    color: '#B91C1C',
    fontWeight: '500',
    fontSize: 15,
  },
});
