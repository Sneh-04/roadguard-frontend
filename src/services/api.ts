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
  async getHazards(): Promise<ApiResponse<any[]>> {
    if (!offlineService.isConnected()) {
      // Return cached data when offline
      const cachedHazards = await offlineService.getCachedHazards();
      return {
        success: true,
        data: cachedHazards,
        fromCache: true,
      };
    }

    try {
      const response = await this.makeRequest<any[]>('GET', '/events');
      if (response.success && response.data) {
        // Update cache
        await offlineService.getCachedHazards(); // This will refresh cache
      }
      return response;
    } catch (error) {
      // Fallback to cache on network error
      const cachedHazards = await offlineService.getCachedHazards();
      return {
        success: true,
        data: cachedHazards,
        fromCache: true,
      };
    }
  }

  async reportHazard(hazardData: {
    hazard_type: number;
    latitude: number;
    longitude: number;
    confidence: number;
  }): Promise<ApiResponse<any>> {
    if (!offlineService.isConnected()) {
      // Queue for later when offline
      const queued = await offlineService.queueHazardReport(hazardData);
      return {
        success: queued,
        message: queued ? 'Hazard report queued for sync' : 'Failed to queue hazard report',
      };
    }

    return this.makeRequest('POST', '/hazards/report', hazardData);
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