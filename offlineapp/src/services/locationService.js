import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentLocation = null;
    this.locationCallbacks = [];
  }

  /**
   * Request location permissions
   */
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED
        );
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          this.currentLocation = { latitude, longitude, accuracy };
          resolve(this.currentLocation);
        },
        (error) => {
          console.error('Error getting current location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Watch location updates
   */
  watchLocation(onLocationChange) {
    try {
      if (this.watchId !== null) {
        this.stopWatchingLocation();
      }

      this.watchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          this.currentLocation = { latitude, longitude, accuracy };

          // Notify all subscribers
          this.locationCallbacks.forEach((callback) => {
            callback(this.currentLocation);
          });

          if (onLocationChange) {
            onLocationChange(this.currentLocation);
          }
        },
        (error) => {
          console.error('Error watching location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000,
          distanceFilter: 10, // Only update if moved 10 meters
        }
      );

      console.log('Location watch started');
      return this.watchId;
    } catch (error) {
      console.error('Error starting location watch:', error);
      throw error;
    }
  }

  /**
   * Subscribe to location updates
   */
  subscribe(callback) {
    this.locationCallbacks.push(callback);
    if (this.currentLocation) {
      callback(this.currentLocation);
    }
  }

  /**
   * Unsubscribe from location updates
   */
  unsubscribe(callback) {
    this.locationCallbacks = this.locationCallbacks.filter(
      (cb) => cb !== callback
    );
  }

  /**
   * Stop watching location
   */
  stopWatchingLocation() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('Location watch stopped');
    }
  }

  /**
   * Get latitude and longitude for address
   */
  async geocodeAddress(latitude, longitude) {
    try {
      // This would require a geocoding service
      // For now, return a simple address format
      const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      return address;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Get current location as promise
   */
  getCurrentLocationPromise() {
    return new Promise((resolve, reject) => {
      if (this.currentLocation) {
        resolve(this.currentLocation);
      } else {
        this.getCurrentLocation()
          .then(resolve)
          .catch(reject);
      }
    });
  }
}

// Singleton instance
const locationService = new LocationService();

export default locationService;
