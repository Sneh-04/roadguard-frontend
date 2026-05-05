import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { LocationObject } from 'expo-location';
import { Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number;
  speed?: number;
  city?: string;
  country?: string;
  address?: string;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mountedRef.current) setError('Location permission denied');
        if (mountedRef.current) setLoading(false);
        return false;
      }
      return true;
    } catch (err) {
      if (mountedRef.current) setError('Failed to request location permission');
      if (mountedRef.current) setLoading(false);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy, altitude, heading: locHeading, speed: locSpeed } = locationData.coords;

      // Reverse geocode to get city and country
      let city = '';
      let country = '';
      let address = '';
      try {
        // Skip reverse geocoding on web platform
        if (Platform.OS !== 'web') {
          const geocodeResult = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          if (geocodeResult.length > 0) {
            const addressData = geocodeResult[0];
            city = addressData.city || addressData.subregion || '';
            country = addressData.country || '';
            address = `${addressData.name || ''}, ${addressData.city || ''}, ${addressData.region || ''}`.replace(/^, |, $/g, '');
          }
        } else {
          // On web, use coordinate string as fallback
          address = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        // Fallback to coordinate string
        address = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      }

      const locationInfo: LocationData = {
        latitude,
        longitude,
        accuracy,
        altitude,
        heading: locHeading || undefined,
        speed: locSpeed || undefined,
        city,
        country,
        address,
      };

      setLocation(locationInfo);
      setSpeed(locSpeed || null);
      setHeading(locHeading || null);
      setError(null);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const startLocationUpdates = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (locationData: LocationObject) => {
          if (!mountedRef.current) return;
          const { latitude, longitude, accuracy, altitude, heading: locHeading, speed: locSpeed } = locationData.coords;

          setLocation(prev => ({
            ...prev!,
            latitude,
            longitude,
            accuracy,
            altitude,
            heading: locHeading || undefined,
            speed: locSpeed || undefined,
          }));

          setSpeed(locSpeed || null);
          setHeading(locHeading || null);
        }
      );

      // Store subscription for cleanup
      (global as any).__locationSubscription = subscription;
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to start location updates');
    }
  };

  useEffect(() => {
    const initializeLocation = async () => {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        await getCurrentLocation();
        await startLocationUpdates();
      }
    };

    initializeLocation();

    // Cleanup function to remove location watcher
    return () => {
      mountedRef.current = false;
      const subscription = (global as any).__locationSubscription;
      if (subscription) {
        subscription.remove();
        (global as any).__locationSubscription = null;
      }
    };
  }, []);

  return {
    location,
    speed,
    heading,
    loading,
    error,
    getCurrentLocation,
    requestLocationPermission,
  };
};