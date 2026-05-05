export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://roadguard-ai-3.onrender.com';

export const OPENWEATHER_API_KEY =
  process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '';

export const HAZARD_COLORS: Record<number, string> = {
  0: '#3B82F6',
  1: '#F59E0B',
  2: '#EF4444',
};

export const HAZARD_LABELS: Record<number, string> = {
  0: 'Normal',
  1: 'Speed Breaker',
  2: 'Pothole',
};

export const HAZARD_EMOJIS: Record<number, string> = {
  0: '✅',
  1: '⚠️',
  2: '🔴',
};

export const MAP_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

// Sensor hyperparameters (match backend config)
export const SPIKE_THRESHOLD_K = 2.5;
export const WINDOW_SIZE = 10;
export const SEGMENT_LENGTH = 100;
export const SAMPLING_FREQ = 50;   // Hz
export const FUSION_ALPHA = 0.6;
export const ALERT_RADIUS_KM = 2;
export const DEDUP_RADIUS_M = 50;
export const DEDUP_WINDOW_SEC = 60;
