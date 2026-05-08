import { apiService } from './api';

export type RealtimeHazardEvent = {
  type: 'hazard.created' | 'hazard.updated' | 'hazard.deleted' | 'hazard.resolved' | 'hazard.ignored' | 'hazard.refresh';
  payload: any;
};

type Listener = (event: RealtimeHazardEvent) => void;

class RealtimeService {
  private socket: WebSocket | null = null;
  private listeners: Listener[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private lastHazardIds: string[] = [];
  private readonly wsUrl: string;

  constructor() {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://roadguard-backend-ympg.onrender.com';
    this.wsUrl = (process.env.EXPO_PUBLIC_WS_URL || backendUrl.replace(/^http/, 'ws')).replace(/\/$/, '');
  }

  connect() {
    if (this.socket || this.isConnected) return;
    try {
      this.socket = new WebSocket(`${this.wsUrl}/ws/hazards`);
      this.socket.onopen = () => {
        console.log('[RealtimeService] Connected to socket', this.wsUrl);
        this.isConnected = true;
        this.startPolling(false);
      };
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleSocketError.bind(this);
      this.socket.onclose = this.handleSocketClose.bind(this);
    } catch (error) {
      console.warn('[RealtimeService] WebSocket initialization failed, falling back to polling', error);
      this.socket = null;
      this.startPolling(true);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: Listener) {
    this.listeners = this.listeners.filter(item => item !== listener);
  }

  private emit(event: RealtimeHazardEvent) {
    this.listeners.forEach(listener => listener(event));
  }

  private handleMessage(message: any) {
    try {
      const data = JSON.parse(message.data as string);
      if (!data?.type) {
        this.emit({ type: 'hazard.refresh', payload: data });
        return;
      }
      const eventType = data.type as RealtimeHazardEvent['type'];
      if (eventType.startsWith('hazard')) {
        this.emit({ type: eventType, payload: data.payload ?? data });
      } else {
        this.emit({ type: 'hazard.refresh', payload: data.payload ?? data });
      }
    } catch (error) {
      console.warn('[RealtimeService] Invalid socket message', error);
    }
  }

  private async handleSocketError(error: any) {
    console.warn('[RealtimeService] Socket error', error?.message || error);
    this.scheduleReconnect();
  }

  private handleSocketClose() {
    console.log('[RealtimeService] Socket closed');
    this.isConnected = false;
    this.socket = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private startPolling(force = true) {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(async () => {
      try {
        const response = await apiService.getHazards();
        if (!response.success || !Array.isArray(response.data)) return;

        const ids = response.data.map((hazard: any) => hazard.id).sort();
        const changed = ids.length !== this.lastHazardIds.length || ids.some((id, index) => id !== this.lastHazardIds[index]);
        if (changed) {
          this.lastHazardIds = ids;
          this.emit({ type: 'hazard.refresh', payload: response.data });
        }
      } catch (error) {
        console.warn('[RealtimeService] Polling failed', error);
      }
    }, force ? 8000 : 15000);
  }
}

export const realtimeService = new RealtimeService();
