import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  priority?: 'default' | 'high' | 'low';
}

export interface HazardAlertData {
  hazardId: string;
  hazardType: number;
  latitude: number;
  longitude: number;
  confidence: number;
  distance: number;
}

class NotificationService {
  private initialized = false;
  private notificationToken: string | null = null;

  constructor() {
    this.setupNotificationHandler();
  }

  private async setupNotificationHandler() {
    // Skip notification setup on web platform
    if (Platform.OS === 'web') {
      return;
    }

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Handle notification responses
    Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      this.handleNotificationResponse(notification);
    });

    // Handle notifications received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    // Skip notification initialization on web platform
    if (Platform.OS === 'web') {
      this.initialized = true;
      return true;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Get push token
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('hazards', {
          name: 'Hazard Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF0000',
          sound: 'default',
        });
      }

      const token = await Notifications.getExpoPushTokenAsync();
      this.notificationToken = token.data;
      await this.saveTokenToStorage(token.data);

      // Register token with backend
      await this.registerTokenWithBackend(token.data);

      this.initialized = true;
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  private async saveTokenToStorage(token: string) {
    try {
      await AsyncStorage.setItem('notification_token', token);
    } catch (error) {
      console.error('Failed to save notification token:', error);
    }
  }

  private async registerTokenWithBackend(token: string) {
    try {
      // This would register the token with your backend
      // For now, we'll just log it
      console.log('Notification token registered:', token);
      // TODO: Implement backend endpoint for token registration
    } catch (error) {
      console.error('Failed to register token with backend:', error);
    }
  }

  async sendLocalNotification(data: NotificationData) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          sound: data.sound !== false,
          priority: data.priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH :
                   data.priority === 'low' ? Notifications.AndroidNotificationPriority.LOW :
                   Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  async sendHazardAlert(hazardData: HazardAlertData) {
    const hazardTypeText = hazardData.hazardType === 1 ? 'Speed Breaker' :
                          hazardData.hazardType === 2 ? 'Pothole' : 'Hazard';

    const title = `🚨 ${hazardTypeText} Detected!`;
    const body = `Hazard ${hazardData.distance.toFixed(1)}km away. Confidence: ${(hazardData.confidence * 100).toFixed(0)}%`;

    await this.sendLocalNotification({
      title,
      body,
      data: {
        type: 'hazard_alert',
        hazardId: hazardData.hazardId,
        hazardType: hazardData.hazardType,
        latitude: hazardData.latitude,
        longitude: hazardData.longitude,
        confidence: hazardData.confidence,
        distance: hazardData.distance,
      },
      sound: true,
      priority: 'high',
    });
  }

  async sendWeatherAlert(title: string, body: string, weatherData: any) {
    await this.sendLocalNotification({
      title: `🌤️ ${title}`,
      body,
      data: {
        type: 'weather_alert',
        ...weatherData,
      },
      sound: true,
      priority: 'default',
    });
  }

  async sendSafetyReminder(title: string, body: string) {
    await this.sendLocalNotification({
      title: `🛡️ ${title}`,
      body,
      data: {
        type: 'safety_reminder',
      },
      sound: false,
      priority: 'low',
    });
  }

  private handleNotificationResponse(notification: Notifications.Notification) {
    const { data } = notification.request.content;

    switch (data.type) {
      case 'hazard_alert':
        // Navigate to map with hazard location
        console.log('Navigate to hazard location:', data);
        break;
      case 'weather_alert':
        // Navigate to weather screen
        console.log('Navigate to weather screen');
        break;
      case 'safety_reminder':
        // Navigate to monitor screen
        console.log('Navigate to monitor screen');
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  async scheduleDailySafetyCheck() {
    // Cancel existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule daily safety reminder at 8 AM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛡️ Daily Safety Check',
        body: 'Start your journey safely! Check RoadGuard-AI for hazards on your route.',
        data: { type: 'safety_reminder' },
        sound: false,
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
      },
    });
  }

  async getBadgeCount(): Promise<number> {
    const badge = await Notifications.getBadgeCountAsync();
    return badge;
  }

  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }

  getToken(): string | null {
    return this.notificationToken;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const notificationService = new NotificationService();