import React from 'react';
import { StyleSheet, Text, View, Pressable, Image } from 'react-native';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>NAVABLE</Text>
        <Text style={styles.title}>Navigate with Confidence</Text>
        <Text style={styles.subtitle}>
          The AI-powered assistant for the visually impaired and their caregivers.
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎤</Text>
            <View>
              <Text style={styles.featureTitle}>Hands-free AI</Text>
              <Text style={styles.featureDesc}>Ask questions about your surroundings.</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚠️</Text>
            <View>
              <Text style={styles.featureTitle}>Hazard Detection</Text>
              <Text style={styles.featureDesc}>Real-time alerts for obstacles and crowds.</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🛡️</Text>
            <View>
              <Text style={styles.featureTitle}>Caretaker Sync</Text>
              <Text style={styles.featureDesc}>Peace of mind for loved ones.</Text>
            </View>
          </View>
        </View>
      </View>

      <Pressable style={styles.button} onPress={onComplete}>
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    marginTop: 60,
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 4,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 42,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    lineHeight: 26,
    marginBottom: 40,
  },
  featureList: {
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#64748B',
    paddingRight: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
