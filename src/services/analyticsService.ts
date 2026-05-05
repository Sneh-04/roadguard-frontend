import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface CrashReport {
  error: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userId?: string;
  deviceInfo?: Record<string, any>;
  appVersion: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private maxEvents = 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private async initialize() {
    // Load user ID from storage
    this.userId = await AsyncStorage.getItem('userId') || undefined;

    // Load any pending events
    await this.loadPendingEvents();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
    AsyncStorage.setItem('userId', userId);
  }

  trackEvent(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.events.push(analyticsEvent);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Save to storage
    this.saveEvent(analyticsEvent);

    // In production, send to analytics service
    console.log('Analytics Event:', analyticsEvent);
  }

  trackScreenView(screenName: string, properties?: Record<string, any>) {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  trackUserAction(action: string, properties?: Record<string, any>) {
    this.trackEvent('user_action', {
      action,
      ...properties,
    });
  }

  trackError(error: string, properties?: Record<string, any>) {
    this.trackEvent('error', {
      error_message: error,
      ...properties,
    });
  }

  trackPerformance(metric: PerformanceMetric) {
    this.trackEvent('performance', {
      metric_name: metric.name,
      metric_value: metric.value,
      metadata: metric.metadata,
    });
  }

  private async saveEvent(event: AnalyticsEvent) {
    try {
      const key = `analytics_event_${event.timestamp}`;
      await AsyncStorage.setItem(key, JSON.stringify(event));
    } catch (error) {
      console.error('Failed to save analytics event:', error);
    }
  }

  private async loadPendingEvents() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter(key => key.startsWith('analytics_event_'));

      for (const key of eventKeys) {
        const eventData = await AsyncStorage.getItem(key);
        if (eventData) {
          const event = JSON.parse(eventData);
          this.events.push(event);
        }
      }
    } catch (error) {
      console.error('Failed to load pending events:', error);
    }
  }

  async flushEvents(): Promise<number> {
    if (this.events.length === 0) return 0;

    try {
      // In production, this would send events to your analytics backend
      console.log(`Flushing ${this.events.length} analytics events`);

      // Clear stored events
      const keys = await AsyncStorage.getAllKeys();
      const eventKeys = keys.filter(key => key.startsWith('analytics_event_'));

      for (const key of eventKeys) {
        await AsyncStorage.removeItem(key);
      }

      const flushedCount = this.events.length;
      this.events = [];

      return flushedCount;
    } catch (error) {
      console.error('Failed to flush events:', error);
      return 0;
    }
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getEventCount(): number {
    return this.events.length;
  }
}

class CrashReportingService {
  private static instance: CrashReportingService;

  constructor() {}

  static getInstance(): CrashReportingService {
    if (!CrashReportingService.instance) {
      CrashReportingService.instance = new CrashReportingService();
    }
    return CrashReportingService.instance;
  }

  reportCrash(error: Error, componentStack?: string) {
    const crashReport: CrashReport = {
      error: error.message,
      stack: error.stack,
      componentStack,
      timestamp: Date.now(),
      appVersion: '1.0.0', // In production, get from package.json or native code
      deviceInfo: this.getDeviceInfo(),
    };

    // Save crash report locally
    this.saveCrashReport(crashReport);

    // In production, send to crash reporting service
    console.error('Crash Report:', crashReport);
  }

  private getDeviceInfo() {
    // In production, this would collect actual device info
    return {
      platform: 'iOS', // or Android
      version: '16.0', // OS version
      device: 'iPhone', // device model
    };
  }

  private async saveCrashReport(report: CrashReport) {
    try {
      const key = `crash_report_${report.timestamp}`;
      await AsyncStorage.setItem(key, JSON.stringify(report));
    } catch (error) {
      console.error('Failed to save crash report:', error);
    }
  }

  async getCrashReports(): Promise<CrashReport[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const crashKeys = keys.filter(key => key.startsWith('crash_report_'));

      const reports: CrashReport[] = [];
      for (const key of crashKeys) {
        const reportData = await AsyncStorage.getItem(key);
        if (reportData) {
          reports.push(JSON.parse(reportData));
        }
      }

      return reports;
    } catch (error) {
      console.error('Failed to get crash reports:', error);
      return [];
    }
  }

  async clearCrashReports() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const crashKeys = keys.filter(key => key.startsWith('crash_report_'));

      for (const key of crashKeys) {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Failed to clear crash reports:', error);
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();
export const crashReportingService = CrashReportingService.getInstance();