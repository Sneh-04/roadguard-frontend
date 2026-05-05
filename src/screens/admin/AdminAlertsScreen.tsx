import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { apiService } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

interface HazardReport {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  description: string;
  image_path: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export default function AdminAlertsScreen() {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadReports = async () => {
    try {
      const response = await apiService.request<any>('GET', '/admin/reports');

      if (response.success && response.data?.reports) {
        const sorted = response.data.reports.sort(
          (a: HazardReport, b: HazardReport) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setReports(sorted);
      } else {
        throw new Error('Failed to load reports');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      if (!refreshing && loading) {
        Alert.alert('Error', 'Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: number, newStatus: 'reviewed' | 'resolved') => {
    try {
      const response = await apiService.request<any>('PUT', `/admin/reports/${reportId}/status`, { status: newStatus });

      if (response.success) {
        setReports(prev =>
          prev.map(r => (r.id === reportId ? { ...r, status: newStatus } : r))
        );
        Alert.alert('Success', `Marked as ${newStatus}`);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update');
    }
  };

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  const renderReport = ({ item }: { item: HazardReport }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                item.status === 'pending'
                  ? colors.danger
                  : item.status === 'reviewed'
                  ? colors.warning
                  : colors.success,
            },
          ]}
        >
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.reportId}>Report #{item.id}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
        </Text>
        <Text style={styles.infoText}>
          🕐 {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.warning }]}
            onPress={() => handleUpdateStatus(item.id, 'reviewed')}
          >
            <Text style={styles.btnText}>Review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.success }]}
            onPress={() => handleUpdateStatus(item.id, 'resolved')}
          >
            <Text style={styles.btnText}>Resolve</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'reviewed' && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.success }]}
          onPress={() => handleUpdateStatus(item.id, 'resolved')}
        >
          <Text style={styles.btnText}>Mark as Resolved</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleSection}>
        <Text style={styles.title}>Hazard Reports</Text>
        <Text style={styles.subtitle}>{filteredReports.length} report(s)</Text>
      </View>

      <View style={styles.filterBar}>
        {(['all', 'pending', 'reviewed', 'resolved'] as const).map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterBtn, filter === status && styles.filterBtnActive]}
            onPress={() => setFilter(status)}
          >
            <Text
              style={[styles.filterText, filter === status && styles.filterTextActive]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reports</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderReport}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadReports();
                setRefreshing(false);
              }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text,
  },
  titleSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    ...typography.text.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.textMuted,
    ...typography.text.xs,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  badgeText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  reportId: {
    color: colors.textMuted,
    fontSize: 12,
  },
  description: {
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  info: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});
