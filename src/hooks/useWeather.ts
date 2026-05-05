import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';
import { apiService } from '../services/api';

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  visibility: number;
  timestamp: string;
}

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { location } = useLocation();

  const fetchWeather = async () => {
    if (!location) return;

    try {
      setLoading(true);
      const response = await apiService.getWeather(location.latitude, location.longitude);

      if (response.success && response.data) {
        setWeather(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch weather data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location) {
      fetchWeather();
    }
  }, [location]);

  // Refresh weather every 15 minutes
  useEffect(() => {
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    weather,
    loading,
    error,
    fetchWeather,
  };
};