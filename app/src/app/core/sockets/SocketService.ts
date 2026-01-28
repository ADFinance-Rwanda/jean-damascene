import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

export interface Notification {
  id: number;
  title?: string;
  message: string;
  read?: boolean;
  is_read?: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket?: Socket;
  private readonly SERVER_URL = 'http://localhost:5000';

  connected = signal(false);

  // 🔔 Notifications
  notifications = signal<Notification[]>([]);

  // 🔢 Unread counter
  unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  private auth = inject(AuthService);

  // Auto-connect when token changes
  private authEffect = effect(() => {
    const token = this.auth.token();
    if (token) this.connect(token);
    else this.disconnect();
  });

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(this.SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      console.log('🟢 Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
      console.log('🔴 Socket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    // ============================
    // 🔔 Notification listeners
    // ============================

    // Initial load (from backend on connect)
    this.socket.on('notification:init', (rows: Notification[]) => {
      this.notifications.set(rows.map((r) => ({ ...r, read: r.is_read })));
    });

    // Realtime new notification
    this.socket.on('notification:new', (notification: Notification) => {
      this.notifications.update((list) => [
        { ...notification, read: notification.is_read },
        ...list,
      ]);
    });

    // Optional: mark as read sync
    this.socket.on('notification:read', (id: number) => {
      this.notifications.update((list) =>
        list.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
    this.connected.set(false);
    this.notifications.set([]);
  }

  // Listen to any custom event
  onEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>((observer) => {
      if (!this.socket) return;
      const handler = (data: T) => observer.next(data);
      this.socket.on(eventName, handler);
      return () => this.socket?.off(eventName, handler);
    });
  }

  // Emit any event
  emitEvent(eventName: string, data: any) {
    this.socket?.emit(eventName, data);
  }

  // 🔔 Mark notification as read
  // 🔔 Bulk mark as read
  markAllAsRead() {
    const unreadIds = this.notifications()
      .filter((n) => !n.read)
      .map((n) => n.id);
    if (!unreadIds.length) return;

    this.socket?.emit('notification:read', unreadIds);

    // Optimistic UI update
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  // 🔔 Clear all locally (optional helper)
  clearNotifications() {
    this.notifications.set([]);
  }
}
