import { useState, useEffect } from 'react';
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

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
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
    if (!permissionGranted) {
      setError('Accelerometer permission not granted');
      return false;
    }

    try {
      setError(null);

      // Set update interval to 100ms for real-time monitoring
      Accelerometer.setUpdateInterval(100);

      const subscription = Accelerometer.addListener((data: AccelerometerMeasurement) => {
        setAccelerometerData({
          x: data.x,
          y: data.y,
          z: data.z,
        });
      });

      setIsMonitoring(true);

      // Store subscription for cleanup
      (global as any).__accelerometerSubscription = subscription;

      return true;
    } catch (err) {
      setError('Failed to start accelerometer monitoring');
      console.error('Accelerometer start error:', err);
      return false;
    }
  };

  const stopMonitoring = async (): Promise<void> => {
    try {
      const subscription = (global as any).__accelerometerSubscription;
      if (subscription) {
        subscription.remove();
        (global as any).__accelerometerSubscription = null;
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