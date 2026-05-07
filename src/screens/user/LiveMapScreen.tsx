import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useHazards } from '../../hooks/useHazards';
import { useLocation } from '../../hooks/useLocation';
import { useRoadHazardDetection } from '../../hooks/useRoadHazardDetection';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { HAZARD_COLORS, HAZARD_LABELS, HAZARD_EMOJIS, MAP_DARK_STYLE } from '../../utils/constants';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = Math.min(280, height * 0.36);

export default function LiveMapScreen() {
  const navigation = useNavigation();
  const { hazards, loading, fetchHazards } = useHazards();
  const { location, loading: locationLoading } = useLocation();
  const {
    isMonitoring,
    statusLabel,
    hazardType,
    confidence,
    detectionCount,
    lastDetectionAt,
    error,
    startMonitoring,
    stopMonitoring,
  } = useRoadHazardDetection();
  const [selectedHazard, setSelectedHazard] = useState<string | null>(null);
  const bottomSheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const [region, setRegion] = useState<Region>({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 0.015,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    if (location) {
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.01,
      });
    }
  }, [location]);

  useEffect(() => {
    if (hazards.length > 0) {
      Animated.spring(bottomSheetAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(bottomSheetAnim, {
        toValue: BOTTOM_SHEET_HEIGHT,
        useNativeDriver: true,
      }).start();
    }
  }, [hazards.length, bottomSheetAnim]);

  const toggleMonitoring = async () => {
    if (isMonitoring) {
      await stopMonitoring();
    } else {
      await startMonitoring();
    }
  };

  const nearbyHazards = useMemo(() => hazards.slice(0, 6), [hazards]);

  const speed = location?.speed != null ? Math.round(location.speed * 3.6) : 0;
  const userMarker = useMemo(
    () => ({
      latitude: location?.latitude ?? region.latitude,
      longitude: location?.longitude ?? region.longitude,
    }),
    [location, region]
  );

  const renderHazardRow = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.hazardRow}
      onPress={() => {
        setSelectedHazard(item.id);
        setRegion(prev => ({ ...prev, latitude: item.latitude, longitude: item.longitude }));
      }}
    >
      <View style={[styles.hazardMarker, { backgroundColor: HAZARD_COLORS[item.hazard_type] || colors.accent }]}> 
        <Text style={styles.hazardEmoji}>{HAZARD_EMOJIS[item.hazard_type] ?? '⚠️'}</Text>
      </View>
      <View style={styles.hazardInfo}>
        <Text style={styles.hazardName}>{HAZARD_LABELS[item.hazard_type] ?? 'Hazard'}</Text>
        <Text style={styles.hazardSubtitle}>{item.distance?.toFixed(1)} km away · {(item.confidence * 100).toFixed(0)}%</Text>
      </View>
      <Text style={styles.hazardTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
    </TouchableOpacity>
  );

  const mapReady = !locationLoading && !!location;

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        customMapStyle={MAP_DARK_STYLE}
        showsUserLocation={true}
        followsUserLocation={true}
        showsCompass={true}
        showsMyLocationButton={false}
      >
        {hazards.map(hazard => (
          <Marker
            key={hazard.id}
            coordinate={{ latitude: hazard.latitude, longitude: hazard.longitude }}
            pinColor={HAZARD_COLORS[hazard.hazard_type] ?? colors.warning}
            onPress={() => setSelectedHazard(hazard.id)}
          >
            <View style={styles.markerPin}>
              <Text style={styles.markerPinText}>{HAZARD_EMOJIS[hazard.hazard_type] ?? '⚠️'}</Text>
            </View>
          </Marker>
        ))}

        {location && (
          <Circle
            center={{ latitude: location.latitude, longitude: location.longitude }}
            radius={120}
            fillColor="rgba(6, 182, 212, 0.12)"
            strokeColor="rgba(6, 182, 212, 0.25)"
          />
        )}
      </MapView>

      <BlurView intensity={90} tint="dark" style={styles.headerOverlay}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.appTitle}>RoadGuard</Text>
            <Text style={styles.appSubtitle}>Live hazard monitoring</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchHazards}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Speed</Text>
            <Text style={styles.metricValue}>{speed} km/h</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Status</Text>
            <Text style={styles.metricValue}>{statusLabel}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Alerts</Text>
            <Text style={styles.metricValue}>{hazards.length}</Text>
          </View>
        </View>
      </BlurView>

      <View style={styles.fabGroup}>
        <TouchableOpacity style={[styles.fabButton, isMonitoring ? styles.fabActive : styles.fabInactive]} onPress={toggleMonitoring}>
          <Text style={styles.fabText}>{isMonitoring ? 'Stop' : 'Start'}</Text>
          <Text style={styles.fabSubtext}>Monitoring</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fabButton} onPress={() => navigation.navigate('HazardReport')}> 
          <Text style={styles.fabText}>Report</Text>
          <Text style={styles.fabSubtext}>Hazard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fabButton} onPress={() => navigation.navigate('Monitor')}> 
          <Text style={styles.fabText}>Sensor</Text>
          <Text style={styles.fabSubtext}>Details</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: bottomSheetAnim }] },
        ]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Nearby hazards</Text>
          <Text style={styles.sheetSubtitle}>{nearbyHazards.length} visible</Text>
        </View>
        {loading ? (
          <View style={styles.sheetLoader}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={nearbyHazards}
            keyExtractor={(item) => item.id}
            renderItem={renderHazardRow}
            ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {selectedHazard && (
        <View style={styles.hazardPreview}>
          <Text style={styles.previewTitle}>Selected hazard details</Text>
          <Text style={styles.previewLabel}>{HAZARD_LABELS[hazards.find(item => item.id === selectedHazard)?.hazard_type ?? 0]}</Text>
          <Text style={styles.previewText}>
            {hazards.find(item => item.id === selectedHazard)?.description || 'No description available'}
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
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
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 24 : 44,
    left: 16,
    right: 16,
    borderRadius: 18,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  appSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  refreshText: {
    color: colors.accent,
    fontWeight: '700',
  },
  metricsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 14,
    padding: spacing.sm,
    minWidth: 90,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    marginTop: 4,
    fontWeight: '700',
  },
  fabGroup: {
    position: 'absolute',
    right: 16,
    top: 220,
    width: 120,
  },
  fabButton: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
  },
  fabActive: {
    backgroundColor: colors.accent,
  },
  fabInactive: {
    backgroundColor: colors.surface,
  },
  fabText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  fabSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sheetLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  hazardMarker: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  hazardEmoji: {
    fontSize: 18,
  },
  hazardInfo: {
    flex: 1,
  },
  hazardName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  hazardSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  hazardTime: {
    color: colors.textMuted,
    fontSize: 11,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: colors.surfaceLight,
    marginVertical: spacing.sm,
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
  hazardPreview: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: BOTTOM_SHEET_HEIGHT + 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 18,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  previewTitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  previewLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  previewText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: Platform.OS === 'android' ? 90 : 110,
    backgroundColor: colors.danger,
    borderRadius: 16,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.text,
    fontWeight: '700',
  },
});
