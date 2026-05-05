import NetInfo from '@react-native-community/netinfo';

class NetworkService {
  constructor() {
    this.isOnline = true;
    this.netInfoUnsubscribe = null;
    this.stateChangeCallbacks = [];
  }

  /**
   * Initialize network monitoring
   */
  initNetworkMonitoring() {
    try {
      this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected && state.isInternetReachable;

        console.log('Network state changed:', {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
        });

        // Notify subscribers
        this.stateChangeCallbacks.forEach((callback) => {
          callback({
            isOnline: this.isOnline,
            wasOnline,
            type: state.type,
            details: state.details,
          });
        });
      });

      console.log('Network monitoring initialized');
    } catch (error) {
      console.error('Error initializing network monitoring:', error);
    }
  }

  /**
   * Subscribe to network state changes
   */
  onNetworkStateChange(callback) {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Unsubscribe from network state changes
   */
  offNetworkStateChange(callback) {
    this.stateChangeCallbacks = this.stateChangeCallbacks.filter(
      (cb) => cb !== callback
    );
  }

  /**
   * Get current network state
   */
  async getNetworkState() {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected && state.isInternetReachable;

      return {
        isOnline: this.isOnline,
        type: state.type,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        details: state.details,
      };
    } catch (error) {
      console.error('Error fetching network state:', error);
      return {
        isOnline: false,
        type: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Check if currently online
   */
  isNetworkAvailable() {
    return this.isOnline;
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
      console.log('Network monitoring stopped');
    }
  }
}

// Singleton instance
const networkService = new NetworkService();

export default networkService;
