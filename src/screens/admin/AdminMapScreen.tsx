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
import { BlurView } from 'expo-blur';
import { useLocation } from '../../hooks/useLocation';
import { useHazards } from '../../hooks/useHazards';
import { apiService, API_BASE_URL } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { HAZARD_COLORS, HAZARD_LABELS, HAZARD_EMOJIS, MAP_DARK_STYLE } from '../../utils/constants';

// Conditionally import MapView for native platforms only
let MapView, Marker, Circle, PROVIDER_GOOGLE;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
}

// Define Region type
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const initialRegion: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 0.03,
  longitudeDelta: 0.02,
};

export default function AdminMapScreen() {
  const { location } = useLocation();
  const [hazards, setHazards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>(initialRegion);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadHazards = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch both sensor detections and user reports
      const [eventsResponse, reportsResponse] = await Promise.allSettled([
        apiService.getHazards(),
        apiService.getAdminReports()
      ]);

      let allHazards: any[] = [];

      // Process sensor detections
      if (eventsResponse.status === 'fulfilled' && eventsResponse.value.success) {
        const eventsData = Array.isArray(eventsResponse.value.data)
          ? eventsResponse.value.data
          : Array.isArray((eventsResponse.value.data as any)?.events)
          ? (eventsResponse.value.data as any).events
          : [];
        allHazards = [...allHazards, ...eventsData];
        console.log(`[AdminMap] Loaded ${eventsData.length} sensor-detected hazards`);
      } else {
        console.warn('[AdminMap] Failed to load sensor detections:', eventsResponse.status === 'rejected' ? eventsResponse.reason : eventsResponse.value.error);
      }

      // Process user reports
      if (reportsResponse.status === 'fulfilled' && reportsResponse.value.success) {
        const reportsData = Array.isArray(reportsResponse.value.data)
          ? reportsResponse.value.data
          : Array.isArray((reportsResponse.value.data as any)?.reports)
          ? (reportsResponse.value.data as any).reports
          : [];

        console.log(`[AdminMap] Loaded ${reportsData.length} user reports`);
        console.log('[AdminMap] Sample report data:', reportsData[0]); // Debug: check data structure

        // Normalize user reports to match hazard format
        const normalizedReports = reportsData.map((report: any) => ({
          id: report.id || `report_${report.hazard_event_id || Date.now()}`,
          hazard_type: report.hazard?.hazard_type || report.hazard_type || 0,
          latitude: report.latitude,
          longitude: report.longitude,
          confidence: report.hazard?.confidence || report.confidence || 0.5,
          created_at: report.created_at,
          timestamp: report.created_at,
          status: report.status || 'active',
          image_url: report.hazard?.image_url || report.image_url || null,
          description: report.description,
          user_id: report.user_id,
          is_user_report: true, // Flag to identify user reports
        }));

        allHazards = [...allHazards, ...normalizedReports];
      } else {
        const error = reportsResponse.status === 'rejected' ? reportsResponse.reason : reportsResponse.value?.error;
        console.warn('[AdminMap] Failed to load user reports (may require admin authentication):', error);
        
        // Show a helpful message if it's an auth issue
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          console.log('[AdminMap] Admin authentication required for user reports. Only showing sensor-detected hazards.');
        }
      }

      // Normalize image URLs for all hazards
      const normalizedHazards = allHazards.map((hazard: any) => {
        const originalUrl = hazard.image_url;
        const normalizedUrl = hazard.image_url && !hazard.image_url.startsWith('http')
          ? hazard.image_url.startsWith('/')
            ? `${API_BASE_URL}${hazard.image_url}`
            : `${API_BASE_URL}/${hazard.image_url}`
          : hazard.image_url;
        
        if (originalUrl) {
          console.log('[AdminMap] Image URL normalization:', { original: originalUrl, normalized: normalizedUrl });
        }
        
        return {
          ...hazard,
          image_url: normalizedUrl,
          created_at: hazard.created_at || hazard.timestamp || new Date().toISOString(),
          timestamp: hazard.timestamp || hazard.created_at || new Date().toISOString(),
          status: hazard.status || 'active',
        };
      });

      console.log(`[AdminMap] Total hazards loaded: ${normalizedHazards.length}`);
      setHazards(normalizedHazards);
    } catch (error) {
      console.error('[AdminMap] Failed to load hazards:', error);
      Alert.alert('Error', 'Failed to load hazard reports. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHazards();
  }, [loadHazards]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const wsUrl = `wss://roadguard-backend-ympg.onrender.com/ws/live`;
    console.log('[AdminMap] Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[AdminMap] WebSocket connected successfully');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[AdminMap] WebSocket message received:', message.type);
        
        if (message.type === 'hazard_update' || message.type === 'report_created' || message.type === 'hazard_created') {
          console.log('[AdminMap] Refreshing data due to:', message.type);
          loadHazards();
        }
      } catch (error) {
        console.error('[AdminMap] Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[AdminMap] WebSocket error:', error);
      // Don't show alert for WebSocket errors as they're common in development
    };

    ws.onclose = (event) => {
      console.log('[AdminMap] WebSocket disconnected:', event.code, event.reason);
      // Could implement reconnection logic here if needed
    };

    return () => {
      console.log('[AdminMap] Closing WebSocket connection');
      ws.close();
    };
  }, [loadHazards]);

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
              await loadHazards();
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

  if (Platform.OS === 'web') {
    // Web fallback - show map placeholder
    return (
      <View style={styles.container}>
        <View style={[styles.map, styles.webMapPlaceholder]}>
          <View style={styles.webMapContent}>
            <Text style={styles.webMapTitle}>🗺️ Admin Map View</Text>
            <Text style={styles.webMapSubtitle}>Interactive map available on mobile devices</Text>
            <Text style={styles.webMapHint}>Use Expo Go app for full admin map experience</Text>
          </View>
        </View>

        <BlurView intensity={85} tint="dark" style={styles.topBadge}>
          <View>
            <Text style={styles.topTitle}>Admin Live Map</Text>
            <Text style={styles.topSubtitle}>{hazards.length} reports · Web preview</Text>
          </View>
          <TouchableOpacity style={styles.topAction} onPress={loadazards} disabled={loading}>
            <Text style={styles.topActionText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </BlurView>

        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Admin controls available on mobile</Text>
          <Text style={styles.hintText}>Solve, ignore, or delete hazard reports with real-time updates to users.</Text>
        </View>
      </View>
    );
  }

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
        {!loading && hazards.map(report => (
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

      {loading && (
        <View style={styles.loadingOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.loadingBadge}>
            <Text style={styles.loadingText}>Loading hazards...</Text>
          </BlurView>
        </View>
      )}

      <BlurView intensity={85} tint="dark" style={styles.topBadge}>
        <View>
          <Text style={styles.topTitle}>Admin Live Map</Text>
          <Text style={styles.topSubtitle}>
            {loading ? 'Loading hazards...' : `${hazards.length} reports · ${selectedHazard ? 'Detail mode' : 'Tap a marker'}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.topAction} onPress={loadHazards} disabled={loading}>
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
            <Image 
              source={{ uri: selectedHazard.image_url }} 
              style={styles.detailImage}
              onError={(error) => console.log('[AdminMap] Image load error:', selectedHazard.image_url, error)}
              onLoad={() => console.log('[AdminMap] Image loaded successfully:', selectedHazard.image_url)}
            />
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  loadingBadge: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
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
  webMapPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  webMapTitle: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  webMapSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  webMapHint: {
    fontSize: 14,
    color: colors.accent,
    textAlign: 'center',
    fontWeight: '600',
  },
});
