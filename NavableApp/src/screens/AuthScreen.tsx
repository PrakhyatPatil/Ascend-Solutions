import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthScreenProps {
  onLogin: () => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // Save session locally — no backend needed to log in
      await AsyncStorage.setItem(
        'navable_user_session',
        JSON.stringify({
          email: trimmedEmail,
          isLoggedIn: true,
          loginTime: new Date().toISOString(),
        }),
      );
      onLogin();
    } catch (e) {
      console.warn('Session save failed', e);
      // Still let them in even if storage fails
      onLogin();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>NAVABLE</Text>
          <Text style={styles.tagline}>Empowering daily independence.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="caretaker@email.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={v => { setEmail(v); setError(''); }}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isSubmitting}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={v => { setPassword(v); setError(''); }}
            secureTextEntry
            editable={!isSubmitting}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.85 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Signing in...' : isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.toggleButton}
            onPress={() => { setIsLogin(!isLogin); setError(''); }}
            disabled={isSubmitting}>
            <Text style={styles.toggleButtonText}>
              {isLogin ? "Don't have an account? Sign up" : 'Already registered? Sign in'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.demoHint}>
          Demo: use any email & password (6+ chars) to continue
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 6,
    marginBottom: 8,
  },
  tagline: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EFF6FF',
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  toggleButton: { marginTop: 20, alignItems: 'center' },
  toggleButtonText: { color: '#3B82F6', fontWeight: '600', fontSize: 14 },
  errorText: {
    marginVertical: 10,
    textAlign: 'center',
    color: '#DC2626',
    fontWeight: '600',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  demoHint: {
    marginTop: 24,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
  },
});
