import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from './useLocation';
import { apiService } from '../services/api';
import { notificationService } from '../services/notificationService';

export interface Hazard {
  id: string;
  hazard_type: number; // 1: speed breaker, 2: pothole
  latitude: number;
  longitude: number;
  confidence: number;
  timestamp: string;
  distance?: number; // calculated distance from user
}

export const useHazards = () => {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { location } = useLocation();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchHazards = async () => {
    try {
      if (!mountedRef.current) return;
      setLoading(true);
      const response = await apiService.getHazards();

      if (response.success && response.data && mountedRef.current) {
        // Calculate distances from user location
        const hazardsWithDistance = response.data.map((hazard: Hazard) => ({
          ...hazard,
          distance: location ? calculateDistance(
            location.latitude,
            location.longitude,
            hazard.latitude,
            hazard.longitude
          ) : 0,
        }));

        // Sort by distance
        hazardsWithDistance.sort((a, b) => a.distance - b.distance);
        setHazards(hazardsWithDistance);
      }
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to fetch hazards');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const reportHazard = async (hazardData: {
    hazard_type: number;
    latitude: number;
    longitude: number;
    confidence: number;
  }) => {
    try {
      const response = await apiService.reportHazard(hazardData);
      if (response.success) {
        // Refresh hazards after reporting
        await fetchHazards();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to report hazard' };
    }
  };

  useEffect(() => {
    if (location) {
      fetchHazards();
    }
  }, [location?.latitude, location?.longitude]);

  // Refresh hazards every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchHazards, 30000);
    return () => clearInterval(interval);
  }, []);

  // Monitor for nearby hazards and send notifications
  useEffect(() => {
    if (!hazards.length || !location) return;

    const checkForNearbyHazards = async () => {
      if (!mountedRef.current) return;
      const nearbyHazards = hazards.filter(hazard =>
        hazard.distance && hazard.distance < 2 && hazard.confidence > 0.7
      );

      for (const hazard of nearbyHazards) {
        if (!mountedRef.current) return;
        // Check if we already notified about this hazard recently
        const notifiedKey = `hazard_notified_${hazard.id}`;
        const lastNotified = await AsyncStorage.getItem(notifiedKey);

        if (!lastNotified || Date.now() - parseInt(lastNotified) > 5 * 60 * 1000) { // 5 minutes
          await notificationService.sendHazardAlert({
            hazardId: hazard.id,
            hazardType: hazard.hazard_type,
            latitude: hazard.latitude,
            longitude: hazard.longitude,
            confidence: hazard.confidence,
            distance: hazard.distance || 0,
          });

          // Mark as notified
          await AsyncStorage.setItem(notifiedKey, Date.now().toString());
        }
      }
    };

    checkForNearbyHazards();
  }, [hazards, location]);

  return {
    hazards,
    loading,
    error,
    fetchHazards,
    reportHazard,
  };
};

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};