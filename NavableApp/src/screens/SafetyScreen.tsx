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
    if (!isOnline || isSending) {
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
        accessibilityLabel="Trusted contacts"
      />

      <Pressable
        onPress={onTriggerSos}
        disabled={!isOnline || isSending}
        accessibilityRole="button"
        accessibilityLabel="Trigger SOS"
        style={({ pressed }) => [
          styles.sosButton,
          pressed ? styles.sosPressed : null,
          !isOnline || isSending ? styles.sosDisabled : null,
        ]}
      >
        <Text style={styles.sosText}>SOS</Text>
      </Pressable>

      <Text style={styles.status}>{status}</Text>
      {!isOnline ? <Text style={styles.offlineHint}>Go online to send SOS.</Text> : null}
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
    marginBottom: 16,
  },
  sosButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  sosPressed: {
    opacity: 0.85,
  },
  sosDisabled: {
    backgroundColor: '#94a3b8',
  },
  sosText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 30,
  },
  status: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
    color: '#0f172a',
  },
  offlineHint: {
    marginTop: 8,
    textAlign: 'center',
    color: '#b91c1c',
  },
});
