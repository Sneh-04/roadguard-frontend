import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { apiService } from '../../services/api';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  preferences: {
    notifications: boolean;
    location_tracking: boolean;
    auto_monitoring: boolean;
    voice_assistant: boolean;
    dark_mode: boolean;
    units: 'metric' | 'imperial';
    language: string;
  };
}

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'select' | 'action';
  value?: any;
  options?: { label: string; value: any }[];
  action?: () => void;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProfile();

      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        // Load from local storage as fallback
        const localProfile = await AsyncStorage.getItem('userData');
        if (localProfile) {
          setProfile(JSON.parse(localProfile));
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Load from local storage
      const localProfile = await AsyncStorage.getItem('userData');
      if (localProfile) {
        setProfile(JSON.parse(localProfile));
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string, value: any) => {
    if (!profile) return;

    try {
      const updatedProfile = {
        ...profile,
        preferences: {
          ...profile.preferences,
          [key]: value,
        },
      };

      const response = await apiService.updateProfile(updatedProfile);

      if (response.success) {
        setProfile(updatedProfile);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedProfile));
      } else {
        Alert.alert('Error', 'Failed to update preference');
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
      Alert.alert('Error', 'Failed to update preference');
    }
  };

  const updateProfileField = async (field: string, value: string) => {
    if (!profile) return;

    try {
      const updatedProfile = {
        ...profile,
        [field]: value,
      };

      const response = await apiService.updateProfile(updatedProfile);

      if (response.success) {
        setProfile(updatedProfile);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedProfile));
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('userData');
              // Navigation will be handled by the app
              Alert.alert('Success', 'Logged out successfully');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (field: string, currentValue: string) => {
    setEditField(field);
    setEditValue(currentValue);
    setEditModalVisible(true);
  };

  const getSettingsSections = (): { title: string; items: SettingItem[] }[] => {
    if (!profile) return [];

    return [
      {
        title: 'Account',
        items: [
          {
            id: 'name',
            title: 'Full Name',
            subtitle: profile.full_name,
            type: 'action',
            action: () => openEditModal('full_name', profile.full_name),
          },
          {
            id: 'email',
            title: 'Email',
            subtitle: profile.email,
            type: 'action',
            action: () => openEditModal('email', profile.email),
          },
          {
            id: 'role',
            title: 'Account Type',
            subtitle: profile.role.charAt(0).toUpperCase() + profile.role.slice(1),
            type: 'select',
          },
        ],
      },
      {
        title: 'Notifications',
        items: [
          {
            id: 'notifications',
            title: 'Push Notifications',
            subtitle: 'Receive alerts for hazards and safety tips',
            type: 'toggle',
            value: profile.preferences.notifications,
          },
          {
            id: 'location_tracking',
            title: 'Location Tracking',
            subtitle: 'Allow continuous location monitoring',
            type: 'toggle',
            value: profile.preferences.location_tracking,
          },
          {
            id: 'auto_monitoring',
            title: 'Auto Monitoring',
            subtitle: 'Automatically start monitoring when driving',
            type: 'toggle',
            value: profile.preferences.auto_monitoring,
          },
        ],
      },
      {
        title: 'Assistant',
        items: [
          {
            id: 'voice_assistant',
            title: 'Voice Assistant',
            subtitle: 'Enable voice commands and responses',
            type: 'toggle',
            value: profile.preferences.voice_assistant,
          },
        ],
      },
      {
        title: 'Display',
        items: [
          {
            id: 'units',
            title: 'Units',
            subtitle: 'Temperature and distance units',
            type: 'select',
            value: profile.preferences.units,
            options: [
              { label: 'Metric (°C, km)', value: 'metric' },
              { label: 'Imperial (°F, miles)', value: 'imperial' },
            ],
          },
          {
            id: 'language',
            title: 'Language',
            subtitle: 'App language',
            type: 'select',
            value: profile.preferences.language,
            options: [
              { label: 'English', value: 'en' },
              { label: 'Spanish', value: 'es' },
              { label: 'French', value: 'fr' },
            ],
          },
        ],
      },
      {
        title: 'Data & Privacy',
        items: [
          {
            id: 'export_data',
            title: 'Export Data',
            subtitle: 'Download your hazard history and settings',
            type: 'action',
            action: () => Alert.alert('Coming Soon', 'Data export feature will be available soon'),
          },
          {
            id: 'clear_cache',
            title: 'Clear Cache',
            subtitle: 'Clear cached data to free up space',
            type: 'action',
            action: () => Alert.alert('Success', 'Cache cleared successfully'),
          },
        ],
      },
      {
        title: 'Account',
        items: [
          {
            id: 'logout',
            title: 'Logout',
            subtitle: 'Sign out of your account',
            type: 'action',
            action: handleLogout,
          },
        ],
      },
    ];
  };

  const renderSettingItem = (item: SettingItem) => {
    const handleToggle = (value: boolean) => {
      updatePreference(item.id, value);
    };

    const handleSelect = (value: any) => {
      updatePreference(item.id, value);
    };

    return (
      <View key={item.id} style={styles.settingItem}>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>

        {item.type === 'toggle' && (
          <Switch
            value={item.value}
            onValueChange={handleToggle}
            trackColor={{ false: colors.surfaceLight, true: colors.accent }}
            thumbColor={item.value ? colors.text : colors.textMuted}
          />
        )}

        {item.type === 'select' && item.options && (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => {
              Alert.alert(
                item.title,
                'Select an option',
                item.options!.map(option => ({
                  text: option.label,
                  onPress: () => handleSelect(option.value),
                  style: item.value === option.value ? 'default' : 'default',
                }))
              );
            }}
          >
            <Text style={styles.selectText}>
              {item.options.find(opt => opt.value === item.value)?.label || 'Select'}
            </Text>
            <Text style={styles.selectArrow}>›</Text>
          </TouchableOpacity>
        )}

        {item.type === 'action' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={item.action}
          >
            <Text style={styles.actionText}>
              {item.id === 'logout' ? 'Logout' : 'Edit'}
            </Text>
            {item.id !== 'logout' && <Text style={styles.actionArrow}>›</Text>}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSection = (section: { title: string; items: SettingItem[] }) => (
    <View key={section.title} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionContent}>
        {section.items.map(renderSettingItem)}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.full_name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <Text style={styles.profileRole}>
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Account
          </Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsContainer}>
        {getSettingsSections().map(renderSection)}
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>RoadGuard AI v1.0.0</Text>
        <Text style={styles.appCopyright}>
          © 2026 RoadGuard AI. All rights reserved.
        </Text>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {editField === 'full_name' ? 'Name' : 'Email'}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter your ${editField === 'full_name' ? 'full name' : 'email'}`}
              keyboardType={editField === 'email' ? 'email-address' : 'default'}
              autoCapitalize={editField === 'full_name' ? 'words' : 'none'}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => updateProfileField(editField, editValue)}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    ...typography.text.lg,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  errorText: {
    ...typography.text.lg,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  title: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    ...typography.text.md,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  profileRole: {
    ...typography.text.sm,
    color: colors.accent,
    fontWeight: typography.fontWeight.medium,
  },
  settingsContainer: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.text.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  selectText: {
    ...typography.text.md,
    color: colors.accent,
    marginRight: spacing.sm,
  },
  selectArrow: {
    ...typography.text.lg,
    color: colors.textMuted,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    ...typography.text.md,
    color: colors.accent,
    marginRight: spacing.sm,
  },
  actionArrow: {
    ...typography.text.lg,
    color: colors.textMuted,
  },
  appInfo: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  appVersion: {
    ...typography.text.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  appCopyright: {
    ...typography.text.xs,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.text.md,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceLight,
  },
  cancelButtonText: {
    ...typography.text.md,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
});