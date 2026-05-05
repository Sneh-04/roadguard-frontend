import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface OfflineQueueItem {
  id: string;
  type: 'hazard_report' | 'user_update' | 'profile_update';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface CachedData {
  hazards: any[];
  weather: any;
  userProfile: any;
  lastSync: number;
}

class OfflineService {
  private static instance: OfflineService;
  public isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private queue: OfflineQueueItem[] = [];
  private cache: CachedData = {
    hazards: [],
    weather: null,
    userProfile: null,
    lastSync: 0,
  };

  private constructor() {
    this.initialize();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private async initialize() {
    // Load cached data
    await this.loadCache();

    // Load offline queue
    await this.loadQueue();

    // Monitor network status
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (this.isOnline && wasOffline) {
        // Came back online, sync data
        this.syncData();
      }
    });

    // Get initial network status
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;
  }

  // Cache management
  private async loadCache() {
    try {
      const cachedData = await AsyncStorage.getItem('offline_cache');
      if (cachedData) {
        this.cache = { ...this.cache, ...JSON.parse(cachedData) };
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  private async saveCache() {
    try {
      await AsyncStorage.setItem('offline_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  // Queue management
  private async loadQueue() {
    try {
      const queueData = await AsyncStorage.getItem('offline_queue');
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }

  // Public methods
  isConnected(): boolean {
    return this.isOnline;
  }

  async getCachedHazards(): Promise<any[]> {
    if (this.isOnline && Date.now() - this.cache.lastSync > 5 * 60 * 1000) { // 5 minutes
      // Refresh cache if online and stale
      try {
        const { apiService } = require('./api');
        const response = await apiService.getHazards();
        if (response.success && response.data) {
          this.cache.hazards = response.data;
          this.cache.lastSync = Date.now();
          await this.saveCache();
        }
      } catch (error) {
        console.error('Failed to refresh hazards cache:', error);
      }
    }
    return this.cache.hazards;
  }

  async cacheHazardData(hazards: any[]): Promise<void> {
    this.cache.hazards = hazards;
    this.cache.lastSync = Date.now();
    await this.saveCache();
  }

  async getCachedProfile(): Promise<any | null> {
    if (this.isOnline && Date.now() - this.cache.lastSync > 15 * 60 * 1000) { // 15 minutes
      try {
        const { apiService } = require('./api');
        const response = await apiService.getProfile();
        if (response.success && response.data) {
          this.cache.userProfile = response.data;
          this.cache.lastSync = Date.now();
          await this.saveCache();
        }
      } catch (error) {
        console.error('Failed to refresh profile cache:', error);
      }
    }
    return this.cache.userProfile;
  }

  async cacheProfileData(profileData: any): Promise<void> {
    this.cache.userProfile = profileData;
    this.cache.lastSync = Date.now();
    await this.saveCache();
  }

  async getCachedWeather(latitude: number, longitude: number): Promise<any | null> {
    if (this.isOnline && Date.now() - this.cache.lastSync > 30 * 60 * 1000) { // 30 minutes for weather
      try {
        const { apiService } = require('./api');
        const response = await apiService.getWeather(latitude, longitude);
        if (response.success && response.data) {
          this.cache.weather = response.data;
          this.cache.lastSync = Date.now();
          await this.saveCache();
        }
      } catch (error) {
        console.error('Failed to refresh weather cache:', error);
      }
    }
    return this.cache.weather;
  }

  async cacheWeatherData(latitude: number, longitude: number, weatherData: any): Promise<void> {
    this.cache.weather = weatherData;
    this.cache.lastSync = Date.now();
    await this.saveCache();
  }

  async queueHazardReport(hazardData: {
    hazard_type: number;
    latitude: number;
    longitude: number;
    confidence: number;
  }): Promise<boolean> {
    const queueItem: OfflineQueueItem = {
      id: `hazard_${Date.now()}_${Math.random()}`,
      type: 'hazard_report',
      data: hazardData,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queueItem);
    await this.saveQueue();

    if (this.isOnline) {
      return await this.processQueueItem(queueItem);
    }

    return false; // Queued for later
  }

  async queueProfileUpdate(profileData: any): Promise<boolean> {
    const queueItem: OfflineQueueItem = {
      id: `profile_${Date.now()}_${Math.random()}`,
      type: 'profile_update',
      data: profileData,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queueItem);
    await this.saveQueue();

    if (this.isOnline) {
      return await this.processQueueItem(queueItem);
    }

    return false; // Queued for later
  }

  private async processQueueItem(item: OfflineQueueItem): Promise<boolean> {
    try {
      let success = false;
      const { apiService } = require('./api');

      switch (item.type) {
        case 'hazard_report':
          const hazardResponse = await apiService.reportHazard(item.data);
          success = hazardResponse.success;
          break;

        case 'profile_update':
          const profileResponse = await apiService.updateProfile(item.data);
          success = profileResponse.success;
          break;

        case 'user_update':
          // Handle user updates if needed
          success = true;
          break;
      }

      if (success) {
        // Remove from queue
        this.queue = this.queue.filter(q => q.id !== item.id);
        await this.saveQueue();
        return true;
      } else {
        // Increment retry count
        item.retryCount++;
        if (item.retryCount >= 3) {
          // Remove after 3 failed attempts
          this.queue = this.queue.filter(q => q.id !== item.id);
          await this.saveQueue();
        } else {
          await this.saveQueue();
        }
        return false;
      }
    } catch (error) {
      console.error('Failed to process queue item:', error);
      item.retryCount++;
      if (item.retryCount >= 3) {
        this.queue = this.queue.filter(q => q.id !== item.id);
        await this.saveQueue();
      } else {
        await this.saveQueue();
      }
      return false;
    }
  }

  async syncData(): Promise<{ success: boolean; syncedItems: number }> {
    if (this.syncInProgress || !this.isOnline) {
      return { success: false, syncedItems: 0 };
    }

    this.syncInProgress = true;
    let syncedItems = 0;

    try {
      // Process queue
      const queueCopy = [...this.queue];
      for (const item of queueCopy) {
        if (await this.processQueueItem(item)) {
          syncedItems++;
        }
      }

      // Refresh cache
      await this.loadCache(); // This will trigger API calls if needed

      return { success: true, syncedItems };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, syncedItems };
    } finally {
      this.syncInProgress = false;
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getPendingItems(): OfflineQueueItem[] {
    return this.queue;
  }

  async clearCache() {
    this.cache = {
      hazards: [],
      weather: null,
      userProfile: null,
      lastSync: 0,
    };
    await this.saveCache();
  }

  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
  }

  // Conflict Resolution Methods
  async resolveHazardConflict(localHazard: any, serverHazard: any): Promise<any> {
    // Conflict resolution strategy: server wins, but preserve local confidence if higher
    const resolved = { ...serverHazard };

    // If local hazard has higher confidence, keep it
    if (localHazard.confidence > serverHazard.confidence) {
      resolved.confidence = localHazard.confidence;
    }

    // If local hazard is more recent, keep local timestamp
    if (new Date(localHazard.timestamp) > new Date(serverHazard.timestamp)) {
      resolved.timestamp = localHazard.timestamp;
    }

    return resolved;
  }

  async mergeHazardLists(localHazards: any[], serverHazards: any[]): Promise<any[]> {
    const merged = new Map();

    // Add server hazards first
    serverHazards.forEach(hazard => {
      merged.set(hazard.id, hazard);
    });

    // Merge local hazards, resolving conflicts
    for (const localHazard of localHazards) {
      const serverHazard = merged.get(localHazard.id);

      if (serverHazard) {
        // Conflict: resolve it
        const resolved = await this.resolveHazardConflict(localHazard, serverHazard);
        merged.set(localHazard.id, resolved);
      } else {
        // No conflict: add local hazard
        merged.set(localHazard.id, localHazard);
      }
    }

    return Array.from(merged.values());
  }

  async resolveProfileConflict(localProfile: any, serverProfile: any): Promise<any> {
    // Profile conflict resolution: merge fields, server wins on conflicts
    const resolved = { ...serverProfile };

    // Keep local changes if server field is empty
    Object.keys(localProfile).forEach(key => {
      if (!resolved[key] && localProfile[key]) {
        resolved[key] = localProfile[key];
      }
    });

    // Always keep the most recent update
    const localUpdate = localProfile.updatedAt || localProfile.lastLogin;
    const serverUpdate = serverProfile.updatedAt || serverProfile.lastLogin;

    if (localUpdate && serverUpdate) {
      resolved.lastSync = new Date(Math.max(
        new Date(localUpdate).getTime(),
        new Date(serverUpdate).getTime()
      )).toISOString();
    }

    return resolved;
  }

  async handleSyncConflicts(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const { apiService } = require('./api');
      // Get fresh data from server
      const [hazardsResponse, profileResponse] = await Promise.allSettled([
        apiService.getHazards(),
        apiService.getProfile(),
      ]);

      // Handle hazards conflicts
      if (hazardsResponse.status === 'fulfilled' && hazardsResponse.value.success) {
        const serverHazards = hazardsResponse.value.data || [];
        const mergedHazards = await this.mergeHazardLists(this.cache.hazards, serverHazards);
        this.cache.hazards = mergedHazards;
      }

      // Handle profile conflicts
      if (profileResponse.status === 'fulfilled' && profileResponse.value.success) {
        const serverProfile = profileResponse.value.data;
        if (this.cache.userProfile) {
          const resolvedProfile = await this.resolveProfileConflict(this.cache.userProfile, serverProfile);
          this.cache.userProfile = resolvedProfile;
        } else {
          this.cache.userProfile = serverProfile;
        }
      }

      // Save merged data
      await this.saveCache();
      this.cache.lastSync = Date.now();

    } catch (error) {
      console.error('Failed to handle sync conflicts:', error);
    }
  }

  // Data validation methods
  validateHazardData(hazard: any): boolean {
    return (
      hazard &&
      typeof hazard.id === 'string' &&
      typeof hazard.latitude === 'number' &&
      typeof hazard.longitude === 'number' &&
      typeof hazard.hazard_type === 'number' &&
      hazard.hazard_type >= 1 && hazard.hazard_type <= 2 &&
      typeof hazard.confidence === 'number' &&
      hazard.confidence >= 0 && hazard.confidence <= 1
    );
  }

  validateProfileData(profile: any): boolean {
    return (
      profile &&
      typeof profile.id === 'number' &&
      typeof profile.email === 'string' &&
      typeof profile.username === 'string'
    );
  }

  // Data deduplication
  deduplicateHazards(hazards: any[]): any[] {
    const seen = new Set();
    return hazards.filter(hazard => {
      const key = `${hazard.latitude.toFixed(4)}_${hazard.longitude.toFixed(4)}_${hazard.hazard_type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

export const offlineService = OfflineService.getInstance();