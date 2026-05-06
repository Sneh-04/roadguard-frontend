// API Configuration
// Use environment variable for backend URL, with Android emulator / local LAN host as default
// Emulator: http://10.0.2.2:8000
// Real phone: http://192.168.x.x:8000
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:8000';
export const API_BASE_URL = `${BACKEND_URL}/api`;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/signup',
    PROFILE: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  HAZARDS: {
    LIST: '/reports',
    REPORT: '/report',
    HISTORY: '/reports',
  },
  PREDICT: '/predict',
  WEATHER: '/weather',
  CHAT: '/chat',
  ADMIN: {
    USERS: '/admin/users',
    STATS: '/admin/stats',
    REPORTS: '/reports',
  },
};

export const API_TIMEOUT = 10000;

export const API_RETRY = {
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
};
