import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import database from '../services/database';
import syncService from '../services/syncService';
import locationService from '../services/locationService';
import networkService from '../services/networkService';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [complaints, setComplaints] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStats, setSyncStats] = useState({
    total: 0,
    pending: 0,
    synced: 0,
  });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize app
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database
        await database.init();
        console.log('Database initialized');

        // Request location permissions
        await locationService.requestPermissions();
        console.log('Location permissions requested');

        // Get initial location
        try {
          const location = await locationService.getCurrentLocation();
          setCurrentLocation(location);
        } catch (error) {
          console.warn('Could not get initial location:', error);
        }

        // Start watching location
        locationService.subscribe((location) => {
          setCurrentLocation(location);
        });

        locationService.watchLocation((location) => {
          setCurrentLocation(location);
        });

        // Initialize network monitoring
        networkService.initNetworkMonitoring();

        // Load backend API configuration
        const apiBaseUrl = await AsyncStorage.getItem('API_BASE_URL');
        if (apiBaseUrl) {
          syncService.setApiBaseUrl(apiBaseUrl);
        }

        // Get initial network state
        const netState = await networkService.getNetworkState();
        setIsOnline(netState.isOnline);
        syncService.setOnlineStatus(netState.isOnline);

        // Subscribe to network changes
        networkService.onNetworkStateChange((state) => {
          setIsOnline(state.isOnline);
          syncService.setOnlineStatus(state.isOnline);

          // If came online, trigger sync
          if (state.isOnline && !state.wasOnline) {
            console.log('Network came online, triggering sync');
            triggerSync();
          }
        });

        // Load initial complaints
        await loadComplaints();

        // Start periodic sync
        syncService.startPeriodicSync(30000); // 30 seconds

        setIsInitialized(true);
        console.log('App initialization complete');
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initializeApp();

    return () => {
      locationService.stopWatchingLocation();
      networkService.stopMonitoring();
      syncService.stopPeriodicSync();
    };
  }, []);

  /**
   * Load complaints from database
   */
  const loadComplaints = useCallback(async () => {
    try {
      const allComplaints = await database.getAllComplaints();
      setComplaints(allComplaints);

      // Update sync stats
      const stats = await syncService.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('Error loading complaints:', error);
    }
  }, []);

  /**
   * Add new complaint
   */
  const addComplaint = useCallback(async (complaintData) => {
    try {
      const id = uuidv4();
      const timestamp = new Date().toISOString();

      const complaint = {
        id,
        ...complaintData,
        timestamp,
      };

      // Store in database
      const stored = await database.insertComplaint(complaint);
      console.log('Complaint stored:', id);

      // Reload complaints
      await loadComplaints();

      // Trigger sync if online
      if (isOnline) {
        triggerSync();
      }

      return stored;
    } catch (error) {
      console.error('Error adding complaint:', error);
      throw error;
    }
  }, [isOnline, loadComplaints]);

  /**
   * Update complaint status
   */
  const updateComplaintStatus = useCallback(async (id, status) => {
    try {
      await database.updateComplaintStatus(id, status);
      await loadComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      throw error;
    }
  }, [loadComplaints]);

  /**
   * Delete complaint
   */
  const deleteComplaint = useCallback(async (id) => {
    try {
      await database.deleteComplaint(id);
      await loadComplaints();
    } catch (error) {
      console.error('Error deleting complaint:', error);
      throw error;
    }
  }, [loadComplaints]);

  /**
   * Trigger sync
   */
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      console.log('Cannot sync - offline');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await syncService.syncPendingComplaints();
      
      if (result.success) {
        await loadComplaints();
        setLastSyncTime(new Date());
        console.log('Sync completed successfully');
      } else {
        setSyncError(result.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, loadComplaints]);

  /**
   * Force sync now
   */
  const forceSyncNow = useCallback(async () => {
    return triggerSync();
  }, [triggerSync]);

  /**
   * Retry failed syncs
   */
  const retryFailedSyncs = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);

      const result = await syncService.retryFailedSyncs();
      await loadComplaints();
      setLastSyncTime(new Date());

      return result;
    } catch (error) {
      console.error('Error retrying syncs:', error);
      setSyncError(error.message);
      return { error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, [loadComplaints]);

  /**
   * Get pending complaints count
   */
  const getPendingCount = useCallback(() => {
    return syncStats.pending;
  }, [syncStats]);

  /**
   * Get synced complaints count
   */
  const getSyncedCount = useCallback(() => {
    return syncStats.synced;
  }, [syncStats]);

  /**
   * Search complaints
   */
  const searchComplaints = useCallback((query) => {
    if (!query) return complaints;

    return complaints.filter(
      (c) =>
        c.description.toLowerCase().includes(query.toLowerCase()) ||
        c.address?.toLowerCase().includes(query.toLowerCase())
    );
  }, [complaints]);

  /**
   * Filter complaints by status
   */
  const filterByStatus = useCallback((status) => {
    return complaints.filter((c) => c.status === status);
  }, [complaints]);

  /**
   * Filter complaints by sync status
   */
  const filterBySyncStatus = useCallback((syncStatus) => {
    return complaints.filter((c) => c.sync_status === syncStatus);
  }, [complaints]);

  const value = {
    // State
    complaints,
    isOnline,
    syncStats,
    currentLocation,
    isSyncing,
    syncError,
    lastSyncTime,
    isInitialized,

    // Actions
    addComplaint,
    updateComplaintStatus,
    deleteComplaint,
    loadComplaints,
    triggerSync,
    forceSyncNow,
    retryFailedSyncs,
    getPendingCount,
    getSyncedCount,
    searchComplaints,
    filterByStatus,
    filterBySyncStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
