import { Vibration } from 'react-native';
import axios from 'axios';
import database from './database';
import RNFS from 'react-native-fs';

const DEFAULT_API_BASE_URL = 'http://10.0.2.2:8002/api';

const vibrateOnSyncSuccess = () => {
  try {
    Vibration.vibrate(50);
  } catch (error) {
    console.warn('Vibration not available:', error);
  }
};

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.syncIntervalTime = 30000; // 30 seconds
    this.isOnline = true;
    this.apiBaseUrl = DEFAULT_API_BASE_URL;
  }

  /**
   * Get configured API base URL.
   */
  getApiBaseUrl() {
    return this.apiBaseUrl || DEFAULT_API_BASE_URL;
  }

  /**
   * Set API base URL
   */
  setApiBaseUrl(url) {
    if (!url || typeof url !== 'string') {
      return;
    }

    const normalized = url.trim().replace(/\/$/, '');
    this.apiBaseUrl = normalized;
  }

  /**
   * Check if user is online
   */
  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
    console.log('Online status:', isOnline);
  }

  /**
   * Sync pending complaints
   */
  async syncPendingComplaints() {
    if (this.isSyncing || !this.isOnline) {
      console.log('Sync skipped - isSyncing:', this.isSyncing, 'isOnline:', this.isOnline);
      return;
    }

    try {
      this.isSyncing = true;
      console.log('Starting sync...');

      const pendingComplaints = await database.getPendingComplaints();
      console.log('Found pending complaints:', pendingComplaints.length);

      for (const complaint of pendingComplaints) {
        await this.syncComplaint(complaint);
      }

      console.log('Sync completed');
      return { success: true, synced: pendingComplaints.length };
    } catch (error) {
      console.error('Sync error:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single complaint
   */
  async syncComplaint(complaint) {
    try {
      console.log('Syncing complaint:', complaint.id);

      const complaintData = {
        user_id: complaint.user_id,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        address: complaint.address,
        description: complaint.description,
      };

      // Get images if any
      if (complaint.image) {
        try {
          // If image is base64, use it directly
          if (complaint.image.startsWith('data:image')) {
            complaintData.image = complaint.image;
          } else {
            // Try to read image file
            const base64 = await RNFS.readFile(complaint.image, 'base64');
            complaintData.image = `data:image/jpeg;base64,${base64}`;
          }
        } catch (error) {
          console.warn('Could not read image:', error);
          complaintData.image = null;
        }
      }

      // Send to backend
      const baseUrl = this.getApiBaseUrl();
      const response = await axios.post(
        `${baseUrl}/admin/complaints`,
        complaintData,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        // Mark as synced
        const serverId = response.data._id || response.data.id;
        await database.markAsSynced(complaint.id, serverId);

        // Add to sync history
        await database.addToSyncHistory(
          complaint.id,
          'SYNC',
          'success',
          response.data
        );

        vibrateOnSyncSuccess();
        console.log('Complaint synced successfully:', complaint.id);
        return { success: true, serverId };
      }
    } catch (error) {
      console.error('Error syncing complaint:', complaint.id, error);

      // Add to sync history
      await database.addToSyncHistory(
        complaint.id,
        'SYNC',
        'failed',
        { error: error.message }
      );

      // Increment retry count
      const syncQueueItem = await database.getSyncQueue();
      const item = syncQueueItem.find((i) => i.complaint_id === complaint.id);
      if (item) {
        const retryCount = (item.retry_count || 0) + 1;
        await database.updateSyncQueueItem(item.id, 'pending', retryCount);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Sync with retry queue
   */
  async syncWithRetry() {
    try {
      const syncQueue = await database.getSyncQueue();
      console.log('Processing sync queue:', syncQueue.length);

      for (const item of syncQueue) {
        try {
          const complaint = await database.getComplaintById(item.complaint_id);
          if (complaint) {
            const result = await this.syncComplaint(complaint);
            if (result.success) {
              await database.updateSyncQueueItem(item.id, 'synced');
            }
          }
        } catch (error) {
          console.error('Error processing sync queue item:', error);
        }
      }
    } catch (error) {
      console.error('Sync with retry error:', error);
    }
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(intervalTime = null) {
    if (intervalTime) {
      this.syncIntervalTime = intervalTime;
    }

    if (!this.syncInterval && this.isOnline) {
      console.log('Starting periodic sync with interval:', this.syncIntervalTime);
      this.syncInterval = setInterval(() => {
        if (this.isOnline) {
          this.syncPendingComplaints();
          this.syncWithRetry();
        }
      }, this.syncIntervalTime);
    }
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Periodic sync stopped');
    }
  }

  /**
   * Get sync stats
   */
  async getSyncStats() {
    try {
      const all = await database.getAllComplaints();
      const pending = await database.getPendingComplaints();
      const synced = await database.getSyncedComplaints();

      return {
        total: all.length,
        pending: pending.length,
        synced: synced.length,
        pendingPercentage: all.length > 0 ? ((pending.length / all.length) * 100).toFixed(1) : 0,
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        total: 0,
        pending: 0,
        synced: 0,
        pendingPercentage: 0,
      };
    }
  }

  /**
   * Retry failed syncs
   */
  async retryFailedSyncs() {
    try {
      console.log('Retrying failed syncs...');
      const pending = await database.getPendingComplaints();
      
      let retryCount = 0;
      for (const complaint of pending) {
        const result = await this.syncComplaint(complaint);
        if (result.success) {
          retryCount++;
        }
      }

      console.log('Retried:', retryCount);
      return { retried: retryCount };
    } catch (error) {
      console.error('Error retrying failed syncs:', error);
      return { retried: 0, error: error.message };
    }
  }

  /**
   * Force immediate sync
   */
  async forceSyncNow() {
    console.log('Force sync triggered');
    return this.syncPendingComplaints();
  }
}

// Singleton instance
const syncService = new SyncService();

export default syncService;
