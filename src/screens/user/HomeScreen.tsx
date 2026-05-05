import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useHazards } from '../../hooks/useHazards';
import { useWeather } from '../../hooks/useWeather';
import { useLocation } from '../../hooks/useLocation';
import { offlineService } from '../../services/offlineService';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const { hazards, loading: hazardsLoading } = useHazards();
  const { weather, loading: weatherLoading } = useWeather();
  const { location, speed } = useLocation();

  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isOnline, setIsOnline] = useState(offlineService.isConnected());

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Set current date
    setCurrentDate(new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }));
  }, []);

  // Calculate safety score (simplified)
  const calculateSafetyScore = () => {
    if (!hazards || hazards.length === 0) return 100;
    const nearbyHazards = hazards.filter(h => (h.distance ?? 0) < 5); // within 5km
    const hazardPenalty = nearbyHazards.length * 10;
    return Math.max(0, 100 - hazardPenalty);
  };

  const safetyScore = calculateSafetyScore();
  const nearbyHazards = hazards?.filter(h => (h.distance ?? 0) < 5) || [];
  const potholesNearby = nearbyHazards.filter(h => h.hazard_type === 2).length;
  const speedBreakersNearby = nearbyHazards.filter(h => h.hazard_type === 1).length;

  // Recent hazards (last 5)
  const recentHazards = hazards?.slice(0, 5) || [];

  // Recent alerts (hazards detected in last 10 minutes within 2km)
  const recentAlerts = hazards?.filter(h => {
    const hazardTime = new Date(h.timestamp);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return hazardTime > tenMinutesAgo && (h.distance ?? 0) < 2;
  }) || [];

  const SafetyScoreGauge = ({ score }: { score: number }) => {
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getScoreColor = (score: number) => {
      if (score >= 80) return colors.success;
      if (score >= 50) return colors.warning;
      return colors.danger;
    };

    return (
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.surfaceLight}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getScoreColor(score)}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
          <SvgText
            x={size / 2}
            y={size / 2 - 10}
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill={colors.text}
          >
            {score}
          </SvgText>
          <SvgText
            x={size / 2}
            y={size / 2 + 10}
            textAnchor="middle"
            fontSize="12"
            fill={colors.textMuted}
          >
            SCORE
          </SvgText>
        </Svg>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {greeting}, User
          </Text>
          <Text style={styles.date}>{currentDate}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.onlineStatus}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
            <Text style={[styles.statusText, { color: isOnline ? colors.success : colors.warning }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.notificationIcon}>🔔</Text>
            {recentAlerts.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{recentAlerts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Safety Score Card */}
      <View style={styles.safetyCard}>
        <SafetyScoreGauge score={safetyScore} />
        <View style={styles.safetyText}>
          <Text style={styles.safetyTitle}>Area Safety Score</Text>
          <Text style={styles.safetySubtitle}>
            Based on hazards in your 5km radius
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.danger }]}>
            {nearbyHazards.length}
          </Text>
          <Text style={styles.statLabel}>Nearby Hazards</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.danger }]}>
            {potholesNearby}
          </Text>
          <Text style={styles.statLabel}>Potholes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {speedBreakersNearby}
          </Text>
          <Text style={styles.statLabel}>Speed Breakers</Text>
        </View>
      </View>

      {/* Report Hazard Button */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => (navigation as any).navigate('HazardReport')}
      >
        <Text style={styles.reportButtonIcon}>📸</Text>
        <View style={styles.reportButtonContent}>
          <Text style={styles.reportButtonTitle}>Report a Hazard</Text>
          <Text style={styles.reportButtonSubtitle}>Help protect other drivers</Text>
        </View>
        <Text style={styles.reportButtonArrow}>→</Text>
      </TouchableOpacity>

      {/* Live Sensor Status */}
      <View style={styles.sensorCard}>
        <View style={styles.sensorHeader}>
          <Text style={styles.sensorTitle}>Live Sensor Status</Text>
          <View style={[styles.sensorStatusDot, { backgroundColor: colors.accent }]} />
        </View>
        <Text style={styles.sensorStatus}>IDLE</Text>
        <Text style={styles.currentSpeed}>
          Current Speed: {speed ? `${speed.toFixed(1)} km/h` : 'N/A'}
        </Text>
        <TouchableOpacity
          style={styles.monitorButton}
          onPress={() => (navigation as any).navigate('Monitor')}
        >
          <Text style={styles.monitorButtonText}>Start Monitoring</Text>
        </TouchableOpacity>
      </View>

      {/* Weather Widget */}
      <TouchableOpacity
        style={styles.weatherCard}
        onPress={() => (navigation as any).navigate('Weather')}
      >
        <View style={styles.weatherLeft}>
          <Text style={styles.weatherIcon}>
            {weather?.condition === 'Rain' ? '🌧' :
             weather?.condition === 'Clear' ? '☀️' :
             weather?.condition === 'Clouds' ? '☁️' : '🌤️'}
          </Text>
          <View>
            <Text style={styles.weatherTemp}>
              {weather?.temperature ? `${Math.round(weather.temperature)}°C` : '--°C'}
            </Text>
            <Text style={styles.weatherCity}>
              {location?.city || 'Loading...'}
            </Text>
          </View>
        </View>
        {(weather?.precipitation ?? 0) > 0 && (
          <Text style={styles.rainWarning}>⚠ Wet roads — drive carefully</Text>
        )}
      </TouchableOpacity>

      {/* Recent Hazards */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Hazards</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('HazardHistory')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hazardsScroll}>
          {recentHazards.map((hazard) => (
            <TouchableOpacity key={hazard.id} style={styles.hazardCard}>
              <Text style={styles.hazardType}>
                {hazard.hazard_type === 1 ? '⚠️ Speed Breaker' :
                 hazard.hazard_type === 2 ? '🔴 Pothole' : '✅ Normal'}
              </Text>
              <Text style={styles.hazardDistance}>{(hazard.distance ?? 0).toFixed(1)}km</Text>
              <Text style={styles.hazardTime}>
                {formatDistanceToNow(new Date(hazard.timestamp), { addSuffix: true })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recent Alerts Banner */}
      {recentAlerts.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>⚠</Text>
          <Text style={styles.alertText}>
            {recentAlerts.length === 1
              ? `Pothole detected ${(recentAlerts[0]?.distance ?? 0).toFixed(1)}km ahead`
              : `${recentAlerts.length} hazards detected nearby`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  notificationIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.text.xs,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  safetyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gaugeContainer: {
    marginRight: spacing.lg,
  },
  safetyText: {
    flex: 1,
  },
  safetyTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  safetySubtitle: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    ...typography.text.xxl,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    ...typography.text.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sensorCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sensorTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  sensorStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sensorStatus: {
    ...typography.text.md,
    color: colors.accent,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  currentSpeed: {
    ...typography.text.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  monitorButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  monitorButtonText: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  weatherCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  weatherTemp: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  weatherCity: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  rainWarning: {
    ...typography.text.sm,
    color: colors.warning,
    fontWeight: typography.fontWeight.medium,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  viewAllText: {
    ...typography.text.md,
    color: colors.accent,
    fontWeight: typography.fontWeight.medium,
  },
  hazardsScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  hazardCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hazardType: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hazardDistance: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  hazardTime: {
    ...typography.text.xs,
    color: colors.textMuted,
  },
  alertBanner: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  reportButtonIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  reportButtonContent: {
    flex: 1,
  },
  reportButtonTitle: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  reportButtonSubtitle: {
    ...typography.text.xs,
    color: colors.textMuted,
  },
  reportButtonArrow: {
    fontSize: 20,
    color: colors.accent,
  },
  alertText: {
    ...typography.text.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.medium,
  },
});