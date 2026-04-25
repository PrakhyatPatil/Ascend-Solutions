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
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#0f766e',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    backgroundColor: '#64748b',
  },
  icon: {
    fontSize: 40,
    marginBottom: 6,
  },
  label: {
    color: '#f0fdfa',
    fontWeight: '700',
    fontSize: 17,
  },
});
