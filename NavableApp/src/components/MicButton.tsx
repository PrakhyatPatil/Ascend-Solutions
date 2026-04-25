import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface MicButtonProps {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}

export function MicButton({ onPress, disabled, label = 'Ask Navable' }: MicButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Voice query"
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={styles.icon}>MIC</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F0FDF4', // Very soft green background
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 40,
    borderWidth: 6,
    borderColor: '#10B981', // Crisp emerald green border
    elevation: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.1,
  },
  disabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  icon: {
    fontSize: 50,
    marginBottom: 4,
    color: '#059669', // Deep green icon
    fontWeight: '800',
  },
  label: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
