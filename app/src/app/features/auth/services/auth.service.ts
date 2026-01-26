import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

interface MeResponse {
  success: boolean;
  data: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'token';

  user = signal<User | null>(null);
  token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  initialized = signal(false);

  isAuthenticated = computed(() => !!this.token());

  // 👇 role helpers
  isAdmin = computed(() => this.user()?.role === 'ADMIN');
  isUser = computed(() => this.user()?.role === 'USER');

  constructor(private api: ApiService) {}

  async restoreSession() {
    const token = this.token();

    if (!token) {
      this.initialized.set(true);
      return;
    }

    try {
      const res = await firstValueFrom(this.api.get<MeResponse>('users/me'));
      this.user.set(res.data);
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

    this.setSession(res.data.token);

    await this.restoreSession();
  }

  logout() {
    this.user.set(null);
    this.token.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
  }

  private setSession(token: string) {
    this.token.set(token);
    localStorage.setItem(this.TOKEN_KEY, token);
  }
}
