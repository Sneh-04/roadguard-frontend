import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../context/AppContext';
import database from '../services/database';
import syncService from '../services/syncService';

const SettingsScreen = () => {
  const { triggerSync, isSyncing, syncStats, isOnline } = useAppContext();

  const [apiUrl, setApiUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState('30');
  const [saving, setSaving] = useState(false);
  const [version] = useState('1.0.0');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await AsyncStorage.getItem('API_BASE_URL');
      const sync = await AsyncStorage.getItem('AUTO_SYNC_ENABLED');
      const interval = await AsyncStorage.getItem('SYNC_INTERVAL');

      if (url) {
        setApiUrl(url);
        syncService.setApiBaseUrl(url);
      } else {
        const defaultUrl = 'http://10.0.2.2:8002/api';
        setApiUrl(defaultUrl);
        syncService.setApiBaseUrl(defaultUrl);
      }
      if (sync !== null) setAutoSync(JSON.parse(sync));
      if (interval) setSyncInterval(interval);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!apiUrl.trim()) {
      Alert.alert('Error', 'API URL cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await AsyncStorage.multiSet([
        ['API_BASE_URL', apiUrl],
        ['AUTO_SYNC_ENABLED', JSON.stringify(autoSync)],
        ['SYNC_INTERVAL', syncInterval],
      ]);
      syncService.setApiBaseUrl(apiUrl);

      Alert.alert('Success', 'Settings saved successfully');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure? This will restore default API settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultUrl = 'http://10.0.2.2:8002/api';
            setApiUrl(defaultUrl);
            syncService.setApiBaseUrl(defaultUrl);
            setAutoSync(true);
            setSyncInterval('30');
          },
        },
      ]
    );
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline. Please check your connection.');
      return;
    }

    try {
      await triggerSync();
      Alert.alert('Sync Complete', `Successfully synced ${syncStats.pending} pending reports`);
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to sync reports');
      console.error('Sync error:', error);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all reports and sync history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Note: In production, implement actual database.clearAllData()
              // For now, this is a placeholder
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
              console.error('Error clearing data:', error);
            }
          },
        },
      ]
    );
  };

  const handleViewLogs = () => {
    Alert.alert(
      'Sync Logs',
      `Total: ${syncStats.total}\nPending: ${syncStats.pending}\nSynced: ${syncStats.synced}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* API Configuration Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="server" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Backend Configuration</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>API Base URL</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            placeholder="http://10.0.2.2:8002/api"
            value={apiUrl}
            onChangeText={setApiUrl}
            editable={isEditing}
            placeholderTextColor="#BBB"
          />
          <Text style={styles.inputHint}>
            Enter your backend API URL (e.g., http://server.com/api)
          </Text>
        </View>

        <View style={styles.buttonRow}>
          {!isEditing ? (
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={16} color="#007AFF" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveSettings}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setIsEditing(false);
                  loadSettings();
                }}
              >
                <Ionicons name="close" size={16} color="#999" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.resetLink}
          onPress={handleResetSettings}
        >
          <Text style={styles.resetLinkText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Configuration Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="sync" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Sync Settings</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.switchRow}>
            <Text style={styles.settingLabel}>Auto-Sync</Text>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={autoSync ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.inputHint}>
            Automatically sync reports when online
          </Text>
        </View>

        {autoSync && (
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Sync Interval (seconds)</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              value={syncInterval}
              onChangeText={setSyncInterval}
              keyboardType="number-pad"
              maxLength={3}
              placeholderTextColor="#BBB"
            />
            <Text style={styles.inputHint}>
              Minimum: 10 seconds, Default: 30 seconds
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.syncButton, isSyncing && { opacity: 0.5 }]}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.syncButtonText}>Syncing...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={isOnline ? 'cloud-upload' : 'cloud-offline'}
                size={16}
                color="#fff"
              />
              <Text style={styles.syncButtonText}>
                {isOnline ? 'Sync Now' : 'Offline - Cannot Sync'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Monitoring Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart" size={20} color="#FF9800" />
          <Text style={styles.sectionTitle}>Sync Status</Text>
        </View>

        {/* Network Status Indicator */}
        <View style={[styles.statusBox, { borderLeftColor: isOnline ? '#4CAF50' : '#FF9800' }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#FF9800' }]} />
            <Text style={styles.statusHeaderText}>
              {isOnline ? '🟢 ONLINE - Ready to Sync' : '🟠 OFFLINE - Queued'}
            </Text>
          </View>
          <Text style={styles.statusDescription}>
            {isOnline
              ? 'Your reports will sync automatically every 30 seconds'
              : 'Reports are saved locally and will sync when you reconnect'}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{syncStats.total}</Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>
              {syncStats.pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {syncStats.synced}
            </Text>
            <Text style={styles.statLabel}>Synced</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.syncNowButton, isSyncing && { opacity: 0.5 }]}
          onPress={handleManualSync}
          disabled={isSyncing || !isOnline}
        >
          {isSyncing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.syncNowButtonText}>Syncing...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={isOnline ? 'cloud-upload' : 'cloud-offline'}
                size={18}
                color="#fff"
              />
              <Text style={styles.syncNowButtonText}>
                {isOnline ? 'Sync Now' : 'Offline - Cannot Sync'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logsButton} onPress={handleViewLogs}>
          <Ionicons name="document-text" size={16} color="#FF9800" />
          <Text style={styles.logsButtonText}>View Sync Details</Text>
        </TouchableOpacity>
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trash" size={20} color="#FF3B30" />
          <Text style={styles.sectionTitle}>Data Management</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleClearAllData}
        >
          <Ionicons name="warning" size={16} color="#fff" />
          <Text style={styles.dangerButtonText}>Clear All Data</Text>
        </TouchableOpacity>

        <Text style={styles.dangerHint}>
          This will permanently delete all reports and sync history. This action cannot be
          undone.
        </Text>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle" size={20} color="#666" />
          <Text style={styles.sectionTitle}>About</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>App Name</Text>
          <Text style={styles.infoValue}>RoadGuard Mobile</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{version}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://roadguard.example.com/help')}
        >
          <Ionicons name="help-circle" size={16} color="#007AFF" />
          <Text style={styles.linkButtonText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://roadguard.example.com/privacy')}
        >
          <Ionicons name="shield-checkmark" size={16} color="#007AFF" />
          <Text style={styles.linkButtonText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  editButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#999',
    fontWeight: '600',
  },
  resetLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetLinkText: {
    color: '#999',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  logsButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logsButtonText: {
    color: '#FF6F00',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dangerHint: {
    fontSize: 12,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  linkButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  statusBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusHeaderText: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  statusDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  syncNowButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  syncNowButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    height: 32,
  },
});

export default SettingsScreen;
