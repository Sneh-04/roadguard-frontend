import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { useLocation } from '../../hooks/useLocation';
import { useHazards } from '../../hooks/useHazards';
import { apiService } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { HAZARD_COLORS, HAZARD_LABELS, HAZARD_EMOJIS, MAP_DARK_STYLE } from '../../utils/constants';

const initialRegion: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 0.03,
  longitudeDelta: 0.02,
};

export default function AdminMapScreen() {
  const { location } = useLocation();
  const { hazards, loading, fetchHazards } = useHazards();
  const [region, setRegion] = useState<Region>(initialRegion);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (location) {
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.02,
      });
    }
  }, [location]);

  const selectedHazard = useMemo(
    () => hazards.find(report => report.id === selectedHazardId) ?? null,
    [hazards, selectedHazardId]
  );

  const handleAction = async (action: 'resolved' | 'ignored' | 'deleted') => {
    if (!selectedHazard) return;
    const confirmMessage = action === 'deleted' ? 'Delete this hazard forever?' : `Mark this hazard as ${action}?`;

    Alert.alert('Confirm', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            let response;
            if (action === 'deleted') {
              response = await apiService.deleteHazard(selectedHazard.id);
            } else {
              response = await apiService.updateHazard(selectedHazard.id, { status: action });
            }
            if (response.success) {
              await fetchHazards();
              setSelectedHazardId(null);
              Alert.alert('Success', `Hazard ${action} successfully.`);
            } else {
              Alert.alert('Error', response.error || 'Action failed');
            }
          } catch (err) {
            console.error('Admin action failed', err);
            Alert.alert('Error', 'Action failed. Please try again.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        customMapStyle={MAP_DARK_STYLE}
        showsUserLocation={true}
        showsCompass={true}
        showsMyLocationButton={false}
      >
        {hazards.map(report => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            pinColor={HAZARD_COLORS[report.hazard_type] ?? colors.warning}
            onPress={() => setSelectedHazardId(report.id)}
          >
            <View style={styles.markerPin}>
              <Text style={styles.markerPinText}>{HAZARD_EMOJIS[report.hazard_type] ?? '⚠️'}</Text>
            </View>
          </Marker>
        ))}

        {location && (
          <Circle
            center={{ latitude: location.latitude, longitude: location.longitude }}
            radius={160}
            fillColor="rgba(16, 185, 129, 0.15)"
            strokeColor="rgba(16, 185, 129, 0.3)"
          />
        )}
      </MapView>

      <BlurView intensity={85} tint="dark" style={styles.topBadge}>
        <View>
          <Text style={styles.topTitle}>Admin Live Map</Text>
          <Text style={styles.topSubtitle}>{hazards.length} reports · {selectedHazard ? 'Detail mode' : 'Tap a marker'}</Text>
        </View>
        <TouchableOpacity style={styles.topAction} onPress={fetchHazards} disabled={loading}>
          <Text style={styles.topActionText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </BlurView>

      {selectedHazard ? (
        <View style={styles.detailPanel}>
          <View style={styles.detailBadge}>
            <Text style={styles.detailBadgeText}>{HAZARD_LABELS[selectedHazard.hazard_type] ?? 'Hazard'}</Text>
          </View>
          <Text style={styles.detailTitle}>{selectedHazard.description || 'Live hazard detail'}</Text>
          <Text style={styles.detailLine}>Confidence: {(selectedHazard.confidence * 100).toFixed(0)}%</Text>
          <Text style={styles.detailLine}>Status: {selectedHazard.status}</Text>
          <Text style={styles.detailLine}>Updated: {new Date(selectedHazard.timestamp).toLocaleString()}</Text>
          {selectedHazard.image_url ? (
            <Image source={{ uri: selectedHazard.image_url }} style={styles.detailImage} />
          ) : null}
          <View style={styles.detailActions}>
            <TouchableOpacity style={[styles.detailButton, styles.resolveButton]} onPress={() => handleAction('resolved')} disabled={busy}>
              <Text style={styles.detailButtonText}>Solve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.detailButton, styles.ignoreButton]} onPress={() => handleAction('ignored')} disabled={busy}>
              <Text style={styles.detailButtonText}>Ignore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.detailButton, styles.deleteButton]} onPress={() => handleAction('deleted')} disabled={busy}>
              <Text style={styles.detailButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Tap a hazard marker to review</Text>
          <Text style={styles.hintText}>You can solve, ignore, or delete a report with real-time updates to users.</Text>
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
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topBadge: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 22 : 42,
    left: 16,
    right: 16,
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  topTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  topSubtitle: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
  },
  topAction: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  topActionText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  hintCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: spacing.md,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 12,
  },
  hintTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  hintText: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 13,
  },
  detailPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderRadius: 24,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 12,
  },
  detailBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
  },
  detailBadgeText: {
    color: colors.text,
    fontWeight: '700',
  },
  detailTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  detailLine: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  detailImage: {
    width: '100%',
    height: 160,
    borderRadius: 18,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  detailButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
  detailButtonText: {
    color: colors.text,
    fontWeight: '800',
  },
  markerPin: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  markerPinText: {
    fontSize: 14,
  },
});
