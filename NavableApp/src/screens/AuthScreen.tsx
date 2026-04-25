import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';

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
    if (isSubmitting) {
      return;
    }

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
      await Promise.resolve(onLogin());
    } catch (submitError) {
      console.warn('Auth flow failed', submitError);
      setError('Authentication failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>NAVABLE</Text>
        <Text style={styles.subtitle}>Empowering daily independence.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
        
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="caretaker@email.com"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={value => {
            setEmail(value);
            if (error) {
              setError('');
            }
          }}
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
          onChangeText={value => {
            setPassword(value);
            if (error) {
              setError('');
            }
          }}
          secureTextEntry
          editable={!isSubmitting}
        />

        <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Please wait...' : isLogin ? 'Sign In' : 'Register Securely'}
          </Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={styles.toggleButton}
          onPress={() => setIsLogin(!isLogin)}
          disabled={isSubmitting}
        >
          <Text style={styles.toggleButtonText}>
            {isLogin ? "Don't have an account? Sign up" : "Already registered? Sign in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#B91C1C',
    fontWeight: '600',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
