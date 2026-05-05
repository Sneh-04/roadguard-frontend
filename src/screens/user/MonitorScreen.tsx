import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Accelerometer } from 'expo-sensors';
import Svg, {
  Line,
  Circle,
  Text as SvgText,
  G,
  Rect,
  Path,
} from 'react-native-svg';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useAccelerometer } from '../../hooks/useAccelerometer';
import { apiService } from '../../services/api';

const { width } = Dimensions.get('window');
const GRAPH_WIDTH = width - spacing.lg * 2;
const GRAPH_HEIGHT = 150;
const MAX_DATA_POINTS = 100;

interface SensorData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
  magnitude: number;
}

interface FusionResult {
  hazard_type: number;
  confidence: number;
  sensor_contribution: number;
  vision_contribution: number;
  timestamp: string;
}

type MonitorState = 'IDLE' | 'MONITORING' | 'DETECTING' | 'ALERT' | 'PROCESSING';

export default function MonitorScreen() {
  const navigation = useNavigation();
  const [monitorState, setMonitorState] = useState<MonitorState>('IDLE');
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [fusionResults, setFusionResults] = useState<FusionResult[]>([]);
  const [spikeDetected, setSpikeDetected] = useState(false);
  const [lastSpikeTime, setLastSpikeTime] = useState<number | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);

  const { accelerometerData, isMonitoring, startMonitoring, stopMonitoring } = useAccelerometer();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Spike detection parameters
  const SPIKE_THRESHOLD = 2.5; // m/s²
  const SPIKE_COOLDOWN = 2000; // 2 seconds

  useEffect(() => {
    if (accelerometerData && isMonitoring) {
      const magnitude = Math.sqrt(
        accelerometerData.x ** 2 +
        accelerometerData.y ** 2 +
        accelerometerData.z ** 2
      );

      const newDataPoint: SensorData = {
        x: accelerometerData.x,
        y: accelerometerData.y,
        z: accelerometerData.z,
        magnitude,
        timestamp: Date.now(),
      };

      if (mountedRef.current) {
        setSensorData(prev => {
          const updated = [...prev, newDataPoint];
          return updated.length > MAX_DATA_POINTS ? updated.slice(-MAX_DATA_POINTS) : updated;
        });
      }

      // Spike detection
      if (magnitude > SPIKE_THRESHOLD) {
        const now = Date.now();
        if (!lastSpikeTime || now - lastSpikeTime > SPIKE_COOLDOWN) {
          if (mountedRef.current) {
            setSpikeDetected(true);
            setLastSpikeTime(now);
            setDetectionCount(prev => prev + 1);

            // Trigger fusion analysis
            performFusionAnalysis(newDataPoint);
          }

          // Reset spike detection after animation
          setTimeout(() => {
            if (mountedRef.current) setSpikeDetected(false);
          }, 1000);
        }
      }
    }
  }, [accelerometerData, isMonitoring, lastSpikeTime]);

  const performFusionAnalysis = async (sensorData: SensorData) => {
    try {
      if (mountedRef.current) setMonitorState('PROCESSING');

      const fusionData = {
        accelerometer: {
          x: sensorData.x,
          y: sensorData.y,
          z: sensorData.z,
        },
        timestamp: sensorData.timestamp,
      };

      const response = await apiService.getPrediction(fusionData);

      if (response.success && response.data && mountedRef.current) {
        const result: FusionResult = {
          hazard_type: response.data.hazard_type,
          confidence: response.data.confidence,
          sensor_contribution: response.data.sensor_contribution || 0.7,
          vision_contribution: response.data.vision_contribution || 0.3,
          timestamp: new Date().toISOString(),
        };

        setFusionResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results

        if (result.confidence > 0.8) {
          setMonitorState('ALERT');
          // Trigger notification or alert
          Alert.alert(
            'Hazard Detected!',
            `High confidence ${result.hazard_type === 1 ? 'speed breaker' : 'pothole'} detection`,
            [{ text: 'OK' }]
          );
        } else {
          setMonitorState('DETECTING');
        }
      }
    } catch (error) {
      console.error('Fusion analysis failed:', error);
      if (mountedRef.current) setMonitorState('MONITORING');
    }
  };

  const toggleMonitoring = async () => {
    if (isMonitoring) {
      await stopMonitoring();
      if (mountedRef.current) {
        setMonitorState('IDLE');
        setSensorData([]);
        setFusionResults([]);
        setDetectionCount(0);
      }
    } else {
      const success = await startMonitoring();
      if (success && mountedRef.current) {
        setMonitorState('MONITORING');
      }
    }
  };

  const getStateColor = (state: MonitorState) => {
    switch (state) {
      case 'IDLE': return colors.textMuted;
      case 'MONITORING': return colors.accent;
      case 'DETECTING': return colors.warning;
      case 'ALERT': return colors.danger;
      case 'PROCESSING': return colors.accent;
      default: return colors.textMuted;
    }
  };

  const getStateIcon = (state: MonitorState) => {
    switch (state) {
      case 'IDLE': return '⏸️';
      case 'MONITORING': return '📡';
      case 'DETECTING': return '🔍';
      case 'ALERT': return '🚨';
      case 'PROCESSING': return '⚙️';
      default: return '❓';
    }
  };

  const renderAccelerometerGraph = (data: SensorData[], dataKey: 'x' | 'y' | 'z' | 'magnitude', color: string, label: string) => {
    if (data.length < 2) return null;

    const values = data.map(d => d[dataKey]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * GRAPH_WIDTH;
      const y = GRAPH_HEIGHT - ((d[dataKey] - min) / range) * (GRAPH_HEIGHT - 20) - 10;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <View style={styles.graphContainer}>
        <Text style={[styles.graphLabel, { color }]}>{label}</Text>
        <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
          {/* Grid lines */}
          <G>
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <Line
                key={ratio}
                x1={0}
                y1={ratio * (GRAPH_HEIGHT - 20) + 10}
                x2={GRAPH_WIDTH}
                y2={ratio * (GRAPH_HEIGHT - 20) + 10}
                stroke={colors.surfaceLight}
                strokeWidth={1}
                opacity={0.3}
              />
            ))}
          </G>

          {/* Data line */}
          <Path
            d={points}
            stroke={color}
            strokeWidth={2}
            fill="none"
          />

          {/* Current value indicator */}
          {data.length > 0 && (
            <Circle
              cx={GRAPH_WIDTH - 10}
              cy={GRAPH_HEIGHT - ((data[data.length - 1][dataKey] - min) / range) * (GRAPH_HEIGHT - 20) - 10}
              r={4}
              fill={color}
            />
          )}
        </Svg>
      </View>
    );
  };

  const renderFusionResult = (result: FusionResult, index: number) => (
    <View key={index} style={styles.fusionResult}>
      <View style={styles.fusionHeader}>
        <Text style={styles.fusionType}>
          {result.hazard_type === 1 ? '⚠️ Speed Breaker' : '🔴 Pothole'}
        </Text>
        <Text style={styles.fusionConfidence}>
          {Math.round(result.confidence * 100)}%
        </Text>
      </View>

      <View style={styles.fusionContributions}>
        <View style={styles.contributionBar}>
          <View
            style={[
              styles.contributionFill,
              {
                width: `${result.sensor_contribution * 100}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
          <Text style={styles.contributionText}>
            Sensor: {Math.round(result.sensor_contribution * 100)}%
          </Text>
        </View>

        <View style={styles.contributionBar}>
          <View
            style={[
              styles.contributionFill,
              {
                width: `${result.vision_contribution * 100}%`,
                backgroundColor: colors.secondary,
              },
            ]}
          />
          <Text style={styles.contributionText}>
            Vision: {Math.round(result.vision_contribution * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sensor Monitor</Text>
        <View style={styles.placeholder} />
      </View>

      {/* State Machine UI */}
      <View style={styles.stateContainer}>
        <View style={[styles.stateIndicator, { backgroundColor: getStateColor(monitorState) }]}>
          <Text style={styles.stateIcon}>{getStateIcon(monitorState)}</Text>
        </View>
        <View style={styles.stateInfo}>
          <Text style={styles.stateTitle}>{monitorState}</Text>
          <Text style={styles.stateSubtitle}>
            {monitorState === 'IDLE' && 'Ready to start monitoring'}
            {monitorState === 'MONITORING' && 'Actively monitoring sensors'}
            {monitorState === 'DETECTING' && 'Analyzing sensor data'}
            {monitorState === 'ALERT' && 'Hazard detected!'}
            {monitorState === 'PROCESSING' && 'Processing fusion results'}
          </Text>
        </View>
      </View>

      {/* Control Button */}
      <TouchableOpacity
        style={[styles.monitorButton, { backgroundColor: getStateColor(monitorState) }]}
        onPress={toggleMonitoring}
      >
        <Text style={styles.monitorButtonText}>
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </Text>
      </TouchableOpacity>

      {/* Spike Detection Indicator */}
      {spikeDetected && (
        <View style={styles.spikeAlert}>
          <Text style={styles.spikeIcon}>⚡</Text>
          <Text style={styles.spikeText}>Spike Detected!</Text>
        </View>
      )}

      {/* Accelerometer Graphs */}
      {isMonitoring && (
        <View style={styles.graphsContainer}>
          <Text style={styles.sectionTitle}>Accelerometer Data</Text>

          {renderAccelerometerGraph(sensorData, 'x', colors.danger, 'X-Axis (m/s²)')}
          {renderAccelerometerGraph(sensorData, 'y', colors.success, 'Y-Axis (m/s²)')}
          {renderAccelerometerGraph(sensorData, 'z', colors.accent, 'Z-Axis (m/s²)')}
          {renderAccelerometerGraph(sensorData, 'magnitude', colors.warning, 'Magnitude (m/s²)')}

          {/* Threshold Line */}
          <View style={styles.thresholdContainer}>
            <Text style={styles.thresholdLabel}>Spike Threshold: {SPIKE_THRESHOLD} m/s²</Text>
            <View style={styles.thresholdLine} />
          </View>
        </View>
      )}

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{detectionCount}</Text>
          <Text style={styles.statLabel}>Detections</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>
            {sensorData.length > 0 ? sensorData[sensorData.length - 1]?.magnitude.toFixed(2) : '0.00'}
          </Text>
          <Text style={styles.statLabel}>Current Mag</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>
            {sensorData.length > 0 ? Math.max(...sensorData.map(d => d.magnitude)).toFixed(2) : '0.00'}
          </Text>
          <Text style={styles.statLabel}>Peak Mag</Text>
        </View>
      </View>

      {/* Fusion Results */}
      {fusionResults.length > 0 && (
        <View style={styles.fusionContainer}>
          <Text style={styles.sectionTitle}>Fusion Results</Text>
          {fusionResults.map((result, index) => renderFusionResult(result, index))}
        </View>
      )}

      {/* Instructions */}
      {!isMonitoring && (
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to Use</Text>
          <Text style={styles.instructionText}>
            1. Start monitoring to begin sensor data collection{'\n'}
            2. Drive normally while holding your phone{'\n'}
            3. The system will detect spikes in acceleration{'\n'}
            4. AI fusion combines sensor and vision data{'\n'}
            5. High-confidence hazards trigger alerts
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
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stateIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stateIcon: {
    fontSize: 24,
  },
  stateInfo: {
    flex: 1,
  },
  stateTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stateSubtitle: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  monitorButton: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  monitorButtonText: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  spikeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  spikeIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  spikeText: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  graphsContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  graphContainer: {
    marginBottom: spacing.lg,
  },
  graphLabel: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  thresholdContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  thresholdLabel: {
    ...typography.text.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  thresholdLine: {
    width: GRAPH_WIDTH,
    height: 2,
    backgroundColor: colors.danger,
    opacity: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  statLabel: {
    ...typography.text.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  fusionContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fusionResult: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  fusionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fusionType: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  fusionConfidence: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  fusionContributions: {
    gap: spacing.xs,
  },
  contributionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  contributionFill: {
    height: 20,
  },
  contributionText: {
    ...typography.text.xs,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  instructions: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionTitle: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  instructionText: {
    ...typography.text.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
});