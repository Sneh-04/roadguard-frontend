import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { colors } from '../../theme/colors';
import { API_BASE_URL } from '../../config/api';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { apiService } from '../../services/api';

interface Hazard {
  id: string;
  hazard_type: number;
  latitude: number;
  longitude: number;
  confidence: number;
  created_at: string;
  status: string;
  image_url?: string;
  description?: string;
  user_id?: string;
}

export default function AdminReportsScreen() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'pending'>('all');

  useEffect(() => {
    loadHazards();
  }, [loadHazards]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = `wss://roadguard-backend-ympg.onrender.com/ws/live`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[AdminReports] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'hazard_update' || message.type === 'report_created' || message.type === 'hazard_created') {
          console.log('[AdminReports] Update received, refreshing data:', message.type);
          loadHazards();
        }
      } catch (error) {
        console.error('[AdminReports] Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[AdminReports] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[AdminReports] WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [loadHazards]);

  const loadHazards = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both sensor detections and user reports
      const [eventsResponse, reportsResponse] = await Promise.allSettled([
        apiService.getHazards(),
        apiService.getAdminReports()
      ]);

      let allHazards: Hazard[] = [];

      // Process sensor detections
      if (eventsResponse.status === 'fulfilled' && eventsResponse.value.success) {
        const eventsData = Array.isArray(eventsResponse.value.data)
          ? eventsResponse.value.data
          : Array.isArray((eventsResponse.value.data as any)?.events)
          ? (eventsResponse.value.data as any).events
          : [];
        allHazards = [...allHazards, ...eventsData];
      }

      // Process user reports
      if (reportsResponse.status === 'fulfilled' && reportsResponse.value.success) {
        const reportsData = Array.isArray(reportsResponse.value.data)
          ? reportsResponse.value.data
          : Array.isArray((reportsResponse.value.data as any)?.reports)
          ? (reportsResponse.value.data as any).reports
          : [];

        // Normalize user reports to match hazard format
        const normalizedReports = reportsData.map((report: any) => ({
          id: report.id || `report_${report.hazard_event_id || Date.now()}`,
          hazard_type: report.hazard?.hazard_type || report.hazard_type || 0,
          latitude: report.latitude,
          longitude: report.longitude,
          confidence: report.hazard?.confidence || report.confidence || 0.5,
          created_at: report.created_at,
          status: report.status || 'active',
          image_url: report.hazard?.image_url || null,
          description: report.description,
          user_id: report.user_id,
          is_user_report: true, // Flag to identify user reports
        }));

        allHazards = [...allHazards, ...normalizedReports];
      }

      // Normalize image URLs for all hazards
      const normalizedHazards = allHazards.map((hazard: any) => ({
        ...hazard,
        image_url: hazard.image_url && !hazard.image_url.startsWith('http')
          ? `${API_BASE_URL}${hazard.image_url}`
          : hazard.image_url,
        created_at: hazard.created_at || hazard.timestamp || new Date().toISOString(),
        status: hazard.status || 'active',
      }));

      setHazards(normalizedHazards);
    } catch (error) {
      console.error('Failed to load hazards:', error);
      Alert.alert('Error', 'Failed to load hazard reports');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHazards();
    setRefreshing(false);
  };

  const handleHazardAction = async (hazardId: string, action: 'resolve' | 'ignore' | 'delete') => {
    const confirmMessage =
      action === 'delete'
        ? 'Delete this hazard permanently?'
        : `Mark this hazard as ${action}?`;

    Alert.alert('Confirm Action', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          try {
            let response;
            if (action === 'delete') {
              response = await apiService.deleteHazard(hazardId);
            } else {
              response = await apiService.updateHazard(hazardId, { status: action });
            }

            if (response?.success) {
              await loadHazards();
              Alert.alert('Success', `Hazard ${action}d successfully`);
            } else {
              Alert.alert('Error', `Failed to ${action} hazard`);
            }
          } catch (error) {
            console.error(`Failed to ${action} hazard:`, error);
            Alert.alert('Error', `Failed to ${action} hazard`);
          }
        },
      },
    ]);
  };

  const getHazardTypeLabel = (type: number): string => {
    const types: { [key: number]: string } = {
      0: 'Other',
      1: 'Speed Breaker',
      2: 'Pothole',
      3: 'Broken Road',
    };
    return types[type] || 'Unknown';
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return colors.danger;
      case 'resolved':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'ignored':
        return colors.textMuted;
      default:
        return colors.textMuted;
    }
  };

  const filteredHazards = hazards.filter(hazard => {
    if (filter === 'all') return true;
    return hazard.status.toLowerCase() === filter;
  });

  const renderHazardItem = ({ item }: { item: Hazard }) => (
    <View style={styles.hazardItem}>
      <View style={styles.hazardHeader}>
        <Text style={styles.hazardType}>{getHazardTypeLabel(item.hazard_type)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}> 
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.hazardImage} />
      ) : null}

      <Text style={styles.hazardDescription}>{item.description || 'No description provided'}</Text>
      <Text style={styles.hazardLocation}>Lat {item.latitude.toFixed(4)}, Lon {item.longitude.toFixed(4)}</Text>
      <View style={styles.hazardDetails}>
        <Text style={styles.hazardConfidence}>Confidence: {(item.confidence * 100).toFixed(1)}%</Text>
        <Text style={styles.hazardTime}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>

      <View style={styles.hazardActions}>
        {item.status !== 'resolved' && (
          <TouchableOpacity style={[styles.actionButton, styles.resolveButton]} onPress={() => handleHazardAction(item.id, 'resolve')}>
            <Text style={styles.actionButtonText}>Solve</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionButton, styles.ignoreButton]} onPress={() => handleHazardAction(item.id, 'ignore')}>
          <Text style={styles.actionButtonText}>Ignore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleHazardAction(item.id, 'delete')}>
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterButton = (filterType: typeof filter, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[styles.filterButtonText, filter === filterType && styles.filterButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading hazard reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hazard Management</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hazards.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hazards.filter(h => h.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hazards.filter(h => h.status === 'resolved').length}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('active', 'Active')}
        {renderFilterButton('pending', 'Pending')}
        {renderFilterButton('resolved', 'Resolved')}
      </View>

      <FlatList
        data={filteredHazards}
        renderItem={renderHazardItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{filter === 'all' ? 'No hazards found' : `No ${filter} hazards found`}</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    marginRight: spacing.xs,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  statLabel: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    marginRight: spacing.xs,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
  },
  filterButtonText: {
    ...typography.text.sm,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
  filterButtonTextActive: {
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hazardItem: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  hazardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  hazardType: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
  },
  statusText: {
    ...typography.text.xs,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  hazardImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  hazardDescription: {
    ...typography.text.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hazardLocation: {
    ...typography.text.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  hazardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  hazardConfidence: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  hazardTime: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  hazardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  resolveButton: {
    backgroundColor: colors.success,
  },
  ignoreButton: {
    backgroundColor: colors.warning,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    ...typography.text.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.text.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
