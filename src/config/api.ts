// API Configuration
// Use environment variable for backend URL, with remote backend as the default
// Override with EXPO_PUBLIC_BACKEND_URL for local development if needed
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://roadguard-backend-ympg.onrender.com';
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
    LIST: '/events',
    REPORT: '/hazard-reports',
    HISTORY: '/events',
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
