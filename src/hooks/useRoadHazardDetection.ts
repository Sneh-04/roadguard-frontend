import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Accelerometer, Gyroscope, AccelerometerMeasurement, GyroscopeMeasurement } from 'expo-sensors';
import { apiService } from '../services/api';
import { useLocation } from './useLocation';
import { HAZARD_LABELS } from '../utils/constants';

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
    lowPassAccel: 1,
    lowPassGyro: 1,
    deltaBuffer: [] as number[],
    lastDetectionTime: 0,
    cooldown: false,
    pending: false,
  });

  const SPEED_GATE_KMH = 8;
  const LOW_PASS_ALPHA = 0.12;
  const SMOOTHING_WINDOW = 8;
  const COOLDOWN_MS = 5000;
  const MAX_CONFIDENCE = 0.97;

  const calculateMagnitude = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

  const classifyHazard = (delta: number, rotation: number) => {
    if (delta >= 3.2 && rotation > 0.12) return 'POTHOLE';
    if (delta >= 2.0 && delta < 3.2 && rotation > 0.08) return 'SPEED_BREAKER';
    return 'NONE';
  };

  const buildConfidence = (delta: number) => {
    const normalized = Math.min(1, Math.max(0, (delta - 1.8) / 2.5));
    return Math.min(MAX_CONFIDENCE, normalized + 0.15);
  };

  const sendDetection = useCallback(async (type: HazardClassification, delta: number) => {
    if (!location) return;
    const payload = {
      type,
      hazard_type: type === 'POTHOLE' ? 2 : type === 'SPEED_BREAKER' ? 1 : 0,
      latitude: location.latitude,
      longitude: location.longitude,
      confidence: buildConfidence(delta),
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
    const { latestAccel, latestGyro } = motion;
    const accelMagnitude = calculateMagnitude(latestAccel.x, latestAccel.y, latestAccel.z);
    const gyroMagnitude = calculateMagnitude(latestGyro.x, latestGyro.y, latestGyro.z);

    motion.lowPassAccel = LOW_PASS_ALPHA * accelMagnitude + (1 - LOW_PASS_ALPHA) * motion.lowPassAccel;
    motion.lowPassGyro = LOW_PASS_ALPHA * gyroMagnitude + (1 - LOW_PASS_ALPHA) * motion.lowPassGyro;

    const accelDelta = Math.abs(accelMagnitude - motion.lowPassAccel);
    const gyroDelta = Math.abs(gyroMagnitude - motion.lowPassGyro);
    const combinedDelta = accelDelta + gyroDelta * 0.5;

    motion.deltaBuffer.push(combinedDelta);
    if (motion.deltaBuffer.length > SMOOTHING_WINDOW) motion.deltaBuffer.shift();

    const smoothDelta = motion.deltaBuffer.reduce((sum, value) => sum + value, 0) / motion.deltaBuffer.length;
    const speedKmh = speed != null ? speed * 3.6 : 0;
    const isDriving = speedKmh >= SPEED_GATE_KMH;
    const inCooldown = motion.cooldown && now - motion.lastDetectionTime < COOLDOWN_MS;

    if (!isDriving || inCooldown) {
      if (!isDriving && status !== 'IDLE') setStatus('IDLE');
      return;
    }

    const classification = classifyHazard(smoothDelta, gyroDelta);
    if (classification !== 'NONE' && !motion.pending) {
      motion.pending = true;
      motion.lastDetectionTime = now;
      motion.cooldown = true;
      setHazardType(classification);
      setConfidence(buildConfidence(smoothDelta));
      setStatus('DETECTED');
      setDetectionCount(prev => prev + 1);
      setLastDetectionAt(new Date(now).toISOString());
      sendDetection(classification, smoothDelta);

      setTimeout(() => {
        motion.pending = false;
        if (status !== 'ERROR') setStatus('ACTIVE');
      }, 1200);

      setTimeout(() => {
        motion.cooldown = false;
        if (status !== 'ERROR') setStatus('ACTIVE');
      }, COOLDOWN_MS);
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
