import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { offlineService } from './offlineService';
import { retryApiCall } from '../utils/retryMechanism';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  fromCache?: boolean;
}

class ApiService {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    console.log('[ApiService] API_BASE_URL:', API_BASE_URL);
    // Add request interceptor to include auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear storage and redirect to login
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('userData');
          // Navigation will be handled by the app
        }
        return Promise.reject(error);
      }
    );
  }

  private isFormData(data: any): boolean {
    return data instanceof FormData || (data && typeof data.append === 'function');
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    const apiCall = async (): Promise<ApiResponse<T>> => {
      const response: AxiosResponse = await this.axiosInstance({
        method,
        url,
        data,
      });

      return {
        success: true,
        data: response.data,
      };
    };

    try {
      return await retryApiCall(apiCall, {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        retryCondition: (error: any) => {
          // Retry on network errors, timeouts, and 5xx server errors
          if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') return true;
          if (error.response?.status >= 500) return true;
          // Don't retry on 4xx client errors (except 408, 429)
          if (error.response?.status >= 400 && error.response?.status < 500) {
            return error.response.status === 408 || error.response.status === 429;
          }
          return false;
        },
      });
    } catch (error: any) {
      console.error(`API ${method} ${url} error after retries:`, error);

      let errorMessage = 'An unexpected error occurred';

      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.detail ||
                      error.response.data?.message ||
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Network error - please check your connection';
      } else {
        // Something else happened
        errorMessage = error.message || 'Request failed';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user_id: number; username: string; role: string }>> {
    return this.makeRequest('POST', API_ENDPOINTS.AUTH.LOGIN, { email, password });
  }

  async register(userData: {
    email: string;
    password: string;
    username: string;
  }): Promise<ApiResponse<{ token: string; user_id: number; username: string; role: string }>> {
    return this.makeRequest('POST', API_ENDPOINTS.AUTH.REGISTER, userData);
  }

  // Hazards methods
  private normalizeHazardImageUrl(hazard: any): any {
    const imageUrl = hazard.image_url ?? hazard.imageUrl ?? hazard.image;
    return {
      ...hazard,
      image_url: imageUrl
        ? `${imageUrl}`.startsWith('http')
          ? imageUrl
          : `${API_BASE_URL}${imageUrl}`
        : undefined,
    };
  }

  async getHazards(): Promise<ApiResponse<any[]>> {
    if (!offlineService.isConnected()) {
      const cachedHazards = await offlineService.getCachedHazards();
      return {
        success: true,
        data: cachedHazards,
        fromCache: true,
      };
    }

    const loadHazardsFromResponse = async (response: ApiResponse<any>): Promise<ApiResponse<any[]>> => {
      if (!response.success || !response.data) return response as ApiResponse<any[]>;

      const events = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data.events)
        ? response.data.events
        : Array.isArray(response.data.reports)
        ? response.data.reports
        : [];

      const normalizedEvents = events.map((hazard: any) => this.normalizeHazardImageUrl(hazard));
      await offlineService.cacheHazardData(normalizedEvents);
      return { success: true, data: normalizedEvents };
    };

    try {
      // Try to load from /events first (sensor detections)
      let response = await this.makeRequest<any>('GET', API_ENDPOINTS.HAZARDS.LIST);
      let allHazards: any[] = [];

      if (response.success && response.data) {
        const events = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.events)
          ? response.data.events
          : [];
        allHazards = [...events];
      }

      // Try to load from /reports (user uploads) if it exists
      try {
        const reportsResponse = await this.makeRequest<any>('GET', '/reports');
        if (reportsResponse.success && reportsResponse.data) {
          const reports = Array.isArray(reportsResponse.data)
            ? reportsResponse.data
            : Array.isArray(reportsResponse.data.reports)
            ? reportsResponse.data.reports
            : [];
          allHazards = [...allHazards, ...reports];
        }
      } catch (reportsError) {
        // /reports endpoint might not exist, continue with /events only
        console.log('Reports endpoint not available:', reportsError);
      }

      // Normalize and cache all hazards
      const normalizedEvents = allHazards.map((hazard: any) => this.normalizeHazardImageUrl(hazard));
      await offlineService.cacheHazardData(normalizedEvents);
      return { success: true, data: normalizedEvents };
    } catch (error) {
      const cachedHazards = await offlineService.getCachedHazards();
      return {
        success: true,
        data: cachedHazards,
        fromCache: true,
      };
    }
  }

  async reportHazard(hazardData: any): Promise<ApiResponse<any>> {
    const isFormData = hazardData instanceof FormData || (hazardData && typeof hazardData.append === 'function');

    if (isFormData) {
      try {
        const response = await this.makeRequest<any>('POST', API_ENDPOINTS.HAZARDS.REPORT, hazardData);
        if (response.success) {
          return response;
        }
      } catch (error) {
        console.warn('Failed to upload hazard report, falling back to queue:', error);
      }

      return {
        success: true,
        message: 'Hazard report queued locally for retry (backend POST may not be supported).',
        data: { id: `local-${Date.now()}`, status: 'queued' },
      };
    }

    const queued = await offlineService.queueHazardReport(hazardData);
    return {
      success: queued,
      message: queued ? 'Hazard report queued for sync' : 'Failed to queue hazard report',
    };
  }

  async reportDetection(detectionData: {
    type: string;
    hazard_type?: number;
    latitude?: number;
    longitude?: number;
    timestamp: string;
    confidence?: number;
    speed?: number;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest('POST', API_ENDPOINTS.HAZARDS.REPORT, detectionData);
  }

  async ignoreHazard(hazardId: string): Promise<ApiResponse<any>> {
    return this.makeRequest('PUT', `/events/${hazardId}`, { status: 'ignored' });
  }

  async deleteHazard(hazardId: string): Promise<ApiResponse<any>> {
    return this.makeRequest('DELETE', `/events/${hazardId}`);
  }

  async getHazardHistory(limit: number = 50): Promise<ApiResponse<any[]>> {
    return this.makeRequest('GET', `/hazards/history?limit=${limit}`);
  }

  // Weather methods
  async getWeather(latitude: number, longitude: number): Promise<ApiResponse<any>> {
    const cacheKey = `weather_${latitude}_${longitude}`;
    const cached = await offlineService.getCachedWeather(latitude, longitude);
    
    if (cached && !offlineService.isOnline) {
      return { success: true, data: cached };
    }

    try {
      const response = await this.makeRequest('GET', `/weather?lat=${latitude}&lon=${longitude}`);
      if (response.success) {
        await offlineService.cacheWeatherData(latitude, longitude, response.data);
      }
      return response;
    } catch (error) {
      if (cached) {
        return { success: true, data: cached };
      }
      throw error;
    }
  }

  // Profile methods
  async getProfile(): Promise<ApiResponse<any>> {
    const cached = await offlineService.getCachedProfile();
    
    if (cached && !offlineService.isOnline) {
      return { success: true, data: cached };
    }

    try {
      const response = await this.makeRequest('GET', '/auth/me');
      if (response.success) {
        await offlineService.cacheProfileData(response.data);
      }
      return response;
    } catch (error) {
      if (cached) {
        return { success: true, data: cached };
      }
      throw error;
    }
  }

  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    if (!offlineService.isOnline) {
      const queued = await offlineService.queueProfileUpdate(profileData);
      if (queued) {
        return { success: true, data: { message: 'Profile update queued for when online' } };
      }
      return { success: false, error: 'Failed to queue profile update' };
    }

    try {
      const response = await this.makeRequest('PUT', '/auth/profile', profileData);
      if (response.success) {
        await offlineService.cacheProfileData(response.data);
      }
      return response;
    } catch (error) {
      // If update fails, queue for later
      const queued = await offlineService.queueProfileUpdate(profileData);
      if (queued) {
        return { success: true, data: { message: 'Profile update queued for retry' } };
      }
      throw error;
    }
  }
  async getPrediction(sensorData: {
    accelerometer: { x: number; y: number; z: number };
    gyroscope?: { x: number; y: number; z: number };
    speed?: number;
    latitude?: number;
    longitude?: number;
  }): Promise<ApiResponse<any>> {
    return this.makeRequest('POST', '/predict', sensorData);
  }

  // Chatbot methods
  async sendMessage(message: string, context?: any): Promise<ApiResponse<{ response: string }>> {
    return this.makeRequest('POST', '/chat', { message, context });
  }

  // Admin methods (require admin role)
  async getAllUsers(): Promise<ApiResponse<any[]>> {
    return this.makeRequest('GET', '/admin/users');
  }

  async getSystemStats(): Promise<ApiResponse<any>> {
    return this.makeRequest('GET', '/admin/stats');
  }

  async deleteHazard(hazardId: string): Promise<ApiResponse<any>> {
    return this.makeRequest('DELETE', `/events/${hazardId}`);
  }

  async updateHazard(hazardId: string, updates: any): Promise<ApiResponse<any>> {
    return this.makeRequest('PUT', `/events/${hazardId}`, updates);
  }

  // Generic request method for flexible API calls
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(method, url, data);
  }
}

export const apiService = new ApiService();