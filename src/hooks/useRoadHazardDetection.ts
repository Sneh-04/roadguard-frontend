import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Accelerometer, Gyroscope, AccelerometerMeasurement, GyroscopeMeasurement } from 'expo-sensors';
import { apiService } from '../services/api';
import { useLocation } from './useLocation';

export type HazardClassification = 'POTHOLE' | 'SPEED_BREAKER' | 'UNKNOWN' | 'NONE';

export const useRoadHazardDetection = () => {
  const { location, speed } = useLocation();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'DETECTED' | 'COOLDOWN' | 'ERROR'>('IDLE');
  const [hazardType, setHazardType] = useState<HazardClassification>('NONE');
  const [confidence, setConfidence] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const [lastDetectionAt, setLastDetectionAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accelSubscription = useRef<any>(null);
  const gyroSubscription = useRef<any>(null);
  const motionState = useRef({
    latestAccel: { x: 0, y: 0, z: 0 },
    latestGyro: { x: 0, y: 0, z: 0 },
    lastMagnitude: 0,
    lastDetectionTime: 0,
    cooldown: false,
    pending: false,
    gravity: { x: 0, y: 0, z: 0 },
  });

  const SPEED_GATE_KMH = 10;
  const COOLDOWN_MS = 2500;
  const MAX_CONFIDENCE = 0.97;

  const sendDetection = useCallback(async (type: HazardClassification, magnitude: number, confidence: number) => {
    if (!location) return;
    const payload = {
      type,
      hazard_type: type === 'POTHOLE' ? 2 : type === 'SPEED_BREAKER' ? 1 : 0,
      latitude: location.latitude,
      longitude: location.longitude,
      confidence,
      speed: speed ?? 0,
      timestamp: new Date().toISOString(),
    };

    try {
      setStatus('COOLDOWN');
      const response = await apiService.reportDetection(payload);
      if (!response.success) {
        console.warn('[useRoadHazardDetection] Detection report failed', response.error);
      }
    } catch (err) {
      console.error('[useRoadHazardDetection] Send detection failed', err);
    }
  }, [location, speed]);

  const processMotion = useCallback(() => {
    const now = Date.now();
    const motion = motionState.current;
    const { latestAccel } = motion;
    const { x, y, z } = latestAccel;

    // Low-pass filter to estimate gravity
    const alpha = 0.8;
    motion.gravity.x = alpha * motion.gravity.x + (1 - alpha) * x;
    motion.gravity.y = alpha * motion.gravity.y + (1 - alpha) * y;
    motion.gravity.z = alpha * motion.gravity.z + (1 - alpha) * z;

    // Remove gravity to get linear acceleration
    const filteredX = x - motion.gravity.x;
    const filteredY = y - motion.gravity.y;
    const filteredZ = z - motion.gravity.z;

    // Calculate magnitude of linear acceleration
    const magnitude = Math.sqrt(
      filteredX * filteredX +
      filteredY * filteredY +
      filteredZ * filteredZ
    );

    const speedKmh = speed != null ? speed * 3.6 : 0;
    const inCooldown = now - motion.lastDetectionTime < COOLDOWN_MS;

    // ignore low-speed movement
    if (speedKmh < 12) {
      if (status !== 'IDLE') setStatus('IDLE');
      setHazardType('NONE');
      setConfidence(0);
      return;
    }

    if (inCooldown) {
      return;
    }

    // ignore tiny movement
    if (magnitude < 1.8) {
      if (status !== 'ACTIVE') setStatus('ACTIVE');
      setHazardType('NONE');
      setConfidence(0);
      return;
    }

    // speed breaker
    if (magnitude >= 1.8 && magnitude < 4.5) {
      setStatus('DETECTED');
      setHazardType('SPEED_BREAKER');
      setConfidence(0.8);
      setDetectionCount(prev => prev + 1);
      setLastDetectionAt(new Date(now).toISOString());
      motion.lastDetectionTime = now;
      sendDetection('SPEED_BREAKER', magnitude, 0.8);
      return;
    }

    // pothole
    if (magnitude >= 4.5) {
      setStatus('DETECTED');
      setHazardType('POTHOLE');
      setConfidence(0.9);
      setDetectionCount(prev => prev + 1);
      setLastDetectionAt(new Date(now).toISOString());
      motion.lastDetectionTime = now;
      sendDetection('POTHOLE', magnitude, 0.9);
      return;
    }
  }, [sendDetection, speed, status]);

  const startMonitoring = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError('Sensor monitoring is not available on web');
      setStatus('ERROR');
      return false;
    }

    try {
      setError(null);

      const accelAvailable = await Accelerometer.isAvailableAsync();
      const gyroAvailable = await Gyroscope.isAvailableAsync();
      if (!accelAvailable || !gyroAvailable) {
        setError('Sensor monitoring is not available on this device');
        setStatus('ERROR');
        return false;
      }

      Accelerometer.setUpdateInterval(120);
      Gyroscope.setUpdateInterval(120);

      if (accelSubscription.current) {
        accelSubscription.current.remove?.();
        accelSubscription.current = null;
      }
      if (gyroSubscription.current) {
        gyroSubscription.current.remove?.();
        gyroSubscription.current = null;
      }

      accelSubscription.current = Accelerometer.addListener((data: AccelerometerMeasurement) => {
        motionState.current.latestAccel = data;
        processMotion();
      });

      gyroSubscription.current = Gyroscope.addListener((data: GyroscopeMeasurement) => {
        motionState.current.latestGyro = data;
        processMotion();
      });

      setIsMonitoring(true);
      setStatus('ACTIVE');
      return true;
    } catch (err) {
      setError('Unable to start sensor monitoring');
      console.error('[useRoadHazardDetection] Start failed', err);
      setStatus('ERROR');
      return false;
    }
  }, [processMotion]);

  const stopMonitoring = useCallback(async () => {
    try {
      if (accelSubscription.current) {
        accelSubscription.current.remove();
        accelSubscription.current = null;
      }
      if (gyroSubscription.current) {
        gyroSubscription.current.remove();
        gyroSubscription.current = null;
      }
      setIsMonitoring(false);
      setStatus('IDLE');
      setHazardType('NONE');
      setConfidence(0);
      motionState.current.deltaBuffer = [];
      motionState.current.cooldown = false;
      motionState.current.pending = false;
      motionState.current.lastDetectionTime = 0;
    } catch (err) {
      console.error('[useRoadHazardDetection] Stop failed', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  const statusLabel = useMemo(() => {
    if (status === 'IDLE') return 'Paused';
    if (status === 'ACTIVE') return 'Monitoring';
    if (status === 'DETECTED') return `${HAZARD_LABELS[hazardType === 'POTHOLE' ? 2 : hazardType === 'SPEED_BREAKER' ? 1 : 0]}`;
    if (status === 'COOLDOWN') return 'Cooldown';
    if (status === 'ERROR') return 'Sensor error';
    return 'Ready';
  }, [hazardType, status]);

  return {
    isMonitoring,
    status,
    statusLabel,
    hazardType,
    confidence,
    detectionCount,
    lastDetectionAt,
    error,
    startMonitoring,
    stopMonitoring,
  };
};
