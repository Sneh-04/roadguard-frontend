import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { colors } from '../../theme/colors';
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
  user_id?: string;
}

export default function AdminReportsScreen() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'pending'>('all');

  useEffect(() => {
    loadHazards();
  }, []);

  const loadHazards = async () => {
    try {
      setLoading(true);
      const response = await apiService.getHazards();

      if (response.success && response.data) {
        setHazards(response.data);
      } else {
        Alert.alert('Error', 'Failed to load hazards');
      }
    } catch (error) {
      console.error('Failed to load hazards:', error);
      Alert.alert('Error', 'Failed to load hazards');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHazards();
    setRefreshing(false);
  };

  const handleHazardAction = async (hazardId: string, action: 'resolve' | 'delete') => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} this hazard?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              let response;
              if (action === 'delete') {
                response = await apiService.deleteHazard(hazardId);
              } else if (action === 'resolve') {
                const hazard = hazards.find(h => h.id === hazardId);
                if (hazard) {
                  const updates = { ...hazard, status: 'resolved' };
                  response = await apiService.updateHazard(hazardId, updates);
                }
              }

              if (response?.success) {
                await loadHazards(); // Refresh the list
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
      ]
    );
  };

  const getHazardTypeLabel = (type: number): string => {
    const types: { [key: number]: string } = {
      0: 'Normal',
      1: 'Pothole',
      2: 'Speed Breaker',
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
        <Text style={styles.hazardType}>
          {getHazardTypeLabel(item.hazard_type)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.hazardLocation}>
        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
      </Text>

      <View style={styles.hazardDetails}>
        <Text style={styles.hazardConfidence}>
          Confidence: {(item.confidence * 100).toFixed(1)}%
        </Text>
        <Text style={styles.hazardTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.hazardActions}>
        {item.status !== 'resolved' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.resolveButton]}
            onPress={() => handleHazardAction(item.id, 'resolve')}
          >
            <Text style={styles.resolveButtonText}>Resolve</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleHazardAction(item.id, 'delete')}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
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
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading hazards...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Hazard Management</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{hazards.length}</Text>
          <Text style={styles.statLabel}>Total Hazards</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {hazards.filter(h => h.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {hazards.filter(h => h.status === 'resolved').length}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {hazards.filter(h => h.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('active', 'Active')}
        {renderFilterButton('pending', 'Pending')}
        {renderFilterButton('resolved', 'Resolved')}
      </View>

      {/* Hazards List */}
      <FlatList
        data={filteredHazards}
        renderItem={renderHazardItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'all' ? 'No hazards found' : `No ${filter} hazards found`}
            </Text>
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hazardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  hazardType: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...typography.text.xs,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  hazardLocation: {
    ...typography.text.md,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  hazardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButton: {
    backgroundColor: colors.success,
  },
  resolveButtonText: {
    ...typography.text.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  deleteButtonText: {
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