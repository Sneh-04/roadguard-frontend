import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocation } from './useLocation';
import { apiService } from '../services/api';
import { notificationService } from '../services/notificationService';
import { realtimeService } from '../services/realtimeService';

export interface Hazard {
  id: string;
  hazard_type: number; // 1: speed breaker, 2: pothole
  latitude: number;
  longitude: number;
  confidence: number;
  timestamp: string;
  image_url?: string;
  status?: string;
  description?: string;
  distance?: number; // calculated distance from user
}

export const useHazards = () => {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { location } = useLocation();
  const mountedRef = useRef(true);
  const fetchRef = useRef<() => Promise<void>>();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      realtimeService.disconnect();
    };
  }, []);

  const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

  const calculateDistance = useCallback((hazard: Hazard) => {
    if (!location) return 0;
    const R = 6371;
    const dLat = toRadians(hazard.latitude - location.latitude);
    const dLon = toRadians(hazard.longitude - location.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(location.latitude)) * Math.cos(toRadians(hazard.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, [location]);

  const normalizeHazards = useCallback((rawHazards: any[]): Hazard[] => {
    const hazardsWithDistance = rawHazards.map((hazard: any) => {
      const normalized: Hazard = {
        id: hazard.id?.toString() || `${hazard.latitude}-${hazard.longitude}-${hazard.timestamp}`,
        hazard_type: hazard.hazard_type ?? hazard.type ?? 0,
        latitude: hazard.latitude,
        longitude: hazard.longitude,
        confidence: hazard.confidence ?? 0,
        timestamp: hazard.timestamp || hazard.created_at || new Date().toISOString(),
        image_url: hazard.image_url || hazard.image || hazard.photo_url,
        status: hazard.status || 'active',
        description: hazard.description || hazard.type || '',
      };
      return {
        ...normalized,
        distance: calculateDistance(normalized),
      };
    });

    hazardsWithDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    return hazardsWithDistance;
  }, [calculateDistance]);

  const fetchHazards = useCallback(async () => {
    try {
      if (!mountedRef.current) return;
      setLoading(true);
      const response = await apiService.getHazards();
      if (response.success && Array.isArray(response.data) && mountedRef.current) {
        setHazards(normalizeHazards(response.data));
      }
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to fetch hazards');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [normalizeHazards]);

  fetchRef.current = fetchHazards;

  const reportHazard = useCallback(async (hazardData: any) => {
    try {
      const response = await apiService.reportHazard(hazardData);
      if (response.success) {
        await fetchHazards();
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to report hazard' };
    }
  }, [fetchHazards]);

  useEffect(() => {
    const handleRealtime = async () => {
      if (fetchRef.current) await fetchRef.current();
    };

    realtimeService.connect();
    const unsubscribe = realtimeService.subscribe(({ type }) => {
      if (type.startsWith('hazard')) {
        handleRealtime();
      }
    });

    const interval = setInterval(fetchHazards, 30000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [fetchHazards]);

  useEffect(() => {
    if (location) {
      fetchHazards();
    }
  }, [location?.latitude, location?.longitude, fetchHazards]);

  useEffect(() => {
    if (!hazards.length || !location) return;

    const checkForNearbyHazards = async () => {
      if (!mountedRef.current) return;
      const nearbyHazards = hazards.filter(hazard =>
        hazard.distance != null && hazard.distance < 2 && hazard.confidence > 0.7
      );

      for (const hazard of nearbyHazards) {
        if (!mountedRef.current) return;
        const notifiedKey = `hazard_notified_${hazard.id}`;
        const lastNotified = await AsyncStorage.getItem(notifiedKey);

        if (!lastNotified || Date.now() - parseInt(lastNotified, 10) > 5 * 60 * 1000) {
          await notificationService.sendHazardAlert({
            hazardId: hazard.id,
            hazardType: hazard.hazard_type,
            latitude: hazard.latitude,
            longitude: hazard.longitude,
            confidence: hazard.confidence,
            distance: hazard.distance || 0,
          });
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
