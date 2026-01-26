import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { User } from '../models/user.model';
import { firstValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { UserListResponse, UserSingleResponse } from '../models/user-response.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  /* ---------- GET ALL ---------- */
  async getUsers(): Promise<User[]> {
    try {
      const response = await firstValueFrom(
        this.api.get<UserListResponse>('users').pipe(
          catchError((error: HttpErrorResponse) => {
            return this.handleHttpError(error);
          }),
        ),
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /* ---------- GET ONE ---------- */
  async getUserById(id: number): Promise<User> {
    try {
      const response = await firstValueFrom(
        this.api.get<UserSingleResponse>(`users/${id}`).pipe(
          catchError((error: HttpErrorResponse) => {
            return this.handleHttpError(error);
          }),
        ),
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /* ---------- CREATE ---------- */
  async createUser(data: {
    name: string;
    email: string;
    role: string;
    password: string;
  }): Promise<User> {
    try {
      const response = await firstValueFrom(
        this.api.post<UserSingleResponse>('users', data).pipe(
          catchError((error: HttpErrorResponse) => {
            return this.handleHttpError(error);
          }),
        ),
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /* ---------- UPDATE ---------- */
  async updateUser(id: number, data: { name: string; email: string; role: string }): Promise<User> {
    try {
      const response = await firstValueFrom(
        this.api.put<UserSingleResponse>(`users/${id}`, data).pipe(
          catchError((error: HttpErrorResponse) => {
            return this.handleHttpError(error);
          }),
        ),
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  /* ---------- DELETE ---------- */
  async deleteUser(id: number): Promise<void> {
    try {
      await firstValueFrom(
        this.api.delete(`users/${id}`).pipe(
          catchError((error: HttpErrorResponse) => {
            return this.handleHttpError(error);
          }),
        ),
      );
    } catch (error: any) {
      throw error;
    }
  }

  private handleHttpError(error: HttpErrorResponse) {
    // Extract the error message from the server response
    const serverMessage =
      error.error?.message ||
      error.error?.error?.message ||
      error.message ||
      `HTTP Error ${error.status}`;

    // Throw a new error with the server message
    return throwError(() => new Error(serverMessage));
  }
}
