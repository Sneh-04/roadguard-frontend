import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';

interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

export const useAccelerometer = () => {
  const [accelerometerData, setAccelerometerData] = useState<AccelerometerData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'web') {
        setError('Accelerometer sensor is not available on web');
        return;
      }

      try {
        // Note: Accelerometer doesn't require explicit permissions in most cases
        // but we check if the sensor is available
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (!isAvailable) {
          setError('Accelerometer sensor is not available on this device');
          return;
        }
        setPermissionGranted(true);
      } catch (err) {
        setError('Failed to access accelerometer sensor');
        console.error('Accelerometer permission error:', err);
      }
    };

    requestPermissions();
  }, []);

  const startMonitoring = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setError('Accelerometer monitoring is not available on web');
      return false;
    }

    if (!permissionGranted) {
      setError('Accelerometer permission not granted');
      return false;
    }

    try {
      setError(null);

      // Set update interval to 120ms to balance responsiveness and battery use
      Accelerometer.setUpdateInterval(120);

      if (subscriptionRef.current) {
        subscriptionRef.current.remove?.();
        subscriptionRef.current = null;
      }

      const subscription = Accelerometer.addListener((data: AccelerometerMeasurement) => {
        setAccelerometerData({
          x: data.x,
          y: data.y,
          z: data.z,
        });
      });

      subscriptionRef.current = subscription;
      setIsMonitoring(true);

      return true;
    } catch (err) {
      setError('Failed to start accelerometer monitoring');
      console.error('Accelerometer start error:', err);
      return false;
    }
  };

  const stopMonitoring = async (): Promise<void> => {
    try {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove?.();
        subscriptionRef.current = null;
      }

      setIsMonitoring(false);
      setAccelerometerData(null);
      setError(null);
    } catch (err) {
      console.error('Accelerometer stop error:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  return {
    accelerometerData,
    isMonitoring,
    permissionGranted,
    error,
    startMonitoring,
    stopMonitoring,
  };
};