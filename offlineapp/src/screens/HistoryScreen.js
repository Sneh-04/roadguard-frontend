import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SectionList,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppContext } from '../context/AppContext';
import database from '../services/database';

const HistoryScreen = () => {
  const {
    complaints,
    loadComplaints,
    deleteComplaint,
    isSyncing,
    isOnline,
    syncStats,
    filterBySyncStatus,
  } = useAppContext();

  const [sections, setSections] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    updateSections();
  }, [complaints]);

  const updateSections = () => {
    const pending = complaints.filter((c) => c.sync_status === 'pending');
    const synced = complaints.filter((c) => c.sync_status === 'synced');

    setSections(
      [
        {
          title: `Pending (${pending.length})`,
          data: pending,
          color: '#FF9800',
        },
        {
          title: `Synced (${synced.length})`,
          data: synced,
          color: '#4CAF50',
        },
      ].filter((section) => section.data.length > 0)
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadComplaints();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteComplaint = (id) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComplaint(id);
              Alert.alert('Success', 'Report deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete report');
            }
          },
        },
      ]
    );
  };

  const handleViewDetails = async (complaintId) => {
    try {
      const history = await database.getSyncHistory(complaintId);
      const syncInfo = history
        .map((h) => `${h.action}: ${h.status} at ${new Date(h.synced_at).toLocaleTimeString()}`)
        .join('\n');

      Alert.alert(
        'Sync History',
        syncInfo || 'No sync history available',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error fetching sync history:', error);
      Alert.alert('Error', 'Could not load sync history');
    }
  };

  const renderComplaintCard = ({ item, section }) => (
    <TouchableOpacity
      style={styles.complaintCard}
      onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <View style={[styles.statusDot, { backgroundColor: section.color }]} />
            <Text style={styles.complaintStatus}>
              {item.sync_status === 'pending' ? '⏳ PENDING' : '✅ SYNCED'}
            </Text>
            <Text style={styles.complaintTime}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.complaintDescription} numberOfLines={2}>
            {item.description}
          </Text>
          {item.sync_status === 'pending' && (
            <Text style={styles.pendingNote}>
              ⚠️ Not yet uploaded (will sync automatically)
            </Text>
          )}
          {item.sync_status === 'synced' && item.server_id && (
            <Text style={styles.syncedNote}>
              ☁️ Successfully uploaded to server
            </Text>
          )}
        </View>
        <View style={styles.statusBadge}>
          {item.sync_status === 'pending' ? (
            <Ionicons name="cloud-upload" size={20} color="#FF9800" />
          ) : (
            <Ionicons name="cloud-done" size={20} color="#4CAF50" />
          )}
        </View>
      </View>

      {expandedId === item.id && (
        <View style={styles.expandedContent}>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="alert-circle" size={16} color="#666" />
            <Text style={styles.detailText}>Priority: {item.priority}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle" size={16} color="#666" />
            <Text style={styles.detailText}>Status: {item.status}</Text>
          </View>

          {item.server_id && (
            <View style={styles.detailRow}>
              <Ionicons name="cloud-done" size={16} color="#4CAF50" />
              <Text style={[styles.detailText, { color: '#4CAF50' }]}>
                Server ID: {item.server_id.substring(0, 8)}...
              </Text>
            </View>
          )}

          {item.sync_status === 'pending' && (
            <View style={[styles.detailRow, { backgroundColor: '#FFF3E0', padding: 8, borderRadius: 6 }]}>
              <Ionicons name="information-circle" size={16} color="#FF6F00" />
              <Text style={[styles.detailText, { color: '#FF6F00', fontWeight: '600' }]}>
                Waiting for sync (check dashboard when online)
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => handleViewDetails(item.id)}
            >
              <Ionicons name="history" size={16} color="#2196F3" />
              <Text style={styles.historyButtonText}>Sync History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteComplaint(item.id)}
            >
              <Ionicons name="trash" size={16} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title, color } }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{syncStats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#FF9800' }]}>
            {syncStats.pending}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
            {syncStats.synced}
          </Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
      </View>

      {complaints.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color="#CCC" />
          <Text style={styles.emptyStateText}>No reports yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Go to Report tab to submit your first hazard report
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderComplaintCard}
          renderSectionHeader={renderSectionHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          stickySectionHeadersEnabled={true}
        />
      )}

      {/* Sync Status */}
      {syncStats.pending > 0 && !isOnline && (
        <View style={styles.syncWarning}>
          <Ionicons name="cloud-offline" size={16} color="#FF9800" />
          <Text style={styles.syncWarningText}>
            You're offline. Reports will sync when you're back online.
          </Text>
        </View>
      )}

      {isSyncing && (
        <View style={styles.syncingIndicator}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.syncingText}>Syncing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#333',
  },
  complaintCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  complaintStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  pendingNote: {
    fontSize: 11,
    color: '#FF6F00',
    marginTop: 4,
    fontWeight: '500',
  },
  syncedNote: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  statusBadge: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  complaintTime: {
    fontSize: 12,
    color: '#999',
  },
  complaintDescription: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  expandedContent: {
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  historyButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  historyButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 12,
  },
  syncWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
  },
  syncWarningText: {
    marginLeft: 8,
    color: '#FF6F00',
    fontSize: 12,
    flex: 1,
  },
  syncingIndicator: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#BBDEFB',
  },
  syncingText: {
    marginLeft: 8,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default HistoryScreen;
