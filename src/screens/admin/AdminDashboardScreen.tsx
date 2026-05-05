import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { apiService } from '../../services/api';

interface SystemStats {
  total_users: number;
  total_hazards: number;
  active_hazards: number;
  total_reports: number;
  system_health: string;
  uptime: string;
}

interface RecentHazard {
  id: string;
  hazard_type: number;
  latitude: number;
  longitude: number;
  confidence: number;
  created_at: string;
  status: string;
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentHazards, setRecentHazards] = useState<RecentHazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load system stats
      const statsResponse = await apiService.getSystemStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      // Load recent hazards
      const hazardsResponse = await apiService.getHazards();
      if (hazardsResponse.success && hazardsResponse.data) {
        setRecentHazards(hazardsResponse.data.slice(0, 5)); // Get first 5
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
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

  const renderStatCard = (title: string, value: string | number, subtitle?: string) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderRecentHazard = (hazard: RecentHazard) => (
    <TouchableOpacity
      key={hazard.id}
      style={styles.hazardItem}
      onPress={() => navigation.navigate('Map' as never)}
    >
      <View style={styles.hazardHeader}>
        <Text style={styles.hazardType}>
          {getHazardTypeLabel(hazard.hazard_type)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(hazard.status) },
          ]}
        >
          <Text style={styles.statusText}>{hazard.status}</Text>
        </View>
      </View>

      <Text style={styles.hazardLocation}>
        {hazard.latitude.toFixed(4)}, {hazard.longitude.toFixed(4)}
      </Text>

      <View style={styles.hazardFooter}>
        <Text style={styles.hazardConfidence}>
          Confidence: {(hazard.confidence * 100).toFixed(1)}%
        </Text>
        <Text style={styles.hazardTime}>
          {new Date(hazard.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* System Health */}
      {stats && (
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthTitle}>System Health</Text>
            <View
              style={[
                styles.healthIndicator,
                { backgroundColor: stats.system_health === 'healthy' ? colors.success : colors.warning },
              ]}
            />
          </View>
          <Text style={styles.healthStatus}>
            Status: {(stats.system_health?.charAt(0) ?? '').toUpperCase() + (stats.system_health?.slice(1) ?? '')}
          </Text>
          <Text style={styles.uptimeText}>Uptime: {stats.uptime}</Text>
        </View>
      )}

      {/* Stats Grid */}
      {stats && (
        <View style={styles.statsGrid}>
          {renderStatCard('Total Users', stats.total_users)}
          {renderStatCard('Total Hazards', stats.total_hazards)}
          {renderStatCard('Active Hazards', stats.active_hazards)}
          {renderStatCard('Total Reports', stats.total_reports)}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Users' as never)}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionText}>Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reports' as never)}
          >
            <Text style={styles.actionIcon}>⚠️</Text>
            <Text style={styles.actionText}>Hazards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Analytics' as never)}
          >
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {/* Settings not implemented */}}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Hazards */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Hazards</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Reports' as never)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hazardsList}>
          {recentHazards.length > 0 ? (
            recentHazards.map(renderRecentHazard)
          ) : (
            <Text style={styles.noHazardsText}>No recent hazards</Text>
          )}
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  refreshIcon: {
    fontSize: 20,
    color: colors.accent,
  },
  healthCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  healthTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  healthIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  healthStatus: {
    ...typography.text.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  uptimeText: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginRight: '4%',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  statTitle: {
    ...typography.text.sm,
    color: colors.text,
    textAlign: 'center',
  },
  statSubtitle: {
    ...typography.text.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginRight: '4%',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionText: {
    ...typography.text.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  recentSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  viewAllText: {
    ...typography.text.md,
    color: colors.accent,
    fontWeight: typography.fontWeight.medium,
  },
  hazardsList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hazardItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  hazardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  hazardType: {
    ...typography.text.md,
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
    ...typography.text.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  hazardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hazardConfidence: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  hazardTime: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  noHazardsText: {
    ...typography.text.md,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
});