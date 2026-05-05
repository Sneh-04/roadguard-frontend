import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useHazards, Hazard } from '../../hooks/useHazards';
import { formatDistanceToNow } from 'date-fns';

export default function HazardHistoryScreen() {
  const navigation = useNavigation();
  const { hazards, loading, error, fetchHazards } = useHazards();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHazards();
    setRefreshing(false);
  };

  const renderHazardItem = ({ item }: { item: Hazard }) => {
    const getHazardTypeText = (type: number) => {
      switch (type) {
        case 1: return 'Speed Breaker';
        case 2: return 'Pothole';
        default: return 'Unknown';
      }
    };

    const getHazardIcon = (type: number) => {
      switch (type) {
        case 1: return '⚠️';
        case 2: return '🔴';
        default: return '❓';
      }
    };

    const getHazardColor = (type: number) => {
      switch (type) {
        case 1: return colors.warning;
        case 2: return colors.danger;
        default: return colors.textMuted;
      }
    };

    return (
      <TouchableOpacity style={styles.hazardItem}>
        <View style={styles.hazardLeft}>
          <Text style={styles.hazardIcon}>{getHazardIcon(item.hazard_type)}</Text>
          <View style={styles.hazardInfo}>
            <Text style={styles.hazardType}>
              {getHazardTypeText(item.hazard_type)}
            </Text>
            <Text style={styles.hazardLocation}>
              {item.distance ? `${item.distance.toFixed(1)}km away` : 'Location unknown'}
            </Text>
            <Text style={styles.hazardTime}>
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </Text>
          </View>
        </View>
        <View style={styles.hazardRight}>
          <View style={[styles.confidenceBadge, { backgroundColor: getHazardColor(item.hazard_type) }]}>
            <Text style={styles.confidenceText}>
              {Math.round(item.confidence * 100)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🛣️</Text>
      <Text style={styles.emptyTitle}>No Hazards Found</Text>
      <Text style={styles.emptySubtitle}>
        Safe driving! No hazards have been detected in your area yet.
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Unable to Load Hazards</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchHazards}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (error && !hazards.length) {
    return (
      <View style={styles.container}>
        {renderError()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Hazard History</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={hazards}
        keyExtractor={(item) => item.id}
        renderItem={renderHazardItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={hazards.length === 0 ? styles.listContainerEmpty : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {hazards.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Showing {hazards.length} hazard{hazards.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
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
  listContainer: {
    padding: spacing.lg,
  },
  listContainerEmpty: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  hazardItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hazardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hazardIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  hazardInfo: {
    flex: 1,
  },
  hazardType: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hazardLocation: {
    ...typography.text.sm,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  hazardTime: {
    ...typography.text.xs,
    color: colors.textMuted,
  },
  hazardRight: {
    alignItems: 'flex-end',
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  confidenceText: {
    ...typography.text.xs,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.text.sm,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: spacing.lg,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    ...typography.text.sm,
    color: colors.textMuted,
    textAlign: 'center',
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
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  footerText: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
});