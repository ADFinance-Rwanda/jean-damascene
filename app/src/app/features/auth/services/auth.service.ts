import { Injectable, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { SocketService } from '../../../core/sockets/SocketService';

export interface User {
  id: number;
  name: string;
  email: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'token';

  user = signal<User | null>(null);
  token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  initialized = signal(false);

  isAuthenticated = computed(() => !!this.token());

  constructor(private api: ApiService) {}

  async restoreSession() {
    const token = this.token();

    if (!token) {
      this.initialized.set(true);
      return;
    }

    try {
      const user = await firstValueFrom(this.api.get<User>('users/me'));
      this.user.set(user);
    } catch {
      this.logout();
    } finally {
      this.initialized.set(true);
    }
  }

  async login(email: string, password: string) {
    const res = await firstValueFrom(
      this.api.post<LoginResponse>('users/login', { email, password }),
    );
    this.setSession(res.data.user, res.data.token);
  }

  logout() {
    this.user.set(null);
    this.token.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
  }

  private setSession(user: User, token: string) {
    this.user.set(user);
    this.token.set(token);
    localStorage.setItem(this.TOKEN_KEY, token);
  }
}
