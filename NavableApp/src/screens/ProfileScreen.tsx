import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';

interface ProfileScreenProps {
  onClose: () => void;
  onLogout: () => void;
}

export function ProfileScreen({ onClose, onLogout }: ProfileScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <Text style={styles.profileName}>Jane Doe (Caretaker)</Text>
          <Text style={styles.profileEmail}>caretaker@email.com</Text>
        </View>

        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Voice Assistant Speech Speed</Text>
          <Text style={styles.settingValue}>Normal (1.0x)</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Hazard Alert Sensitivity</Text>
          <Text style={styles.settingValue}>High (All hazards)</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Language</Text>
          <Text style={styles.settingValue}>English / Hindi</Text>
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Linked Dependent Devices</Text>
          <Text style={styles.settingValue}>1 Device (Active)</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Privacy & Data</Text>
          <Text style={styles.settingValue}>Manage</Text>
        </View>

        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
        <Text style={styles.appVersion}>Navable Prototype v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  settingLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  settingValue: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  logoutText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 16,
  },
  appVersion: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 40,
  },
});
