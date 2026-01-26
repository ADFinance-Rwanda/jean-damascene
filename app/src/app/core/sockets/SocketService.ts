import { Injectable, signal, effect, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket?: Socket;
  private readonly SERVER_URL = 'http://localhost:5000';

  connected = signal(false);
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
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      console.log('🟢 Socket connected');
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
      console.log('🔴 Socket disconnected');
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;
    this.connected.set(false);
  }

  // Listen to any event
  onEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>((observer) => {
      if (!this.socket) return;
      const handler = (data: T) => observer.next(data);
      this.socket.on(eventName, handler);
      return () => this.socket?.off(eventName, handler);
    });
  }

  // Emit any event (mainly for testing)
  emitEvent(eventName: string, data: any) {
    this.socket?.emit(eventName, data);
  }
}
